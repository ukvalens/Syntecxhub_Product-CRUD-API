require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

connectDB();

app.use(express.json());

// Wrap all async route handlers to automatically catch errors and forward to errorHandler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const productRouter = require('./routes/productRoutes');
productRouter.stack.forEach((layer) => {
  if (layer.route) {
    layer.route.stack.forEach((routeLayer) => {
      const original = routeLayer.handle;
      routeLayer.handle = asyncHandler(original);
    });
  }
});

app.use('/api/products', productRoutes);

// CHANGE: Added global 404 handler for any unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
