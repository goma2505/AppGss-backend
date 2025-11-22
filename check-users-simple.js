import mongoose from 'mongoose';
import User from './models/User.js';

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/appgss');
    console.log('Conectado a MongoDB');
    
    const users = await User.find({}, 'username email role serviceCode isActive').lean();
    console.log(`Total de usuarios: ${users.length}`);
    
    users.forEach(user => {
      console.log(`- Username: ${user.username}, Email: ${user.email || 'N/A'}, Role: ${user.role}, Service: ${user.serviceCode || 'N/A'}, Active: ${user.isActive}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();