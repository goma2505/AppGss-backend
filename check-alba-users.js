import mongoose from 'mongoose';
import User from './models/User.js';

async function checkAlbaUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/property-management');
    console.log('Conectado a MongoDB');

    // Buscar todos los usuarios del fraccionamiento alba
    const albaUsers = await User.find({ subdivision: 'alba' });
    
    console.log(`\nUsuarios en el fraccionamiento "alba": ${albaUsers.length}`);
    console.log('=' .repeat(50));
    
    albaUsers.forEach((user, index) => {
      console.log(`${index + 1}. Email/Username: ${user.email || user.username}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Fraccionamiento: ${user.subdivision}`);
      console.log(`   Nombre: ${user.name || 'No especificado'}`);
      console.log('---');
    });

    if (albaUsers.length === 0) {
      console.log('No se encontraron usuarios en el fraccionamiento "alba"');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAlbaUsers();