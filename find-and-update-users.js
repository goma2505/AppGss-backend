import mongoose from 'mongoose';
import User from './models/User.js';

async function findAndUpdateUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/property-management');
    console.log('Conectado a MongoDB');

    // Primero, buscar todos los usuarios para ver qué tenemos
    console.log('\n=== TODOS LOS USUARIOS ===');
    const allUsers = await User.find({});
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email || 'N/A'} | Username: ${user.username || 'N/A'} | Rol: ${user.role} | Fraccionamiento: ${user.subdivision || 'ninguno'}`);
    });

    console.log('\n=== BUSCANDO USUARIOS ESPECÍFICOS ===');
    
    // Buscar usuarios que contengan "alba" en email o username
    const albaRelatedUsers = await User.find({
      $or: [
        { email: { $regex: 'alba', $options: 'i' } },
        { username: { $regex: 'alba', $options: 'i' } },
        { email: 'guardias@gmail.com' },
        { email: 'reside@prueba.co' }
      ]
    });

    console.log(`Usuarios relacionados con alba encontrados: ${albaRelatedUsers.length}`);
    
    for (const user of albaRelatedUsers) {
      console.log(`\nActualizando usuario: ${user.email || user.username}`);
      console.log(`Rol actual: ${user.role}`);
      console.log(`Fraccionamiento actual: ${user.subdivision || 'ninguno'}`);
      
      if (user.role === 'guardia' || user.role === 'residente') {
        user.subdivision = 'alba';
        await user.save();
        console.log(`✓ Asignado al fraccionamiento "alba"`);
      } else {
        console.log(`⚠ Rol ${user.role} no requiere asignación de fraccionamiento`);
      }
    }

    // Verificar los cambios
    console.log('\n=== VERIFICACIÓN FINAL ===');
    const updatedUsers = await User.find({ subdivision: 'alba' });
    console.log(`Usuarios en fraccionamiento "alba": ${updatedUsers.length}`);
    updatedUsers.forEach(user => {
      console.log(`- ${user.email || user.username} (${user.role})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findAndUpdateUsers();