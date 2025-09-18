import express from 'express';
import User from '../models/User.js';
import Item from '../models/Item.js';
import Notification from '../models/Notification.js';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get notifications for admin
router.get('/notifications', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id })
      .populate('itemId')
      .populate({
        path: 'itemId',
        populate: { path: 'owner', model: 'User' }
      })
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard analytics (admin only)
router.get('/analytics', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Item.countDocuments();
    const foundItems = await Item.countDocuments({ status: 'found' });
    const lostItems = await Item.countDocuments({ status: 'lost' });

    // User registrations per month (last 6 months)
    const userRegistrationsAgg = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 5)) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const userRegistrations = userRegistrationsAgg || [];

    // Posts created per month (last 6 months)
    const postsPerMonthAgg = await Item.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 5)) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const postsPerMonth = postsPerMonthAgg || [];

    // Found vs Lost items count
    const foundLostCounts = await Item.aggregate([
      {
        $match: {
          status: { $in: ['found', 'lost'] }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalUsers,
      totalPosts,
      foundItems,
      lostItems,
      userRegistrations,
      postsPerMonth,
      foundLostCounts,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
