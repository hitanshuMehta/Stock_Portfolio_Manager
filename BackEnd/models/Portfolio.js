import mongoose from 'mongoose';

const stockEntrySchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  shortName: {
    type: String,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  ineIsin: {
    type: String,
    required: true,
    trim: true
  },
  purchaseDate: {
    type: Date,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  purchaseAmount: {
    type: Number,
    required: true,
    min: 0
  },
  // Computed fields (populated when CMP is fetched)
  cmpDate: Date,
  cmpRate: Number,
  cmpAmount: Number,
  profitLoss: Number,
  daysHeld: Number,
  taxSlab: {
    type: String,
    enum: ['Long Term', 'Short Term']
  },
  taxAmount: Number,
  priceFetchedAt: Date
}, {
  timestamps: true
});

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  stocks: [stockEntrySchema],
  lastCmpUpdate: Date
}, {
  timestamps: true
});

// Compound index for better query performance
portfolioSchema.index({ userId: 1, name: 1 });
portfolioSchema.index({ username: 1, name: 1 });
stockEntrySchema.index({ symbol: 1 });

// Export the model, checking if it already exists
export default mongoose.models.Portfolio || mongoose.model('Portfolio', portfolioSchema);