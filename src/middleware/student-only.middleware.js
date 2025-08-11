const { sendResponse } = require("../utils/sendResponse");

const studentOnly = (req, res, next) => {
  if (!req.user) {
    return sendResponse(res, 401, false, "Authentication required");
  }

  if (req.user.role !== "student") {
    return sendResponse(res, 403, false, "Access denied: Student only");
  }

  next();
};

module.exports = studentOnly;
