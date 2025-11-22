import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

async function testPasswords() {
  try {
    await mongoose.connect('mongodb://localhost:27017/property-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Conectado a MongoDB');
    
    // Obtener el usuario alfredo.gomez
    const user = await User.findOne({ username: 'alfredo.gomez' });
    if (!user) {
      console.log('Usuario alfredo.gomez no encontrado');
      return;
    }
    
    console.log('Usuario encontrado:', user.username);
    console.log('Hash de contraseña:', user.password);
    
    // Probar contraseñas comunes
    const commonPasswords = [
      'password',
      'password123',
      '123456',
      'admin',
      'alfredo',
      'gomez',
      'alfredo.gomez',
      '12345678',
      'qwerty',
      'abc123'
    ];
    
    console.log('\nProbando contraseñas comunes...');
    
    for (const password of commonPasswords) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        console.log(`✅ Contraseña encontrada: "${password}"`);
        break;
      } else {
        console.log(`❌ "${password}" - No coincide`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testPasswords();