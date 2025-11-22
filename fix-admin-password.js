import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

async function fixAdminPassword() {
  try {
    await mongoose.connect('mongodb+srv://goma2505_db_user:2505Dell@gssapp.mezmxc8.mongodb.net/property-management?retryWrites=true&w=majority&appName=GSSAPP', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Conectado a MongoDB Atlas');
    
    // Buscar el usuario admin
    const user = await User.findOne({ username: 'admin' });
    
    if (!user) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }
    
    console.log('✅ Usuario admin encontrado');
    
    // Nueva contraseña
    const newPassword = 'admin123';
    
    // Generar hash de la nueva contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('Nueva contraseña hasheada:', hashedPassword);
    
    // Actualizar la contraseña
    await User.updateOne(
      { username: 'admin' },
      { password: hashedPassword }
    );
    
    console.log('✅ Contraseña actualizada exitosamente');
    
    // Verificar que la nueva contraseña funciona
    const updatedUser = await User.findOne({ username: 'admin' });
    const isMatch = await bcrypt.compare(newPassword, updatedUser.password);
    
    console.log('Verificación de nueva contraseña:', isMatch ? '✅ Correcta' : '❌ Error');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB Atlas');
  }
}

fixAdminPassword();