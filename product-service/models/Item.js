import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
    user: { type: String, required: true }, // Store User ID string
    name: { type: String, required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: String
}, { timestamps: true });

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['Tools', 'Camping', 'Kitchen', 'Electronics', 'Other'] },
  imageUrl: String,
  listingType: { type: String, enum: ['borrow', 'sale'] },
  pricePerDay: { type: Number, default: 0 },
  salePrice: { type: Number, default: 0 },
  status: { type: String, enum: ['Available', 'Borrowed', 'Sold'], default: 'Available' },
  owner: { type: String, required: true }, // Just the ID string
  ownerName: String,
  ratings: [ratingSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Item', itemSchema);