import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const checkAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/findme');
    console.log('Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminUser = await User.findOne({ email: adminEmail });

    if (adminUser) {
      console.log('Admin user found:', adminUser);
    } else {
      console.log('Admin user not found');
    }
  } catch (error) {
    console.error('Error checking admin user:', error);
  } finally {
    mongoose.connection.close();
  }
};

checkAdminUser();
