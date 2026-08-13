require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const col = mongoose.connection.collection('products');

  // Get all documents
  const all = await col.find({}).toArray();
  console.log('Total docs:', all.length);

  // Find duplicates (same name case-insensitive + same category) — keep first, delete rest
  const seen = {};
  const toDelete = [];
  for (const doc of all) {
    const key = (doc.name || '').toLowerCase().trim() + '|' + doc.category;
    if (seen[key]) {
      toDelete.push(doc._id);
    } else {
      seen[key] = true;
    }
  }

  console.log('Duplicates to remove:', toDelete.length);
  if (toDelete.length) {
    await col.deleteMany({ _id: { $in: toDelete } });
    console.log('Duplicates removed');
  }

  // Backfill nameLower on all existing documents
  const result = await col.updateMany(
    {},
    [{ $set: { nameLower: { $toLower: '$name' } } }]
  );
  console.log('nameLower backfilled on', result.modifiedCount, 'documents');

  await mongoose.disconnect();
  console.log('Done');
});
