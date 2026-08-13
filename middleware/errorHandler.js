const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Mongoose validation error - required fields, minlength, maxlength, enum, custom validators
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  // CHANGE: Added handler for MongoDB duplicate key error (code 11000)
  // Triggered when unique index on name+category is violated at DB level
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    return res.status(409).json({
      success: false,
      message: `Duplicate value for field(s): ${field}. Product already exists.`,
    });
  }

  // Mongoose bad ObjectId - invalid :id format in URL params
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid product ID format' });
  }

  // CHANGE: Added handler for malformed JSON in request body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  }

  // CHANGE: All error responses now include success: false for consistent API response shape
  res.status(500).json({ success: false, message: 'Internal server error' });
};

module.exports = errorHandler;
