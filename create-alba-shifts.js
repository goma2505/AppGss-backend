import mongoose from 'mongoose';
import User from './models/User.js';
import Service from './models/Service.js';
import Shift from './models/Shift.js';
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
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const createAlbaShifts = async () => {
  await connectDB();

  try {
    const albaService = await Service.findOne({ serviceId: 'ALBA' });
    if (!albaService) {
      console.log('Service ALBA not found');
      mongoose.connection.close();
      return;
    }

    let guards = await User.find({ username: { $in: [
      'narciso.hernandez.delangel',
      'karen.lara.sanchez',
      'citlali.rocha.lara',
      'luis.ramirez.saldana'
    ]}});

    if (guards.length < 4) {
      console.log('Fallback: selecting available ALBA guards');
      guards = await User.find({ role: 'guardia', serviceCodes: { $in: ['ALBA'] } }).limit(4);
    }

    if (guards.length === 0) {
      console.log('No ALBA guards found');
      mongoose.connection.close();
      return;
    }

    const [guard1, guard2, guard3, guard4] = guards;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 3; i++) {
      const shiftDate = new Date(today);
      shiftDate.setDate(today.getDate() + i);

      const shiftStart = new Date(shiftDate);
      shiftStart.setHours(7, 0, 0, 0); // 7 AM

      const shiftEnd = new Date(shiftStart);
      shiftEnd.setHours(shiftStart.getHours() + 24);

      if (i % 2 === 0) {
        await createShift(guard1._id, albaService._id, shiftStart, shiftEnd);
        if (guard2) await createShift(guard2._id, albaService._id, shiftStart, shiftEnd);
      } else {
        await createShift((guard3 || guard1)._id, albaService._id, shiftStart, shiftEnd);
        if (guard4) await createShift(guard4._id, albaService._id, shiftStart, shiftEnd);
      }
    }

  } catch (error) {
    console.error('Error creating shifts:', error);
  }

  mongoose.connection.close();
};

const createShift = async (userId, serviceId, startTime, endTime) => {
  const shift = new Shift({
    userId,
    serviceId,
    shiftDate: startTime,
    scheduledStartTime: startTime,
    scheduledEndTime: endTime,
  });
  await shift.save();
  console.log(`Created shift for user ${userId} on ${startTime.toDateString()}`);
};

createAlbaShifts();