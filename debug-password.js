import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const mongoUri = 'mongodb://localhost:27017/appgss';

async function debugPassword() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Conectado a MongoDB local');
    
    const identifier = 'karem.lara.s';
    let user = await User.findOne({ $or: [ { username: identifier }, { email: identifier } ] });
    if (!user) {
      user = new User({ name: 'Karem Lara', username: identifier, role: 'guardia', password: 'guardia1234', serviceCode: 'ALBA', isActive: true });
      await user.save();
      console.log('Creado usuario:', identifier);
    }
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      process.exit(1);
    }
    
    console.log('✅ Usuario encontrado:', {
      username: user.username,
      email: user.email,
      passwordHash: user.password
    });
    
    // Probar la contraseña
    const testPassword = 'Prueba1234';
    console.log('\n🔍 Probando contraseña:', testPassword);
    
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log('Resultado de bcrypt.compare:', isMatch);
    
    // Reestablecer contraseña
    user.password = testPassword;
    await user.save();
    console.log('Contraseña reestablecida');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugPassword();