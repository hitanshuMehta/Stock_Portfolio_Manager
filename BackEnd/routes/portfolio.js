import express from 'express';
import axios from 'axios';
import Portfolio from '../models/Portfolio.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Store progress data in memory (use Redis in production)
const progressStore = new Map();

// Market hours configuration (IST)
const MARKET_HOURS = {
  openHour: 9,
  openMinute: 0,
  closeHour: 16,
  closMinute: 0,
  timezone: 'Asia/Kolkata'
};

// API rate limiting configuration
const API_CONFIG = {
  maxCallsPerMinute: 50,
  delayBetweenCalls: 1200,
  batchSize: 10
};

// Helper functions
const isWithinMarketHours = (date = new Date()) => {
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: MARKET_HOURS.timezone }));
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const day = istDate.getDay();
  
  if (day === 0 || day === 6) return false;
  
  const currentTime = hours * 60 + minutes;
  const openTime = MARKET_HOURS.openHour * 60 + MARKET_HOURS.openMinute;
  const closeTime = MARKET_HOURS.closeHour * 60 + MARKET_HOURS.closMinute;
  
  return currentTime >= openTime && currentTime <= closeTime;
};

const isPriceFetchedAfterMarketClose = (priceFetchedAt) => {
  if (!priceFetchedAt) return false;
  
  const fetchDate = new Date(priceFetchedAt);
  const istFetchDate = new Date(fetchDate.toLocaleString('en-US', { timeZone: MARKET_HOURS.timezone }));
  const now = new Date();
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: MARKET_HOURS.timezone }));
  
  // Check if fetch was on the same day
  const isSameDay = istFetchDate.toDateString() === istNow.toDateString();
  if (!isSameDay) return false;
  
  const fetchHours = istFetchDate.getHours();
  const fetchMinutes = istFetchDate.getMinutes();
  const fetchTime = fetchHours * 60 + fetchMinutes;
  const closeTime = MARKET_HOURS.closeHour * 60 + MARKET_HOURS.closMinute;
  
  // Return true only if fetched AFTER market close (not AT close time)
  return fetchTime > closeTime;
};

const needsPriceUpdate = (stock) => {
  if (!stock.cmpRate || !stock.priceFetchedAt) {
    return { needsUpdate: true, reason: 'No price data available' };
  }
  
  const fetchDate = new Date(stock.priceFetchedAt);
  const istFetchDate = new Date(fetchDate.toLocaleString('en-US', { timeZone: MARKET_HOURS.timezone }));
  const now = new Date();
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: MARKET_HOURS.timezone }));
  
  const isSameDay = istFetchDate.toDateString() === istNow.toDateString();
  
  // If price was fetched today after market close, no update needed
  if (isSameDay && isPriceFetchedAfterMarketClose(stock.priceFetchedAt)) {
    return { needsUpdate: false, reason: 'Price already updated after market close today' };
  }
  
  // If market is currently open, always update
  if (isWithinMarketHours()) {
    return { needsUpdate: true, reason: 'Market is open' };
  }
  
  // Market is closed now
  const nowHours = istNow.getHours();
  const nowMinutes = istNow.getMinutes();
  const nowTime = nowHours * 60 + nowMinutes;
  const closeTime = MARKET_HOURS.closeHour * 60 + MARKET_HOURS.closMinute;
  
  // If market closed today and we haven't fetched after close yet, update
  if (nowTime > closeTime) {
    if (isSameDay) {
      const fetchHours = istFetchDate.getHours();
      const fetchMinutes = istFetchDate.getMinutes();
      const fetchTime = fetchHours * 60 + fetchMinutes;
      
      // If last fetch was before market close today, we need update
      if (fetchTime <= closeTime) {
        return { needsUpdate: true, reason: 'Market closed, need post-close update' };
      }
    } else {
      // Price is from a previous day
      return { needsUpdate: true, reason: 'Price data is from previous day' };
    }
  }
  
  // Before market opens and we have today's closing price from yesterday
  if (!isSameDay) {
    return { needsUpdate: false, reason: 'Have previous day closing price, market not open yet' };
  }
  
  return { needsUpdate: false, reason: 'Already have latest price' };
};

