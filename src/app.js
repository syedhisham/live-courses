require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// Connect to DB
connectDB();

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));

// Routes Import
const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);

// Test Route
app.get("/", (req, res) => res.send("LiveCourses API is running"));

module.exports = app;
