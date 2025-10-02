import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes, { initializeAdminUser } from './routes/auth.js';
import portfolioRoutes from './routes/portfolio.js';
import companyRoutes from './routes/companies.js';
import { checkAndImportCompanies } from './utils/checkAndImportCompanies.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// // Allowed origins
// const allowedOrigins = process.env.NODE_ENV === 'production'
//   ? [process.env.FRONTEND_URL || 'https://yourproductionfrontend.com']
//   : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

// // Middleware
// app.use(cors({
//   origin: function(origin, callback){
//     if(!origin) return callback(null, true);
//     if(allowedOrigins.indexOf(origin) === -1){
//       const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
//       return callback(new Error(msg), false);
//     }
//     return callback(null, true);
//   },
//   credentials: true
// }));

// Allowed origins from env + dev fallbacks
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174'
    ];

    
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      const msg = `CORS blocked: ${origin} is not in allowedOrigins`;
      return callback(new Error(msg), false);
    }
  },
  credentials: true
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/companies', companyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    host: mongoose.connection.host
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Stock Portfolio API',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      portfolio: '/api/portfolio',
      companies: '/api/companies',
      health: '/api/health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// MongoDB Atlas Connection - FORCE ATLAS ONLY
const MONGODB_URI = process.env.MONGODB_URI;

// Validate that we're using Atlas
if (!MONGODB_URI || !MONGODB_URI.includes('mongodb+srv://')) {
  console.error('❌ ERROR: MongoDB Atlas connection string not found or invalid!');
  console.error('Please set MONGODB_URI in your .env file with a valid Atlas connection string.');
  console.error('Example: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database');
  process.exit(1);
}

console.log('🔗 Using MongoDB Atlas connection');
console.log('📍 Cluster:', MONGODB_URI.match(/@([^/]+)/)?.[1] || 'unknown');

// Disable strict query mode
mongoose.set('strictQuery', false);

// Connection options optimized for MongoDB Atlas - FORCE CLOUD CONNECTION
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 75000,
  connectTimeoutMS: 30000,
  directConnection: false, // Important: prevents local fallback
  tls: true, // Force TLS/SSL for Atlas
};

console.log('Connecting to MongoDB Atlas...');
console.log('Registered Models:', mongoose.modelNames());

mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(async () => {
    console.log('✓ Connected to MongoDB Atlas');
    console.log(`✓ Database: ${mongoose.connection.name}`);
    console.log(`✓ Connection Host: ${mongoose.connection.host}`);
    
    // VERIFY we're connected to Atlas, not localhost
    if (mongoose.connection.host === 'localhost' || mongoose.connection.host === '127.0.0.1') {
      console.error('\n❌ ERROR: Connected to LOCAL MongoDB instead of Atlas!');
      console.error('This should not happen. Check your connection string.');
      await mongoose.connection.close();
      process.exit(1);
    }
    
    console.log('✓ Models registered:', mongoose.modelNames());
    
    // Verify database and collections
    const admin = mongoose.connection.db.admin();
    const dbInfo = await admin.listDatabases();
    console.log('\n📊 Available Databases on Atlas:');
    dbInfo.databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Initialize admin user after successful connection
    try {
      await initializeAdminUser();
      console.log('✓ Admin user check completed');
    } catch (error) {
      console.error('⚠ Admin user initialization warning:', error.message);
    }
    
    // Auto-import companies on first run (one-time only)
    try {
      await checkAndImportCompanies();
      console.log('✓ Company import check completed');
    } catch (error) {
      console.error('⚠ Company import warning:', error.message);
    }
    
    // List all collections after initialization
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('\n📁 Collections in Atlas database:');
      if (collections.length === 0) {
        console.log('  ⚠ No collections found!');
      } else {
        for (const collection of collections) {
          const count = await mongoose.connection.db.collection(collection.name).countDocuments();
          console.log(`  - ${collection.name} (${count} documents)`);
        }
      }
    } catch (error) {
      console.error('⚠ Error listing collections:', error.message);
    }
    
    // Verify actual document counts using models
    console.log('\n🔢 Document Counts by Model:');
    try {
      const User = mongoose.model('User');
      const Company = mongoose.model('Company');
      const Portfolio = mongoose.model('Portfolio');
      
      const userCount = await User.countDocuments();
      const companyCount = await Company.countDocuments();
      const portfolioCount = await Portfolio.countDocuments();
      
      console.log(`  - Users: ${userCount}`);
      console.log(`  - Companies: ${companyCount}`);
      console.log(`  - Portfolios: ${portfolioCount}`);
    } catch (error) {
      console.error('⚠ Error counting documents:', error.message);
    }
    
    app.listen(PORT, () => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API available at: http://localhost:${PORT}`);
      console.log(`✓ Database: MongoDB Atlas (${mongoose.connection.host})`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
  })
  .catch((error) => {
    console.error('✗ MongoDB Atlas connection error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check if your IP address is whitelisted in MongoDB Atlas');
    console.log('2. Verify your MongoDB URI in the .env file');
    console.log('3. Ensure your database user has proper permissions');
    console.log('4. Make sure you are using mongodb+srv:// (not mongodb://)');
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✓ MongoDB reconnected');
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('✓ MongoDB connection closed');
    }
    process.exit(0);
  } catch (error) {
    console.error('✗ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));