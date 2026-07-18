// Single place all errors funnel through. Keeps controllers free of
// repeated try/catch boilerplate and guarantees a consistent JSON shape,
// and never leaks stack traces to the client in production.
function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.statusCode || 500;
  const message = err.message || 'Something went wrong. Please try again.';

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

function notFound(req, res, next) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

module.exports = { errorHandler, notFound };
