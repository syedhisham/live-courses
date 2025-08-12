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
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,  // if you use cookies or auth headers
}));

app.use(cookieParser());
app.use(morgan("dev"));

// Import routes
const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const paymentRoutes = require('./routes/payment.routes');
const paymentController = require("./controllers/payment.controller");
const userRoutes = require("./routes/user.routes");
const muxRoutes = require("./routes/mux.routes");

// Handle webhook route BEFORE express.json()
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.stripeWebhookHandler
);
    
app.use(express.json());

// Mount other routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mux', muxRoutes);

// Test Route
app.get("/", (req, res) => res.send("LiveCourses API is running"));

module.exports = app;
