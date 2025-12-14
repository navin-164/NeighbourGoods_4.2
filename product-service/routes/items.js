import express from 'express';
import multer from 'multer';
import path from 'path';
import Item from '../models/Item.js';
import authMiddleware from '../authMiddleware.js';

const router = express.Router();

// Image Upload Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// GET ALL AVAILABLE ITEMS
router.get('/', async (req, res) => {
  try {
    const items = await Item.find({ status: 'Available' }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET LENDER DASHBOARD (Items owned by me)
router.get('/dashboard/lender', authMiddleware, async (req, res) => {
    try {
        const myItems = await Item.find({ owner: req.user.id }).sort('-createdAt');
        res.json({
            borrowed: myItems.filter(i => i.status === 'Borrowed'),
            sold: myItems.filter(i => i.status === 'Sold'),
            available: myItems.filter(i => i.status === 'Available')
        });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// CREATE ITEM
// router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
//   try {
//     const imageUrl = req.file ? `/${req.file.path.replace(/\\/g, "/")}` : null;
//     const newItem = new Item({
//       ...req.body,
//       imageUrl,
//       owner: req.user.id,
//       ownerName: req.user.name
//     });
//     await newItem.save();
//     res.status(201).json(newItem);
//   } catch (err) { res.status(500).json({ error: 'Server error' }); }
// });

// CREATE ITEM
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const imageUrl = req.file ? `/${req.file.path.replace(/\\/g, "/")}` : null;
    
    // Explicitly creating the object ensures 'pricePerDay' is a Number, not a String
    const newItem = new Item({
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      listingType: req.body.listingType,
      // FORCE CONVERSION TO NUMBER HERE:
      pricePerDay: Number(req.body.pricePerDay) || 0,
      salePrice: Number(req.body.salePrice) || 0,
      imageUrl,
      owner: req.user.id,
      ownerName: req.user.name
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Server error' }); 
  }
});

// UPDATE STATUS (Called by Order Service)
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await Item.findByIdAndUpdate(req.params.id, { status });
        res.json({ message: 'Status updated' });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// RATE ITEM
router.post('/:id/rate', authMiddleware, async (req, res) => {
    // Note: In a full microservice app, we should ask Order Service if user borrowed this item.
    // For simplicity, we will allow rating if the item exists.
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        
        item.ratings.push({
            user: req.user.id,
            name: req.user.name,
            stars: Number(req.body.stars),
            comment: req.body.comment
        });
        await item.save();
        res.status(201).json(item.ratings);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

export default router;