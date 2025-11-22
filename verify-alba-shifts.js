import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Service from './models/Service.js';
import User from './models/User.js';
import Shift from './models/Shift.js';

dotenv.config({ path: 'server/.env' });
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/appgss';

async function main() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');

    const albaService = await Service.findOne({ serviceId: 'ALBA' });
    if (!albaService) {
      console.error('ALBA service not found');
      process.exit(1);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);

    const shifts = await Shift.find({
      serviceId: albaService._id,
      shiftDate: { $gte: today, $lt: endDate }
    }).populate('userId', 'username name').sort({ shiftDate: 1 });

    console.log(`Total ALBA shifts in next 7 days: ${shifts.length}`);

    const grouped = {};
    shifts.forEach(shift => {
      const ds = new Date(shift.shiftDate);
      ds.setHours(0, 0, 0, 0);
      const key = ds.toISOString().slice(0, 10);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(shift);
    });

    const days = Object.keys(grouped).sort();
    days.forEach(day => {
      const dayShifts = grouped[day];
      const guards = dayShifts.map(s => s.userId?.username || String(s.userId));
      console.log(`${day}: ${dayShifts.length} shifts -> ${guards.join(', ')}`);
    });

    let allGood = true;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const count = grouped[key]?.length || 0;
      if (count !== 2) {
        allGood = false;
        console.warn(`Warning: ${key} has ${count} shifts (expected 2).`);
      }
    }

    if (allGood) console.log('✅ Requirement satisfied: 2 guards on duty each day.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error verifying shifts:', err);
    process.exit(1);
  }
}

main();