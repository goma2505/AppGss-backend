import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

async function fixAdminPassword() {
  try {
    const mongoUri = 'mongodb://localhost:27017/appgss';
    await mongoose.connect(mongoUri);
    console.log('Conectado a MongoDB Atlas');
    
    // Find admin user
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('Usuario admin no encontrado');
      process.exit(1);
    }
    
    console.log('Usuario admin encontrado:', adminUser.username, adminUser.email);
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin1234', salt);
    
    // Update password
    adminUser.password = hashedPassword;
    await adminUser.save();
    
    console.log('✅ Contraseña del usuario admin actualizada exitosamente!');
    console.log('Credenciales: admin / admin1234');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error actualizando contraseña:', error);
    process.exit(1);
  }
}

fixAdminPassword();