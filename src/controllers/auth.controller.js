const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { sendResponse } = require("../utils/sendResponse");
const bcrypt = require("bcrypt");

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      console.log("Register failed: Missing required fields");
      return sendResponse(
        res,
        400,
        false,
        "Name, email, password and role are required."
      );
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`Register failed: Email already exists (${email})`);
      return sendResponse(res, 409, false, "Email already registered.");
    }

    await User.create({
      name,
      email,
      password,
      role,
    });

    return sendResponse(res, 201, true, "User registered successfully.");
  } catch (error) {
    console.error("Register error:", error);
    return sendResponse(res, 500, false, "Internal server error.");
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendResponse(res, 400, false, "All fields are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
      return sendResponse(res, 401, false, "Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendResponse(res, 401, false, "Invalid email or password.");
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    console.log(`User logged in successfully: ${user._id}`);
    return sendResponse(res, 200, true, "Login successful.");
  } catch (error) {
    console.error("Login error:", error);
    return sendResponse(res, 500, false, "Internal server error.");
  }
};

exports.logout = (req, res) => {
  try {
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      expires: new Date(0),
    });

    console.log(`User logged out successfully`);
    return sendResponse(res, 200, true, "Logout successful.");
  } catch (error) {
    console.error("Logout error:", error);
    return sendResponse(res, 500, false, "Internal server error.");
  }
};
