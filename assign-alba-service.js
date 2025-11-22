import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/appgss';

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const assignAlbaService = async () => {
  await connectDB();

  const guardUsernames = [
    'narciso.hernandez.delangel',
    'karen.lara.sanchez',
    'citlali.rocha.lara',
    'luis.ramirez.saldana'
  ];

  try {
    for (const username of guardUsernames) {
      const user = await User.findOne({ username: username });
      if (user) {
        // Ensure serviceCodes array exists for guard users
        if (!Array.isArray(user.serviceCodes)) {
          user.serviceCodes = [];
        }
        if (!user.serviceCodes.includes('ALBA')) {
          user.serviceCodes.push('ALBA');
          await user.save();
          console.log(`Service 'ALBA' assigned to ${username}`);
        } else {
          console.log(`User ${username} already has 'ALBA' service`);
        }
      } else {
        console.log(`User ${username} not found.`);
      }
    }
  } catch (error) {
    console.error('Error assigning service:', error);
  }

  mongoose.connection.close();
};

assignAlbaService();