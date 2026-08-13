require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

connectDB();

app.use(express.json());

// Wrap async handlers to forward errors to errorHandler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Apply asyncHandler to all product routes
const router = require('./routes/productRoutes');
router.stack.forEach((layer) => {
  if (layer.route) {
    layer.route.stack.forEach((routeLayer) => {
      const original = routeLayer.handle;
      routeLayer.handle = asyncHandler(original);
    });
  }
});

app.use('/api/products', productRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