const recalculateStockMetrics = (stock, currentDate) => {
  if (!stock.cmpRate) return;

  const cmpAmount = stock.cmpRate * stock.quantity;
  const profitLoss = cmpAmount - stock.purchaseAmount;
  const daysHeld = Math.floor((currentDate - stock.purchaseDate) / (1000 * 60 * 60 * 24));
  const taxSlab = daysHeld >= 366 ? 'Long Term' : 'Short Term';
  const taxRate = taxSlab === 'Long Term' ? 0.125 : 0.20;
  const taxAmount = Math.max(profitLoss, 0) * taxRate;

  stock.cmpDate = currentDate;
  stock.cmpAmount = cmpAmount;
  stock.profitLoss = profitLoss;
  stock.daysHeld = daysHeld;
  stock.taxSlab = taxSlab;
  stock.taxAmount = taxAmount;
};

const fetchFromFinnhub = async (symbol) => {
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (!finnhubKey) {
    throw new Error('Finnhub API key not configured');
  }

  let finnhubSymbol = symbol;
  if (!symbol.includes('.')) {
    finnhubSymbol = `${symbol}.NS`;
  } else if (symbol.includes('.BSE')) {
    finnhubSymbol = symbol.replace('.BSE', '.BO');
  } else if (symbol.includes('.NSE')) {
    finnhubSymbol = symbol.replace('.NSE', '.NS');
  }

  console.log(`[Finnhub] Fetching price for ${symbol} (${finnhubSymbol})`);
  
  const response = await axios.get('https://finnhub.io/api/v1/quote', {
    params: {
      symbol: finnhubSymbol,
      token: finnhubKey
    },
    timeout: 10000
  });

  if (!response.data || !response.data.c || response.data.c === 0) {
    throw new Error('No price data available from Finnhub');
  }

  console.log(`[Finnhub] ✓ Successfully fetched ${symbol}: ₹${response.data.c}`);

  return {
    date: new Date(),
    price: response.data.c,
    source: 'Finnhub'
  };
};

const fetchFromYahooFinance = async (symbol) => {
  let yahooSymbol = symbol;
  if (symbol.includes('.BSE')) {
    yahooSymbol = symbol.replace('.BSE', '.BO');
  } else if (symbol.includes('.NSE')) {
    yahooSymbol = symbol.replace('.NSE', '.NS');
  } else if (!symbol.includes('.')) {
    yahooSymbol = `${symbol}.NS`;
  }

  console.log(`[Yahoo Finance] Fetching price for ${symbol} (${yahooSymbol})`);

  const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!response.data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
    throw new Error('No price data available from Yahoo Finance');
  }

  const result = response.data.chart.result[0];
  const price = result.meta.regularMarketPrice;

  console.log(`[Yahoo Finance] ✓ Successfully fetched ${symbol}: ₹${price}`);

  return {
    date: new Date(),
    price: price,
    source: 'Yahoo Finance'
  };
};

const fetchFromAlphaVantage = async (symbol, apiKey, baseUrl) => {
  let formattedSymbol = symbol;
  if (symbol.includes('.NSE')) {
    formattedSymbol = symbol.replace('.NSE', '.BSE');
  } else if (!symbol.includes('.BSE') && !symbol.includes('.')) {
    formattedSymbol = `${symbol}.BSE`;
  }

  console.log(`[Alpha Vantage] Fetching price for ${symbol} (${formattedSymbol})`);

  const response = await axios.get(baseUrl, {
    params: {
      function: 'TIME_SERIES_DAILY',
      symbol: formattedSymbol,
      outputsize: 'compact',
      apikey: apiKey
    },
    timeout: 15000
  });

  const data = response.data;
  
  if (data['Error Message']) {
    throw new Error(`Alpha Vantage Error: ${data['Error Message']}`);
  }

  if (data['Note'] && data['Note'].includes('call frequency')) {
    throw new Error('API rate limit exceeded');
  }

  const timeSeries = data['Time Series (Daily)'];
  if (!timeSeries || Object.keys(timeSeries).length === 0) {
    throw new Error('No price data available from Alpha Vantage');
  }

  const dates = Object.keys(timeSeries).sort((a, b) => new Date(b) - new Date(a));
  const latestDate = dates[0];
  const latestData = timeSeries[latestDate];

  if (!latestData || !latestData['4. close']) {
    throw new Error('No recent price data available from Alpha Vantage');
  }

  const price = parseFloat(latestData['4. close']);
  console.log(`[Alpha Vantage] ✓ Successfully fetched ${symbol}: ₹${price}`);

  return {
    date: new Date(),
    price: price,
    source: 'Alpha Vantage'
  };
};

