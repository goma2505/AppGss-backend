import mongoose from 'mongoose';
import User from './models/User.js';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

async function testAtlasConnection() {
  try {
    console.log('Conectando a MongoDB Atlas...');

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI no está definido en variables de entorno');
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 5,
      minPoolSize: 1,
      retryWrites: true
    });
    
    console.log('✅ Conexión exitosa a MongoDB Atlas');
    
    // Verificar si hay usuarios en la base de datos
    const userCount = await User.countDocuments();
    console.log(`📊 Número de usuarios en la base de datos: ${userCount}`);
    
    if (userCount === 0) {
      console.log('⚠️  La base de datos está vacía. Creando usuario de prueba...');
      
      // Crear usuario de prueba
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.default.genSalt(10);
      const hashedPassword = await bcrypt.default.hash('admin123', salt);
      
      const testUser = new User({
        name: 'Administrador',
        username: 'admin',
        email: 'admin@gss.com',
        password: hashedPassword,
        role: 'admin',
        serviceCode: 'GSS001',
        accessCode: 'ADMIN001'
      });
      
      await testUser.save();
      console.log('✅ Usuario de prueba creado: admin / admin123');
    } else {
      // Mostrar algunos usuarios existentes
      const users = await User.find({}, 'name username email role').limit(5);
      console.log('\n👥 Usuarios existentes:');
      users.forEach(user => {
        console.log(`- ${user.name} (${user.username}) - ${user.role}`);
      });
    }
    
    console.log('\n🎉 MongoDB Atlas está funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error al conectar con MongoDB Atlas:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('💡 Verifica las credenciales de la base de datos');
    } else if (error.message.includes('network')) {
      console.error('💡 Verifica la conexión a internet y la configuración de red');
    }
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testAtlasConnection();