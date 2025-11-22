import mongoose from 'mongoose';
import Service from './models/Service.js';

const MONGODB_URI = 'mongodb+srv://eneriramos:Eneri2024@cluster0.wnqzd.mongodb.net/appgss?retryWrites=true&w=majority';

async function testConnection() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB exitosamente');
    
    console.log('\nProbando getAllActiveServices...');
    const services = await Service.getAllActiveServices();
    console.log('Servicios encontrados:', services.length);
    
    if (services.length === 0) {
      console.log('\nNo hay servicios, inicializando...');
      await Service.initializeServices();
      console.log('✅ Servicios inicializados');
      
      console.log('\nProbando getAllActiveServices nuevamente...');
      const newServices = await Service.getAllActiveServices();
      console.log('Servicios después de inicializar:', newServices.length);
      console.log('Servicios:', JSON.stringify(newServices, null, 2));
    } else {
      console.log('Servicios existentes:', JSON.stringify(services, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
    process.exit(0);
  }
}

testConnection();