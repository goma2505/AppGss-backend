import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

async function updateAdminPasswordDirect() {
  try {
    const mongoUri = 'mongodb://localhost:27017/appgss';
    await mongoose.connect(mongoUri);
    console.log('Conectado a MongoDB local');
    
    // Find admin user
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('Usuario admin no encontrado');
      process.exit(1);
    }
    
    console.log('Usuario admin encontrado:', adminUser.username);
    
    // Generate new hash with salt 10 (same as bcryptjs default)
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash('admin1234', salt);
    
    console.log('Nuevo hash generado:', newHashedPassword);
    
    // Update using direct MongoDB update
    const result = await User.updateOne(
      { username: 'admin' },
      { $set: { password: newHashedPassword } }
    );
    
    console.log('Resultado de actualización:', result);
    
    // Verify the update
    const updatedUser = await User.findOne({ username: 'admin' });
    const isMatch = await bcrypt.compare('admin1234', updatedUser.password);
    
    console.log('\nVerificación después de actualización:');
    console.log('- Nuevo hash en BD:', updatedUser.password);
    console.log('- ¿Contraseña coincide?:', isMatch);
    
    if (isMatch) {
      console.log('✅ Contraseña actualizada exitosamente!');
    } else {
      console.log('❌ Error: La contraseña aún no coincide');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error actualizando contraseña:', error);
    process.exit(1);
  }
}

updateAdminPasswordDirect();