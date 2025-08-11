const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { sendResponse } = require("../utils/sendResponse");

const auth = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  let token = authHeader?.replace("Bearer ", "");

  if (!token && req.cookies) {
    token = req.cookies.token;
  }

  if (!token) {
    return sendResponse(res, 401, false, "No token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return sendResponse(res, 401, false, "User not found");
    }
    req.user = user;
    next();
  } catch (err) {
    return sendResponse(res, 401, false, "Invalid token");
  }
};

module.exports = auth;