const fetchStockPrice = async (symbol, apiKey, baseUrl) => {
  const errors = [];
  
  try {
    return await fetchFromFinnhub(symbol);
  } catch (error) {
    errors.push(`Finnhub: ${error.message}`);
  }

  try {
    return await fetchFromYahooFinance(symbol);
  } catch (error) {
    errors.push(`Yahoo Finance: ${error.message}`);
  }

  if (apiKey && baseUrl) {
    try {
      return await fetchFromAlphaVantage(symbol, apiKey, baseUrl);
    } catch (error) {
      errors.push(`Alpha Vantage: ${error.message}`);
    }
  }

  throw new Error(`All APIs failed. ${errors.join(', ')}`);
};

// Get progress status endpoint
router.get('/:id/fetch-prices/progress', async (req, res) => {
  try {
    const progressKey = `${req.user.userId}-${req.params.id}`;
    const progress = progressStore.get(progressKey);
    
    if (!progress) {
      return res.json({
        status: 'idle',
        message: 'No active price fetch operation'
      });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Fetch prices with progress tracking
router.post('/:id/fetch-prices', async (req, res) => {
  const progressKey = `${req.user.userId}-${req.params.id}`;
  
  try {
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const apiKey = process.env.STOCK_API_KEY;
    const baseUrl = process.env.STOCK_API_BASE_URL;
    const currentDate = new Date();

    // Categorize stocks
    const stocksNeedingUpdate = [];
    const stocksUsingCache = [];

    for (const stock of portfolio.stocks) {
      const { needsUpdate, reason } = needsPriceUpdate(stock);
      
      if (needsUpdate) {
        stocksNeedingUpdate.push({ stock, reason });
      } else {
        stocksUsingCache.push({ stock, reason });
        recalculateStockMetrics(stock, currentDate);
      }
    }

    // Initialize progress
    const totalStocks = stocksNeedingUpdate.length;
    progressStore.set(progressKey, {
      status: 'processing',
      total: totalStocks,
      completed: 0,
      cached: stocksUsingCache.length,
      current: null,
      errors: [],
      startTime: Date.now()
    });

    // Send immediate response to avoid timeout
    res.json({
      message: 'Price fetch started',
      progressKey,
      total: totalStocks,
      cached: stocksUsingCache.length
    });

    // Process stocks asynchronously
    const updatedStocks = [];
    const errors = [];

    for (const [index, { stock, reason }] of stocksNeedingUpdate.entries()) {
      try {
        // Update progress
        progressStore.set(progressKey, {
          status: 'processing',
          total: totalStocks,
          completed: index,
          cached: stocksUsingCache.length,
          current: stock.symbol,
          errors: errors,
          startTime: progressStore.get(progressKey).startTime
        });

        const priceData = await fetchStockPrice(stock.symbol, apiKey, baseUrl);
        
        stock.cmpRate = priceData.price;
        stock.priceFetchedAt = priceData.date;
        recalculateStockMetrics(stock, currentDate);

        updatedStocks.push({
          symbol: stock.symbol,
          price: priceData.price,
          date: priceData.date,
          source: priceData.source
        });

        if (index < stocksNeedingUpdate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, API_CONFIG.delayBetweenCalls));
        }

      } catch (error) {
        const errorMessage = `${stock.symbol}: ${error.message}`;
        errors.push(errorMessage);
      }
    }

    // Save portfolio
    portfolio.lastCmpUpdate = currentDate;
    await portfolio.save();

    // Fetch fresh portfolio data
    const updatedPortfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId
    });

    // Update progress to completed
    progressStore.set(progressKey, {
      status: 'completed',
      total: totalStocks,
      completed: totalStocks,
      cached: stocksUsingCache.length,
      current: null,
      errors: errors,
      portfolio: updatedPortfolio,
      startTime: progressStore.get(progressKey).startTime,
      endTime: Date.now()
    });

    // Clean up after 1 minute
    setTimeout(() => {
      progressStore.delete(progressKey);
    }, 60000);

  } catch (error) {
    console.error('Error in fetch-prices route:', error);
    
    progressStore.set(progressKey, {
      status: 'error',
      error: error.message,
      startTime: progressStore.get(progressKey)?.startTime || Date.now()
    });

    setTimeout(() => {
      progressStore.delete(progressKey);
    }, 60000);
  }
});

// Get all portfolios for the authenticated user
router.get('/', async (req, res) => {
  try {
    const portfolios = await Portfolio.find({ userId: req.user.userId });
    res.json(portfolios);
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    res.status(500).json({ error: 'Failed to fetch portfolios' });
  }
});

