const Product = require('../models/Product');

// GET /api/products?category=&minPrice=&maxPrice=&page=&limit=
const getProducts = async (req, res) => {
  const { category, minPrice, maxPrice, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (category) filter.category = { $regex: category, $options: 'i' };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter).skip(skip).limit(limitNum).sort({ createdAt: -1 }),
    Product.countDocuments(filter),
  ]);

  res.json({
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    products,
  });
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
};

// POST /api/products
const createProduct = async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ message: 'Product deleted successfully' });
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };
