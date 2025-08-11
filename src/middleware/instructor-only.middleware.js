const { sendResponse } = require("../utils/sendResponse");

const instructorOnly = (req, res, next) => {
  if (!req.user) {
    return sendResponse(res, 401, false, "Authentication required");
  }

  if (req.user.role !== "instructor") {
    return sendResponse(res, 403, false, "Access denied: Instructors only");
  }

  next();
};

module.exports = instructorOnly;