// Create new portfolio
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Portfolio name required' });
    }

    const existingPortfolio = await Portfolio.findOne({ 
      userId: req.user.userId,
      name: name.trim()
    });

    if (existingPortfolio) {
      return res.status(409).json({ error: 'Portfolio with this name already exists' });
    }

    const portfolio = new Portfolio({
      userId: req.user.userId,
      username: req.user.username,
      name: name.trim(),
      description: description?.trim() || '',
      stocks: []
    });

    await portfolio.save();
    res.status(201).json(portfolio);
  } catch (error) {
    console.error('Error creating portfolio:', error);
    res.status(500).json({ error: 'Failed to create portfolio' });
  }
});

// Get single portfolio
router.get('/:id', async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json(portfolio);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// Update portfolio
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Portfolio name required' });
    }

    const portfolio = await Portfolio.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { 
        name: name.trim(), 
        description: description?.trim() || '' 
      },
      { new: true }
    );

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json(portfolio);
  } catch (error) {
    console.error('Error updating portfolio:', error);
    res.status(500).json({ error: 'Failed to update portfolio' });
  }
});

// Delete portfolio
router.delete('/:id', async (req, res) => {
  try {
    const portfolio = await Portfolio.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.userId
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json({ message: 'Portfolio deleted successfully' });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    res.status(500).json({ error: 'Failed to delete portfolio' });
  }
});

// Add stock to portfolio
router.post('/:id/stocks', async (req, res) => {
  try {
    const { symbol, shortName, fullName, ineIsin, purchaseDate, quantity, purchaseAmount } = req.body;

    if (!symbol || !fullName || !ineIsin || !purchaseDate || !quantity || !purchaseAmount) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const stockEntry = {
      symbol: symbol.toUpperCase(),
      shortName: shortName?.trim() || '',
      fullName: fullName.trim(),
      ineIsin: ineIsin.trim(),
      purchaseDate: new Date(purchaseDate),
      quantity: Number(quantity),
      purchaseAmount: Number(purchaseAmount)
    };

    portfolio.stocks.push(stockEntry);
    await portfolio.save();

    res.status(201).json(portfolio);
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// Update stock
router.put('/:id/stocks/:stockId', async (req, res) => {
  try {
    const { symbol, shortName, fullName, ineIsin, purchaseDate, quantity, purchaseAmount } = req.body;

    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const stock = portfolio.stocks.id(req.params.stockId);
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    if (symbol) stock.symbol = symbol.toUpperCase();
    if (shortName !== undefined) stock.shortName = shortName.trim();
    if (fullName) stock.fullName = fullName.trim();
    if (ineIsin) stock.ineIsin = ineIsin.trim();
    if (purchaseDate) stock.purchaseDate = new Date(purchaseDate);
    if (quantity !== undefined) stock.quantity = Number(quantity);
    if (purchaseAmount !== undefined) stock.purchaseAmount = Number(purchaseAmount);

    stock.cmpDate = undefined;
    stock.cmpRate = undefined;
    stock.cmpAmount = undefined;
    stock.profitLoss = undefined;
    stock.daysHeld = undefined;
    stock.taxSlab = undefined;
    stock.taxAmount = undefined;
    stock.priceFetchedAt = undefined;

    await portfolio.save();
    res.json(portfolio);
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Delete stock
router.delete('/:id/stocks/:stockId', async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    portfolio.stocks.id(req.params.stockId).deleteOne();
    await portfolio.save();

    res.json(portfolio);
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({ error: 'Failed to delete stock' });
  }
});

// Test price fetch for a specific symbol
router.get('/:id/test-price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const apiKey = process.env.STOCK_API_KEY;
    const baseUrl = process.env.STOCK_API_BASE_URL;
    
    const priceData = await fetchStockPrice(symbol, apiKey, baseUrl);
    
    res.json({
      symbol,
      priceData,
      fetchedAt: priceData.date.toLocaleString('en-IN'),
      message: 'Test successful',
      marketStatus: isWithinMarketHours() ? 'open' : 'closed',
      availableAPIs: {
        finnhub: process.env.FINNHUB_API_KEY ? 'Available' : 'Not configured',
        yahooFinance: 'Available',
        alphaVantage: apiKey ? 'Available' : 'Not configured'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      symbol: req.params.symbol,
      error: error.message,
      availableAPIs: {
        finnhub: process.env.FINNHUB_API_KEY ? 'Available' : 'Not configured',
        yahooFinance: 'Available',
        alphaVantage: process.env.STOCK_API_KEY ? 'Available' : 'Not configured'
      }
    });
  }
});

export default router;