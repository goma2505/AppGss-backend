import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

async function verifyAdminPassword() {
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
    
    console.log('Usuario admin encontrado:');
    console.log('- Username:', adminUser.username);
    console.log('- Email:', adminUser.email);
    console.log('- Password hash:', adminUser.password);
    
    // Test password verification
    const testPassword = 'admin1234';
    const isMatch = await bcrypt.compare(testPassword, adminUser.password);
    console.log('\nVerificación de contraseña:');
    console.log('- Contraseña de prueba:', testPassword);
    console.log('- ¿Coincide?:', isMatch);
    
    // Generate new hash for comparison
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(testPassword, salt);
    console.log('\nNuevo hash generado:', newHash);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error verificando contraseña:', error);
    process.exit(1);
  }
}

verifyAdminPassword();