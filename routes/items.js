import express from 'express';
import Item from '../models/Item.js';
import ActivityLog from '../models/ActivityLog.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { authenticateJWT } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Get all items (public)
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().populate('owner', 'name fullName email contactNumber profilePhoto').sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's items (authenticated users only)
router.get('/user', authenticateJWT, async (req, res) => {
  try {
    const items = await Item.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error('Error fetching user items:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get item by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('owner', 'name fullName email contactNumber profilePhoto');
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new item (authenticated users only)
router.post('/', authenticateJWT, upload.single('photo'), async (req, res) => {
  try {
    const { name, description, category, location, dateLost } = req.body;

    const itemData = {
      name,
      description,
      category,
      location,
      dateLost,
      owner: req.user._id
    };

    if (req.file) {
      itemData.photo = `/uploads/${req.file.filename}`;
    }

    const item = new Item(itemData);
    await item.save();

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'post_item',
      details: `Item "${item.name}" posted by ${req.user.name}`
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update item (owner only)
router.put('/:id', authenticateJWT, upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, location, dateLost } = req.body;

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check ownership
    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updateData = {
      name,
      description,
      category,
      location,
      dateLost
    };

    if (req.file) {
      updateData.photo = `/uploads/${req.file.filename}`;
    }

    const updatedItem = await Item.findByIdAndUpdate(id, updateData, { new: true });

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'edit_item',
      details: `Item "${updatedItem.name}" edited by ${req.user.name}`
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete item (owner only)
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check ownership
    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await Item.findByIdAndDelete(id);

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'delete_item',
      details: `Item "${item.name}" deleted by ${req.user.name}`
    });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark item as found (authenticated users only)
router.post('/found', authenticateJWT, async (req, res) => {
  try {
    const { itemId, finderId, finderName } = req.body;

    if (!itemId || !finderId || !finderName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check that the finder is not the owner
    if (item.owner.toString() === finderId) {
      return res.status(400).json({ message: 'Cannot mark your own item as found' });
    }

    // Find admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      return res.status(500).json({ message: 'Admin not found' });
    }

    // Create notifications
    const notifications = [
      {
        recipientId: admin._id,
        message: `Item "${item.name}" lost at ${item.location} has been found by ${finderName}`,
        itemId: item._id,
        finderId,
        finderName
      },
      {
        recipientId: item.owner,
        message: `Your item "${item.name}" has been found by ${finderName}`,
        itemId: item._id,
        finderId,
        finderName
      }
    ];

    await Notification.insertMany(notifications);

    // Update item status
    item.status = 'found';
    await item.save();

    res.json({ message: 'Item marked as found, notifications sent' });
  } catch (error) {
    console.error('Error marking item as found:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
