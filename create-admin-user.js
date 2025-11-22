import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

async function createAdminUser() {
  try {
    const mongoUri = 'mongodb+srv://eneriramos:Eneri2024@cluster0.ixqhm.mongodb.net/appgss?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('Conectado a MongoDB');
    
    // Eliminar usuario admin existente si existe
    await User.deleteOne({ username: 'admin' });
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin1234', salt);
    
    // Create admin user
    const adminUser = new User({
      name: 'Administrador',
      username: 'admin',
      email: 'admin@appgss.com',
      password: hashedPassword,
      role: 'admin',
      serviceCode: 'ADMIN',
      accessCode: 'ADMIN-ACCESS-2024'
    });
    
    await adminUser.save();
    console.log('✅ Usuario admin creado exitosamente!');
    console.log('Credenciales: admin@appgss.com / admin1234');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error creando usuario admin:', error);
    process.exit(1);
  }
}

createAdminUser();