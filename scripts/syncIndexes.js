require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await Product.syncIndexes();
  console.log('Indexes synced successfully');
  const indexes = await Product.collection.indexes();
  console.log(JSON.stringify(indexes, null, 2));
  await mongoose.disconnect();
});
