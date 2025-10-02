import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes, { initializeAdminUser } from "./routes/auth.js";
import portfolioRoutes from "./routes/portfolio.js";
import companyRoutes from "./routes/companies.js";
import { checkAndImportCompanies } from "./utils/checkAndImportCompanies.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ----------------- CORS CONFIG -----------------
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [
        process.env.FRONTEND_URL,
      ].filter(Boolean) // Remove undefined values
    : ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"];

// Log allowed origins for debugging
console.log("✓ Allowed CORS origins:", allowedOrigins);
console.log("✓ NODE_ENV:", process.env.NODE_ENV);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        console.log(`✓ CORS allowed: ${origin}`);
        return callback(null, true);
      } else {
        console.warn(`✗ CORS blocked: ${origin}`);
        return callback(new Error(`CORS blocked: ${origin}`), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// Preflight requests are already handled by the cors() middleware above
// No need for explicit app.options("*") with newer Express versions

// Security headers
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

// ----------------- BODY PARSER -----------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ----------------- REQUEST LOGGING -----------------
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// ----------------- ROUTES -----------------
app.use("/api/auth", authRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/companies", companyRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    host: mongoose.connection.host,
    allowedOrigins: allowedOrigins,
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Stock Portfolio API",
    version: "2.0.0",
    endpoints: {
      auth: "/api/auth",
      portfolio: "/api/portfolio",
      companies: "/api/companies",
      health: "/api/health",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// ----------------- MONGODB ATLAS CONNECTION -----------------
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI || !MONGODB_URI.includes("mongodb+srv://")) {
  console.error("❌ Invalid MongoDB Atlas URI!");
  process.exit(1);
}
mongoose.set("strictQuery", false);

const mongooseOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 75000,
  connectTimeoutMS: 30000,
  directConnection: false,
  tls: true,
};

mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(async () => {
    console.log("✓ Connected to MongoDB Atlas");

    // Initialize admin user & import companies
    try { await initializeAdminUser(); } catch(e){ console.warn(e.message); }
    try { await checkAndImportCompanies(); } catch(e){ console.warn(e.message); }

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
    });
  })
  .catch((err) => {
    console.error("✗ MongoDB Atlas connection error:", err.message);
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on("error", (err) => console.error("MongoDB connection error:", err));
mongoose.connection.on("disconnected", () => console.log("⚠ MongoDB disconnected. Reconnecting..."));
mongoose.connection.on("reconnected", () => console.log("✓ MongoDB reconnected"));

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received. Closing MongoDB connection...`);
  try {
    if (mongoose.connection.readyState === 1) await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

