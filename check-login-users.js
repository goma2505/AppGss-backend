import mongoose from 'mongoose';
import User from './models/User.js';

// Probar diferentes URLs de conexión
const atlasUri = 'mongodb+srv://eneriramos:2505Dell@cluster0.ggqhb.mongodb.net/appgss?retryWrites=true&w=majority&appName=Cluster0';
const alternativeUri = 'mongodb+srv://eneriramos:2505Dell@cluster0.ggqhb.mongodb.net/appgss';

async function checkAtlasConnection() {
  console.log('Probando conexión a MongoDB Atlas...');
  
  try {
    console.log('\nIntentando con URI principal...');
    await mongoose.connect(atlasUri);
    console.log('✅ Conectado a MongoDB Atlas exitosamente!');
    
    const users = await User.find({});
    console.log(`\nUsuarios encontrados en Atlas: ${users.length}`);
    
    if (users.length > 0) {
      console.log('\n📋 Usuarios existentes:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.email}) - Role: ${user.role}`);
      });
    } else {
      console.log('\n⚠️  No hay usuarios en MongoDB Atlas');
    }
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error con URI principal:', error.message);
    
    try {
      console.log('\nIntentando con URI alternativa...');
      await mongoose.connect(alternativeUri);
      console.log('✅ Conectado con URI alternativa!');
      
      const users = await User.find({});
      console.log(`\nUsuarios encontrados: ${users.length}`);
      
      if (users.length > 0) {
        users.forEach((user, index) => {
          console.log(`${index + 1}. ${user.username} (${user.email}) - Role: ${user.role}`);
        });
      }
      
      await mongoose.disconnect();
      process.exit(0);
      
    } catch (error2) {
      console.error('❌ Error con URI alternativa:', error2.message);
      console.log('\n🔍 Posibles soluciones:');
      console.log('1. Verificar que el cluster esté activo');
      console.log('2. Verificar las credenciales');
      console.log('3. Verificar la configuración de red/firewall');
      process.exit(1);
    }
  }
}

checkAtlasConnection();