import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Company from '../models/company.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const checkAndImportCompanies = async () => {
  try {
    // Check if companies already exist in database
    const count = await Company.countDocuments();
    
    if (count > 0) {
      console.log(`Companies already imported (${count} records found)`);
      return;
    }

    console.log('No companies found. Starting import...');

    // Read JSON file
    const jsonPath = path.join(__dirname, '../data/companies.json');
    
    if (!fs.existsSync(jsonPath)) {
      console.error('companies.json file not found at:', jsonPath);
      return;
    }

    const stockData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Transform data
    const transformedData = stockData.map(item => ({
      symbol: item.Symbol,
      shortName: item['Short Name'],
      fullName: item['Company Name'],
      ineIsin: item['INE Number']
    }));

    // Insert data
    const result = await Company.insertMany(transformedData, { ordered: false });
    console.log(`✓ Successfully imported ${result.length} companies`);

  } catch (error) {
    if (error.code === 11000) {
      console.log('Some companies already exist, skipping duplicates');
    } else {
      console.error('Error importing companies:', error.message);
    }
  }
};