import mongoose from 'mongoose';
import Service from './models/Service.js';

console.log('Iniciando prueba de servicios...');

async function debugServices() {
  try {
    console.log('1. Conectando a MongoDB Atlas...');
    await mongoose.connect('mongodb+srv://goma2505_db_user:2505Dell@gssapp.mezmxc8.mongodb.net/property-management?retryWrites=true&w=majority&appName=GSSAPP');
    console.log('✅ Conectado exitosamente');
    
    console.log('2. Consultando servicios activos...');
    const services = await Service.getAllActiveServices();
    console.log(`✅ Encontrados ${services.length} servicios activos`);
    
    if (services.length === 0) {
      console.log('3. No hay servicios, inicializando...');
      await Service.initializeServices();
      console.log('✅ Servicios inicializados');
      
      const newServices = await Service.getAllActiveServices();
      console.log(`✅ Ahora hay ${newServices.length} servicios`);
    }
    
    console.log('4. Listando servicios:');
    const allServices = await Service.getAllActiveServices();
    allServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.serviceId} - ${service.displayName}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('5. Cerrando conexión...');
    await mongoose.connection.close();
    console.log('✅ Conexión cerrada');
    process.exit(0);
  }
}

debugServices();