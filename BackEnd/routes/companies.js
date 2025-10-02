import express from 'express';
import Company from '../models/company.js';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ 
        error: 'Search term must be at least 2 characters' 
      });
    }

    const regex = new RegExp(q, 'i'); // Case-insensitive search
    const companies = await Company.find({
      $or: [
        { fullName: regex },
        { shortName: regex },
        { symbol: regex },
        { ineIsin: regex }
      ]
    })
    .limit(50)
    .select('symbol shortName fullName ineIsin');

    res.json(companies);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/symbol/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const company = await Company.findOne({ symbol });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error('Get company by symbol error:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/all', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const companies = await Company.find()
      .skip(skip)
      .limit(limit)
      .select('symbol shortName fullName ineIsin')
      .sort({ symbol: 1 });

    const total = await Company.countDocuments();

    res.json({
      companies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all companies error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
