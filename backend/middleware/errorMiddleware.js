function notFoundHandler(req, res, next) {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`
    });
  }
  next();
}

function errorHandler(err, req, res, next) {
  console.error('[Central Error]', err.stack || err.message);
  
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const friendlyMessage = err.friendlyMessage || err.message || 'An unexpected server error occurred.';

  res.status(statusCode).json({
    success: false,
    message: friendlyMessage
  });
}

module.exports = { notFoundHandler, errorHandler };
