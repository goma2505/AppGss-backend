import mongoose from 'mongoose';
import User from './models/User.js';

async function updateAlbaUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/property-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Conectado a MongoDB');

    // Buscar usuarios por email o username
    const userIdentifiers = [
      'guardia.prueba.alba',
      'guardia.del.alba', 
      'Reside.alba.prueba'
    ];

    console.log('Buscando usuarios...');
    
    for (const identifier of userIdentifiers) {
      const user = await User.findOne({
        $or: [
          { email: identifier },
          { username: identifier }
        ]
      });

      if (user) {
        console.log(`Usuario encontrado: ${user.email || user.username}, Rol: ${user.role}, Fraccionamiento actual: ${user.subdivision || 'ninguno'}`);
        
        // Asignar fraccionamiento "alba" según el rol
        if (user.role === 'guardia' || user.role === 'residente') {
          user.subdivision = 'alba';
          await user.save();
          console.log(`✓ Usuario ${user.email || user.username} asignado al fraccionamiento "alba"`);
        } else {
          console.log(`⚠ Usuario ${user.email || user.username} tiene rol ${user.role}, no se asignó fraccionamiento`);
        }
      } else {
        console.log(`✗ Usuario ${identifier} no encontrado`);
      }
    }

    console.log('\nProceso completado');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateAlbaUsers();