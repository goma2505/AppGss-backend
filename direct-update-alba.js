import mongoose from 'mongoose';
import User from './models/User.js';

async function directUpdateAlba() {
  try {
    await mongoose.connect('mongodb://localhost:27017/property-management');
    console.log('Conectado a MongoDB');

    // Actualizar directamente usando updateOne
    const updates = [
      { identifier: 'guardias@gmail.com', field: 'email' },
      { identifier: 'guardia.del.alba', field: 'username' },
      { identifier: 'reside@prueba.co', field: 'email' }
    ];

    for (const update of updates) {
      const query = {};
      query[update.field] = update.identifier;
      
      console.log(`\nBuscando usuario por ${update.field}: ${update.identifier}`);
      
      const user = await User.findOne(query);
      if (user) {
        console.log(`Usuario encontrado: ${user.email || user.username} (${user.role})`);
        
        if (user.role === 'guardia' || user.role === 'residente') {
          const result = await User.updateOne(
            query,
            { $set: { subdivision: 'alba' } }
          );
          
          console.log(`Resultado de actualización:`, result);
          
          if (result.modifiedCount > 0) {
            console.log(`✓ Usuario ${update.identifier} asignado al fraccionamiento "alba"`);
          } else {
            console.log(`⚠ No se pudo actualizar ${update.identifier}`);
          }
        } else {
          console.log(`⚠ Usuario ${update.identifier} tiene rol ${user.role}, no se actualiza`);
        }
      } else {
        console.log(`✗ Usuario ${update.identifier} no encontrado`);
      }
    }

    // Verificación final con await
    console.log('\n=== VERIFICACIÓN FINAL ===');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
    
    const albaUsers = await User.find({ subdivision: 'alba' });
    console.log(`Usuarios en fraccionamiento "alba": ${albaUsers.length}`);
    
    for (const user of albaUsers) {
      console.log(`- ${user.email || user.username} (${user.role}) - Fraccionamiento: ${user.subdivision}`);
    }

    await mongoose.connection.close();
    console.log('\nConexión cerrada');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

directUpdateAlba();