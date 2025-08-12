const User = require("../models/user.model");
const { sendResponse } = require("../utils/sendResponse");


exports.getLoggedInUser = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return sendResponse(res, 401, false, "Unauthorized: No user logged in.");
    }

    const user = await User.findById(userId).select("-password -__v");

    if (!user) {
      return sendResponse(res, 404, false, "User not found.");
    }

    return sendResponse(res, 200, true, "User fetched successfully.", { user });
  } catch (error) {
    console.error("Fetch logged-in user error:", error);
    return sendResponse(res, 500, false, "Internal server error.");
  }
};