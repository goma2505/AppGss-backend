import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

async function resetPassword() {
  try {
    await mongoose.connect('mongodb://localhost:27017/property-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Conectado a MongoDB');
    
    // Nueva contraseña
    const newPassword = 'admin123';
    
    // Hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Actualizar contraseña para alfredo.gomez
    const result = await User.updateOne(
      { username: 'alfredo.gomez' },
      { password: hashedPassword }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Contraseña actualizada exitosamente para alfredo.gomez');
      console.log('Nueva contraseña: admin123');
      
      // Verificar que la nueva contraseña funciona
      const user = await User.findOne({ username: 'alfredo.gomez' });
      const isMatch = await bcrypt.compare(newPassword, user.password);
      
      if (isMatch) {
        console.log('✅ Verificación exitosa: La nueva contraseña funciona');
      } else {
        console.log('❌ Error: La nueva contraseña no funciona');
      }
    } else {
      console.log('❌ No se pudo actualizar la contraseña');
    }
    
    // También actualizar otros usuarios con contraseña conocida
    console.log('\nActualizando contraseñas para otros usuarios...');
    
    const users = await User.find({});
    for (const user of users) {
      if (user.username !== 'alfredo.gomez') {
        await User.updateOne(
          { _id: user._id },
          { password: hashedPassword }
        );
        console.log(`✅ Contraseña actualizada para: ${user.username}`);
      }
    }
    
    console.log('\n🔑 Todas las cuentas ahora tienen la contraseña: admin123');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

resetPassword();