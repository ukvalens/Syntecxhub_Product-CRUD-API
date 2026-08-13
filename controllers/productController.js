const Product = require('../models/Product');

// ─── GET /api/products ───────────────────────────────────────────────────────
// CHANGE: Added search by name (regex), sortBy field, sort order (asc/desc)
// CHANGE: All queries now exclude soft-deleted products via isDeleted: false
// CHANGE: Response now includes success flag and limit in pagination metadata
const getProducts = async (req, res) => {
  const {
    category, minPrice, maxPrice,
    search, sortBy = 'createdAt', order = 'desc',
    page = 1, limit = 10,
  } = req.query;

  // CHANGE: Base filter always excludes soft-deleted products
  const filter = { isDeleted: false };

  if (category) filter.category = category;
  // CHANGE: Added name search using case-insensitive regex
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // CHANGE: Added dynamic sorting - whitelist allowed fields to prevent injection
  const allowedSortFields = ['name', 'price', 'createdAt', 'stock'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortOrder = order === 'asc' ? 1 : -1;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ [sortField]: sortOrder }).skip(skip).limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    // CHANGE: Added limit to response so client knows items per page
    limit: limitNum,
    products,
  });
};

// ─── GET /api/products/stats ─────────────────────────────────────────────────
// CHANGE: New endpoint - returns aggregated stats grouped by category
// includes count, avgPrice, minPrice, maxPrice, totalStock per category
const getStats = async (req, res) => {
  const stats = await Product.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        totalStock: { $sum: '$stock' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const totalProducts = await Product.countDocuments({ isDeleted: false });
  res.json({ success: true, totalProducts, byCategory: stats });
};

// ─── GET /api/products/deleted ───────────────────────────────────────────────
// CHANGE: New endpoint - returns all soft-deleted products for admin review/restore
const getDeletedProducts = async (req, res) => {
  const products = await Product.find({ isDeleted: true }).sort({ updatedAt: -1 });
  res.json({ success: true, total: products.length, products });
};

// ─── GET /api/products/:id ───────────────────────────────────────────────────
// CHANGE: Now filters out soft-deleted products - deleted product returns 404
const getProductById = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  // CHANGE: Response now wrapped in success flag and product key
  res.json({ success: true, product });
};

// ─── POST /api/products ──────────────────────────────────────────────────────
// CHANGE: Added duplicate check before insert - prevents same product name
// in the same category (case-insensitive) from being created more than once
const createProduct = async (req, res) => {
  const { name, price, description, category, stock } = req.body;

  // CHANGE: Case-insensitive duplicate check using regex before creating
  const existing = await Product.findOne({
    name: { $regex: `^${name}$`, $options: 'i' },
    category,
    isDeleted: false,
  });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: `Product "${name}" already exists in category "${category}"`,
    });
  }

  // CHANGE: Only whitelisted fields are passed to create (prevents mass assignment)
  const product = await Product.create({ name, price, description, category, stock });
  res.status(201).json({ success: true, message: 'Product created successfully', product });
};

// ─── PUT /api/products/:id ───────────────────────────────────────────────────
// CHANGE: Added duplicate check on update - if name or category changes,
// verify the new combination doesn't already exist in another product
const updateProduct = async (req, res) => {
  const { name, price, description, category, stock } = req.body;

  if (name || category) {
    const current = await Product.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Product not found' });

    const newName = name || current.name;
    const newCategory = category || current.category;

    // CHANGE: Exclude current product from duplicate check using $ne
    const duplicate = await Product.findOne({
      _id: { $ne: req.params.id },
      name: { $regex: `^${newName}$`, $options: 'i' },
      category: newCategory,
      isDeleted: false,
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `Product "${newName}" already exists in category "${newCategory}"`,
      });
    }
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { name, price, description, category, stock },
    { new: true, runValidators: true }
  );
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, message: 'Product updated successfully', product });
};

// ─── DELETE /api/products/:id ────────────────────────────────────────────────
// CHANGE: Changed from hard delete (findByIdAndDelete) to soft delete
// Sets isDeleted: true instead of removing the document from MongoDB
const deleteProduct = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, message: 'Product deleted successfully' });
};

// ─── PATCH /api/products/:id/restore ────────────────────────────────────────
// CHANGE: New endpoint - restores a soft-deleted product by setting isDeleted: false
const restoreProduct = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, isDeleted: true },
    { isDeleted: false },
    { new: true }
  );
  if (!product) return res.status(404).json({ success: false, message: 'Product not found or not deleted' });
  res.json({ success: true, message: 'Product restored successfully', product });
};

// ─── DELETE /api/products/bulk-delete ───────────────────────────────────────
// CHANGE: New endpoint - soft deletes multiple products at once using an array of IDs
const bulkDelete = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: 'Provide an array of product IDs' });
  }
  const result = await Product.updateMany(
    { _id: { $in: ids }, isDeleted: false },
    { isDeleted: true }
  );
  res.json({ success: true, message: `${result.modifiedCount} product(s) deleted` });
};

module.exports = {
  getProducts, getProductById, createProduct,
  updateProduct, deleteProduct, restoreProduct,
  bulkDelete, getStats, getDeletedProducts,
};
