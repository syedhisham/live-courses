exports.sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    status: success,
    message,
    ...(data !== null && { data }),
  });
};
