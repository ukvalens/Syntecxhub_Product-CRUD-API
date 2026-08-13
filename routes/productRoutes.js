const express = require('express');
const router = express.Router();
const {
  getProducts, getProductById, createProduct,
  updateProduct, deleteProduct, restoreProduct,
  bulkDelete, getStats, getDeletedProducts,
} = require('../controllers/productController');

// CHANGE: Added /stats route - returns aggregated product stats by category
router.get('/stats', getStats);

// CHANGE: Added /deleted route - returns all soft-deleted products
router.get('/deleted', getDeletedProducts);

// CHANGE: Added /bulk-delete route - soft deletes multiple products by IDs array
router.delete('/bulk-delete', bulkDelete);

// Existing CRUD routes
router.route('/').get(getProducts).post(createProduct);
router.route('/:id').get(getProductById).put(updateProduct).delete(deleteProduct);

// CHANGE: Added /:id/restore route - restores a soft-deleted product
router.patch('/:id/restore', restoreProduct);

module.exports = router;
