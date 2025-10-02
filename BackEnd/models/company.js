import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  shortName: {
    type: String,
    required: true,
    uppercase: true,
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
    unique: true,
    trim: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'companies'
});

// Text index for search functionality
companySchema.index({ 
  fullName: 'text', 
  symbol: 'text', 
  shortName: 'text' 
});

// Static method to search companies
companySchema.statics.searchCompanies = function(searchTerm) {
  const searchRegex = new RegExp(searchTerm, 'i');
  return this.find({
    $or: [
      { symbol: searchRegex },
      { fullName: searchRegex },
      { shortName: searchRegex }
    ]
  })
  .limit(20)
  .select('symbol shortName fullName ineIsin');
};

// Static method to find by symbol
companySchema.statics.findBySymbol = function(symbol) {
  return this.findOne({ symbol: symbol.toUpperCase() });
};

// Export the model, checking if it already exists
export default mongoose.models.Company || mongoose.model('Company', companySchema);