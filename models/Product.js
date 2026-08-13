const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      // CHANGE: Added minlength validation - name must be at least 2 characters
      minlength: [2, 'Name must be at least 2 characters'],
      // CHANGE: Added maxlength validation - name cannot exceed 100 characters
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be a positive number'],
      // CHANGE: Added custom validator to reject non-numeric price values
      validate: {
        validator: (v) => !isNaN(v),
        message: 'Price must be a valid number',
      },
    },
    description: {
      type: String,
      trim: true,
      default: '',
      // CHANGE: Added maxlength to prevent excessively long descriptions
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      // CHANGE: Added enum to restrict category to predefined valid values only
      enum: {
        values: ['Electronics', 'Clothing', 'Food', 'Books', 'Furniture', 'Toys', 'Sports', 'Beauty', 'Automotive', 'Other'],
        message: '{VALUE} is not a valid category',
      },
    },
    // CHANGE: Added stock field to track product inventory quantity
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    // CHANGE: Added isDeleted field to support soft delete (product is hidden, not removed from DB)
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// CHANGE: Added unique compound index on name + category to prevent duplicate products
// e.g. "iPhone" in "Electronics" cannot be added twice
productSchema.index({ name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
