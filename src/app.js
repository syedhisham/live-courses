require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// Connect to DB
connectDB();

// Middleware for CORS, cookies, logging
app.use(cors());
app.use(cookieParser());
app.use(morgan("dev"));

// Import routes
const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const paymentRoutes = require('./routes/payment.routes');

// Handle webhook route BEFORE express.json()
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' })
);
    
app.use(express.json());

// Mount other routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use('/api/payments', paymentRoutes);

// Test Route
app.get("/", (req, res) => res.send("LiveCourses API is running"));

module.exports = app;
