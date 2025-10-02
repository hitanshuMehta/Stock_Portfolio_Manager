import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiPlus, FiRefreshCw, FiDownload, 
  FiTrendingUp, FiTrendingDown, FiFileText, FiClock, FiCheck, FiX
} from 'react-icons/fi';
import { portfolioService } from '../../services/api.jsx';
import Button from '../UI/Button.jsx';
import Modal from '../UI/Modal.jsx';
import LoadingSpinner from '../UI/LoadingSpinner.jsx';
import StockForm from './StockForm.jsx';
import StockTable from './StockTable.jsx';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PortfolioDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [error, setError] = useState('');
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showEditStockModal, setShowEditStockModal] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    if (id) {
      loadPortfolio();
    }
  }, [id]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const data = await portfolioService.getById(id);
      setPortfolio(data);
    } catch (err) {
      setError('Failed to load portfolio');
      console.error('Error loading portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  const pollProgress = async () => {
    try {
      const progress = await portfolioService.fetchPricesProgress(id);
      
      setProgressData(progress);
      
      if (progress.status === 'completed') {
        // Clear interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        
        // Update portfolio with completed data
        if (progress.portfolio) {
          setPortfolio(progress.portfolio);
        }
        
        // Show completion state for 2 seconds
        setTimeout(() => {
          setFetchingPrices(false);
          setProgressData(null);
        }, 2000);
        
      } else if (progress.status === 'error') {
        // Clear interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        
        setError(progress.error || 'Failed to fetch prices');
        setFetchingPrices(false);
        setProgressData(null);
      }
    } catch (err) {
      console.error('Error polling progress:', err);
    }
  };

  const handleFetchPrices = async () => {
    try {
      setFetchingPrices(true);
      setError('');
      setProgressData({
        status: 'starting',
        total: portfolio.stocks.length,
        completed: 0,
        current: null
      });
      
      // Start the price fetch (returns immediately)
      await portfolioService.fetchPrices(id);
      
      // Start polling for progress
      progressIntervalRef.current = setInterval(pollProgress, 800); // Poll every 800ms
      
    } catch (err) {
      console.error('Fetch prices error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch prices');
      setFetchingPrices(false);
      setProgressData(null);
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  const handleAddStock = async (stockData) => {
    try {
      const updatedPortfolio = await portfolioService.addStock(id, stockData);
      setPortfolio(updatedPortfolio);
      setShowAddStockModal(false);
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to add stock');
    }
  };

  const handleEditStock = async (stockData) => {
    try {
      const updatedPortfolio = await portfolioService.updateStock(
        id,
        editingStock._id,
        stockData
      );
      setPortfolio(updatedPortfolio);
      setShowEditStockModal(false);
      setEditingStock(null);
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to update stock');
    }
  };

  const handleDeleteStock = async (stockId) => {
    if (!window.confirm('Are you sure you want to delete this stock entry?')) {
      return;
    }

    try {
      const updatedPortfolio = await portfolioService.deleteStock(id, stockId);
      setPortfolio(updatedPortfolio);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete stock');
    }
  };

  const openEditStockModal = (stock) => {
    setEditingStock(stock);
    setShowEditStockModal(true);
  };

  const calculatePortfolioStats = (stocks) => {
    const totalStocks = stocks.length;
    const totalInvestment = stocks.reduce((sum, stock) => sum + stock.purchaseAmount, 0);
    const totalCurrentValue = stocks.reduce((sum, stock) => sum + (stock.cmpAmount || stock.purchaseAmount), 0);
    const totalProfitLoss = totalCurrentValue - totalInvestment;
    const totalTaxAmount = stocks.reduce((sum, stock) => sum + (stock.taxAmount || 0), 0);
    const totalQuantity = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
    
    const profitableStocks = stocks.filter(stock => (stock.profitLoss || 0) > 0).length;
    const lossStocks = stocks.filter(stock => (stock.profitLoss || 0) < 0).length;
    
    return {
      totalStocks,
      totalInvestment,
      totalCurrentValue,
      totalProfitLoss,
      totalTaxAmount,
      totalQuantity,
      profitableStocks,
      lossStocks,
      profitLossPercentage: totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0
    };
  };

  const exportToExcel = () => {
    if (!portfolio) return;

    const sortedStocks = [...portfolio.stocks].sort((a, b) => a.symbol.localeCompare(b.symbol));
    let previousSymbol = '';
    
    const exportData = sortedStocks.map(stock => {
      const pricePerStock = stock.purchaseAmount / stock.quantity;
      const currentSymbol = stock.symbol;
      const isFirstOccurrence = currentSymbol !== previousSymbol;
      previousSymbol = currentSymbol;
      
      return {
        'Symbol': isFirstOccurrence ? stock.symbol : '',
        'Short Name': isFirstOccurrence ? (stock.shortName || '') : '',
        'Full Name': isFirstOccurrence ? stock.fullName : '',
        'INE/ISIN': isFirstOccurrence ? stock.ineIsin : '',
        'Purchase Date': format(new Date(stock.purchaseDate), 'dd-MMM-yyyy'),
        'Quantity': stock.quantity,
        'Purchase Price Per Stock': pricePerStock.toFixed(2),
        'Purchase Amount': stock.purchaseAmount,
        'CMP Date': stock.cmpDate ? format(new Date(stock.cmpDate), 'dd-MMM-yyyy') : '',
        'CMP Rate': stock.cmpRate || '',
        'CMP Amount': stock.cmpAmount || '',
        'Profit/Loss': stock.profitLoss || '',
        'Days Held': stock.daysHeld || '',
        'Tax Slab': stock.taxSlab || '',
        'Tax Amount': stock.taxAmount || '',
        'Price Fetched At': stock.priceFetchedAt ? format(new Date(stock.priceFetchedAt), 'dd-MMM-yyyy hh:mm a') : ''
      };
    });

    const stats = calculatePortfolioStats(portfolio.stocks);
    const totalData = {
      'Symbol': 'TOTAL',
      'Short Name': '',
      'Full Name': '',
      'INE/ISIN': '',
      'Purchase Date': '',
      'Quantity': '',
      'Purchase Price Per Stock': '',
      'Purchase Amount': stats.totalInvestment,
      'CMP Date': '',
      'CMP Rate': '',
      'CMP Amount': stats.totalCurrentValue,
      'Profit/Loss': stats.totalProfitLoss,
      'Days Held': '',
      'Tax Slab': '',
      'Tax Amount': stats.totalTaxAmount,
      'Price Fetched At': ''
    };

    exportData.push(totalData);

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Portfolio');

    const metaData = [
      ['Portfolio Name:', portfolio.name],
      ['Generated At:', format(new Date(), 'dd-MMM-yyyy hh:mm:ss a')],
      ['Last CMP Update:', portfolio.lastCmpUpdate ? format(new Date(portfolio.lastCmpUpdate), 'dd-MMM-yyyy hh:mm a') : 'N/A'],
      ['Total Stocks:', stats.totalStocks],
      ['Total Investment:', stats.totalInvestment],
      ['Total Current Value:', stats.totalCurrentValue],
      ['Total P&L:', stats.totalProfitLoss],
      ['P&L Percentage:', `${stats.profitLossPercentage.toFixed(2)}%`],
      ['Total Tax Amount:', stats.totalTaxAmount],
      ['Profitable Stocks:', stats.profitableStocks],
      ['Loss Making Stocks:', stats.lossStocks]
    ];

    const metaWs = XLSX.utils.aoa_to_sheet(metaData);
    XLSX.utils.book_append_sheet(wb, metaWs, 'Summary');

    XLSX.writeFile(wb, `${portfolio.name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    if (!portfolio) return;

    const doc = new jsPDF('l', 'mm', 'a4');
    const stats = calculatePortfolioStats(portfolio.stocks);

    const headerHeight = 50;
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 297, headerHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont(undefined, 'bold');
    doc.text(portfolio.name, 148.5, 22, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(191, 219, 254);
    doc.text('PERFORMANCE REPORT  /  DETAILED ANALYSIS', 148.5, 31, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(191, 219, 254);
    doc.setFont(undefined, 'bold');
    doc.text('GENERATED', 74.25, 39, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text(format(new Date(), 'dd-MMM-yyyy hh:mm a'), 74.25, 45, { align: 'center' });

    if (portfolio.lastCmpUpdate) {
      doc.setTextColor(191, 219, 254);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(7.5);
      doc.text('LAST PRICE UPDATED', 222.75, 39, { align: 'center' });
      
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.text(format(new Date(portfolio.lastCmpUpdate), 'dd-MMM-yyyy hh:mm a'), 222.75, 45, { align: 'center' });
    }

    const cardY = 58;
    const cardHeight = 24;
    const cardWidth = 65;
    const gap = 7;
    const totalWidth = (cardWidth * 4) + (gap * 3);
    const startX = (297 - totalWidth) / 2;
    
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(startX, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(startX, cardY, cardWidth, cardHeight, 3, 3, 'S');
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL INVESTMENT', startX + 3, cardY + 6);
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(13);
    const investmentText = stats.totalInvestment.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    doc.text(`Rs ${investmentText}`, startX + 3, cardY + 14);
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`${stats.totalStocks} stocks`, startX + 3, cardY + 20);
    
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(startX + cardWidth + gap, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(startX + cardWidth + gap, cardY, cardWidth, cardHeight, 3, 3, 'S');
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('CURRENT VALUE', startX + 3 + cardWidth + gap, cardY + 6);
    doc.setTextColor(21, 128, 61);
    doc.setFontSize(13);
    const currentValueText = stats.totalCurrentValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    doc.text(`Rs ${currentValueText}`, startX + 3 + cardWidth + gap, cardY + 14);
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Updated recently`, startX + 3 + cardWidth + gap, cardY + 20);
    
    const plColor = stats.totalProfitLoss >= 0 ? [236, 253, 245] : [254, 242, 242];
    const plBorderColor = stats.totalProfitLoss >= 0 ? [167, 243, 208] : [254, 202, 202];
    const plTextColor = stats.totalProfitLoss >= 0 ? [22, 163, 74] : [220, 38, 38];
    const plDarkColor = stats.totalProfitLoss >= 0 ? [21, 128, 61] : [185, 28, 28];
    
    doc.setFillColor(...plColor);
    doc.roundedRect(startX + (cardWidth + gap) * 2, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setDrawColor(...plBorderColor);
    doc.roundedRect(startX + (cardWidth + gap) * 2, cardY, cardWidth, cardHeight, 3, 3, 'S');
    doc.setTextColor(...plTextColor);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('PROFIT & LOSS', startX + 3 + (cardWidth + gap) * 2, cardY + 6);
    doc.setTextColor(...plDarkColor);
    doc.setFontSize(13);
    const plText = Math.abs(stats.totalProfitLoss).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    doc.text(`Rs ${stats.totalProfitLoss >= 0 ? '+' : '-'}${plText}`, startX + 3 + (cardWidth + gap) * 2, cardY + 14);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`${stats.profitLossPercentage >= 0 ? '+' : ''}${stats.profitLossPercentage.toFixed(2)}% returns`, startX + 3 + (cardWidth + gap) * 2, cardY + 20);
    
    doc.setFillColor(252, 231, 243);
    doc.roundedRect(startX + (cardWidth + gap) * 3, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setDrawColor(244, 114, 182);
    doc.roundedRect(startX + (cardWidth + gap) * 3, cardY, cardWidth, cardHeight, 3, 3, 'S');
    doc.setTextColor(190, 24, 93);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('TAX AMOUNT', startX + 3 + (cardWidth + gap) * 3, cardY + 6);
    doc.setTextColor(157, 23, 77);
    doc.setFontSize(13);
    const taxText = stats.totalTaxAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    doc.text(`Rs ${taxText}`, startX + 3 + (cardWidth + gap) * 3, cardY + 14);
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`${stats.profitableStocks} profit | ${stats.lossStocks} loss`, startX + 3 + (cardWidth + gap) * 3, cardY + 20);

    const sortedStocks = [...portfolio.stocks].sort((a, b) => a.symbol.localeCompare(b.symbol));
    let previousSymbol = '';
    
    const tableData = sortedStocks.map(stock => {
      const pricePerStock = (stock.purchaseAmount / stock.quantity).toFixed(2);
      const currentSymbol = stock.symbol;
      const isFirstOccurrence = currentSymbol !== previousSymbol;
      previousSymbol = currentSymbol;
      
      const formatNumber = (num) => {
        if (!num && num !== 0) return '';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      };
      
      let plText = '';
      if (stock.profitLoss !== undefined && stock.profitLoss !== null) {
        const plValue = parseFloat(stock.profitLoss).toFixed(2);
        const plFormatted = plValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        if (stock.profitLoss >= 0) {
          plText = '+' + plFormatted;
        } else {
          plText = '-' + Math.abs(plValue).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
      }
      
      let taxText = '';
      if (stock.profitLoss && stock.profitLoss < 0) {
        taxText = '0.00';
      } else if (stock.taxAmount) {
        taxText = parseFloat(stock.taxAmount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }
      
      return [
        isFirstOccurrence ? stock.symbol : '',
        isFirstOccurrence ? (stock.fullName.substring(0, 25) + (stock.fullName.length > 25 ? '...' : '')) : '',
        format(new Date(stock.purchaseDate), 'dd-MMM-yyyy'),
        formatNumber(stock.quantity),
        pricePerStock,
        formatNumber(stock.purchaseAmount),
        stock.cmpRate?.toFixed(2) || '',
        stock.cmpAmount ? formatNumber(stock.cmpAmount) : '',
        plText,
        stock.daysHeld || '',
        stock.taxSlab || '',
        taxText
      ];
    });

    const formatNumber = (num) => {
      if (!num && num !== 0) return '';
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };
    
    const totalPLValue = parseFloat(stats.totalProfitLoss).toFixed(2);
    const totalPLText = stats.totalProfitLoss >= 0 
      ? '+' + formatNumber(totalPLValue)
      : '-' + formatNumber(Math.abs(totalPLValue));
    
    const totalInvestmentText = parseFloat(stats.totalInvestment).toFixed(2);
    const totalCurrentValueText = parseFloat(stats.totalCurrentValue).toFixed(2);
    const totalTaxText = parseFloat(stats.totalTaxAmount).toFixed(2);
    
    tableData.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      formatNumber(totalInvestmentText),
      '',
      formatNumber(totalCurrentValueText),
      totalPLText,
      '',
      '',
      formatNumber(totalTaxText)
    ]);

    autoTable(doc, {
      head: [['Symbol', 'Company', 'Purch Date', 'Qty', 'Price/Stock', 'Purch Amt', 'CMP Rate', 'CMP Amt', 'P&L', 'Days', 'Tax Slab', 'Tax Amt']],
      body: tableData,
      startY: 90,
      styles: { 
        fontSize: 7,
        cellPadding: 2,
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 35 },
        2: { cellWidth: 22 },
        3: { cellWidth: 15, halign: 'right' },
        4: { cellWidth: 18, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 25, halign: 'right' },
        8: { cellWidth: 28, halign: 'right' },
        9: { cellWidth: 12, halign: 'center' },
        10: { cellWidth: 20, halign: 'center' },
        11: { cellWidth: 22, halign: 'right' }
      },
      headStyles: { 
        fillColor: [37, 99, 235],
        fontStyle: 'bold',
        halign: 'center',
        textColor: [255, 255, 255],
        fontSize: 7
      },
      alternateRowStyles: { 
        fillColor: [249, 250, 251]
      },
      footStyles: {
        fillColor: [37, 99, 235],
        fontStyle: 'bold',
        textColor: [255, 255, 255],
        fontSize: 8
      },
      didParseCell: function(data) {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [37, 99, 235];
          data.cell.styles.textColor = [255, 255, 255];
        }
        
        if (data.column.index === 8 && data.row.index < tableData.length - 1) {
          const value = data.cell.text[0];
          if (value && value.startsWith('+')) {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          } else if (value && value.startsWith('-')) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    doc.save(`${portfolio.name}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Portfolio not found</p>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const stats = calculatePortfolioStats(portfolio.stocks);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header (RESPONSIVE CHANGES APPLIED) */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main header container: Stacks vertically on mobile (flex-col), switches to horizontal on medium screens (md:flex-row) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between py-4 space-y-3 md:space-y-0">
            {/* Left Section: Back Button + Title/Description */}
            <div className="flex items-start space-x-4">
              <Button
                variant="secondary"
                onClick={() => navigate('/dashboard')}
                icon={<FiArrowLeft />}
                size="sm"
              >
                Back
              </Button>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-gray-900">{portfolio.name}</h1>
                {portfolio.description && (
                  <p className="text-sm text-gray-600">{portfolio.description}</p>
                )}
              </div>
            </div>

            {/* Right Section: Action Buttons (Update Prices, Add Stock) */}
            <div className="flex space-x-3 justify-end">
              <Button
                variant="success"
                onClick={handleFetchPrices}
                loading={fetchingPrices}
                disabled={fetchingPrices}
                icon={<FiRefreshCw />}
                size="sm"
              >
                Update Prices
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowAddStockModal(true)}
                icon={<FiPlus />}
                size="sm"
              >
                Add Stock
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Real-time Progress Tracker (RESPONSIVE CHANGES APPLIED) */}
        {fetchingPrices && progressData && (
          <div className="mb-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 rounded-2xl p-6 shadow-xl">
            
            {/* Header Section: Changed to stack on mobile */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 space-y-4 sm:space-y-0">
              {/* Left Side: Icon and Title */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {progressData.status === 'completed' ? (
                    <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center">
                      <FiCheck className="h-6 w-6 text-white" />
                    </div>
                  ) : (
                    <>
                      <FiRefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-600 rounded-full animate-ping"></div>
                    </>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-blue-900">
                    {progressData.status === 'completed' ? 'Price Update Complete!' : 'Updating Stock Prices'}
                  </h3>
                  <p className="text-sm text-blue-600">
                    {progressData.status === 'completed' 
                      ? 'All prices have been successfully updated' 
                      : progressData.current 
                        ? `Currently fetching: ${progressData.current}`
                        : 'Initializing price fetch...'}
                  </p>
                </div>
              </div>
              
              {/* Right Side: Counter (Now has full width on mobile) */}
              {progressData.status !== 'completed' && (
                <div className="flex flex-col items-end w-full sm:w-auto">
                  <div className="flex items-center justify-end w-full bg-white px-5 py-3 rounded-xl shadow-lg border-2 border-blue-200">
                    <span className="text-3xl font-bold text-blue-600">
                      {progressData.completed}
                    </span>
                    <span className="text-lg text-gray-400 mx-1">/</span>
                    <span className="text-2xl font-semibold text-gray-700">
                      {progressData.total}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-medium">stocks updated</p>
                </div>
              )}
            </div>
            
            {/* Progress Bar (No change) */}
            <div className="relative mb-4">
              <div className="w-full bg-blue-200 rounded-full h-6 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-6 rounded-full transition-all duration-500 ease-out relative flex items-center justify-end pr-3"
                  style={{ 
                    width: progressData.total > 0 
                      ? `${(progressData.completed / progressData.total) * 100}%` 
                      : '0%'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-pulse"></div>
                  <span className="text-xs font-bold text-white z-10">
                    {progressData.total > 0 ? Math.round((progressData.completed / progressData.total) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid: Changed to stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                <div className="flex items-center space-x-2 mb-1">
                  <FiRefreshCw className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Processing</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{progressData.completed}</p>
                <p className="text-xs text-gray-500">stocks fetched</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
                <div className="flex items-center space-x-2 mb-1">
                  <FiCheck className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cached</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{progressData.cached || 0}</p>
                <p className="text-xs text-gray-500">already updated</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                <div className="flex items-center space-x-2 mb-1">
                  <FiClock className="h-4 w-4 text-purple-600" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Remaining</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {progressData.total - progressData.completed}
                </p>
                <p className="text-xs text-gray-500">pending</p>
              </div>
            </div>

            {/* Errors Display */}
            {progressData.errors && progressData.errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <FiX className="h-4 w-4 text-red-600" />
                  <p className="text-sm font-semibold text-red-800">
                    {progressData.errors.length} error{progressData.errors.length > 1 ? 's' : ''} occurred
                  </p>
                </div>
                <div className="text-xs text-red-600 space-y-1 max-h-20 overflow-y-auto">
                  {progressData.errors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Completion Message */}
            {progressData.status === 'completed' && (
              <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center space-x-3">
                <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <FiCheck className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-green-900 font-semibold">
                    Successfully updated {progressData.completed} stock{progressData.completed !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-green-700">
                    Your portfolio is now up to date with the latest market prices
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg whitespace-pre-line">
            {error}
            <button 
              onClick={() => setError('')} 
              className="ml-4 text-red-500 hover:text-red-700 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Portfolio Stats (No change) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <FiTrendingUp className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Investment</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{stats.totalInvestment.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <FiTrendingUp className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Current Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{stats.totalCurrentValue.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stats.totalProfitLoss >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {stats.totalProfitLoss >= 0 ? <FiTrendingUp className="h-6 w-6" /> : <FiTrendingDown className="h-6 w-6" />}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total P&L</p>
                <p className={`text-2xl font-bold ${stats.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.totalProfitLoss >= 0 ? '+' : ''}₹{stats.totalProfitLoss.toLocaleString('en-IN')}
                </p>
                <p className={`text-sm ${stats.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  AR({stats.profitLossPercentage >= 0 ? '+' : ''}{stats.profitLossPercentage.toFixed(2)}%)
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                <FiFileText className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Stocks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStocks}</p>
                <p className="text-sm text-gray-500">
                  {stats.profitableStocks} profitable, {stats.lossStocks} loss
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Buttons (RESPONSIVE CHANGES APPLIED) */}
        {portfolio.stocks.length > 0 && (
          <div className="mb-6 flex flex-col sm:flex-row justify-center sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              variant="secondary"
              onClick={exportToExcel}
              icon={<FiDownload />}
              size="sm"
              className="w-full sm:w-auto"
            >
              Export to Excel
            </Button>
            <Button
              variant="secondary"
              onClick={exportToPDF}
              icon={<FiDownload />}
              size="sm"
              className="w-full sm:w-auto"
            >
              Export to PDF
            </Button>
          </div>
        )}

        {/* Last Update Info */}
        {portfolio.lastCmpUpdate && (
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-600">
              Last price update: {format(new Date(portfolio.lastCmpUpdate), 'dd-MMM-yyyy hh:mm a')}
            </p>
          </div>
        )}

        {/* Stock Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {portfolio.stocks.length === 0 ? (
            <div className="text-center py-12">
              <FiTrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No stocks added yet</h3>
              <p className="text-gray-600 mb-6">Start building your portfolio by adding your first stock</p>
              <Button onClick={() => setShowAddStockModal(true)} icon={<FiPlus />}>
                Add Stock
              </Button>
            </div>
          ) : (
            <StockTable
              stocks={portfolio.stocks}
              onEdit={openEditStockModal}
              onDelete={handleDeleteStock}
            />
          )}
        </div>
      </div>

      {/* Add Stock Modal */}
      <Modal
        isOpen={showAddStockModal}
        onClose={() => setShowAddStockModal(false)}
        title="Add Stock to Portfolio"
        size="lg"
      >
        <StockForm
          onSubmit={handleAddStock}
          onCancel={() => setShowAddStockModal(false)}
        />
      </Modal>

      {/* Edit Stock Modal */}
      <Modal
        isOpen={showEditStockModal}
        onClose={() => setShowEditStockModal(false)}
        title="Edit Stock Entry"
        size="lg"
      >
        <StockForm
          stock={editingStock}
          onSubmit={handleEditStock}
          onCancel={() => setShowEditStockModal(false)}
        />
      </Modal>
    </div>
  );
};

export default PortfolioDetails;