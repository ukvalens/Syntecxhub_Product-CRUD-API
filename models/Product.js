const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // Normalized lowercase name used for duplicate detection
    nameLower: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be a positive number'],
      validate: {
        validator: (v) => !isNaN(v),
        message: 'Price must be a valid number',
      },
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      enum: {
        values: ['Electronics', 'Clothing', 'Food', 'Books', 'Furniture', 'Toys', 'Sports', 'Beauty', 'Automotive', 'Other'],
        message: '{VALUE} is not a valid category. Allowed: Electronics, Clothing, Food, Books, Furniture, Toys, Sports, Beauty, Automotive, Other',
      },
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Auto-set nameLower before save for reliable case-insensitive duplicate detection
productSchema.pre('save', function (next) {
  if (this.name) this.nameLower = this.name.toLowerCase().trim();
  next();
});

productSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && update.name) update.nameLower = update.name.toLowerCase().trim();
  next();
});

// Unique compound index on normalized name + category — DB-level duplicate prevention
productSchema.index({ nameLower: 1, category: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Product', productSchema);
