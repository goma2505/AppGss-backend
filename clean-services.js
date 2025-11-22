import mongoose from 'mongoose';
import Service from './models/Service.js';

// Conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/appgss', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB conectado');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Limpiar servicios incorrectos
const cleanServices = async () => {
  try {
    // Servicios incorrectos que deben eliminarse
    const incorrectServices = [
      'MOUNTAIN',
      'OCEANVIEW', 
      'SUNSET',
      'MOUNTAIN_RESIDENCES',
      'OCEAN_VIEW',
      'SUNSET_HILLS'
    ];
    
    console.log('Eliminando servicios incorrectos...');
    
    // Eliminar servicios incorrectos
    for (const serviceId of incorrectServices) {
      const result = await Service.deleteOne({ serviceId: serviceId });
      if (result.deletedCount > 0) {
        console.log(`Servicio eliminado: ${serviceId}`);
      }
    }
    
    // También eliminar por nombre si existen
    const incorrectNames = [
      'mountain-residences',
      'ocean-view', 
      'sunset-hills'
    ];
    
    for (const name of incorrectNames) {
      const result = await Service.deleteOne({ name: name });
      if (result.deletedCount > 0) {
        console.log(`Servicio eliminado por nombre: ${name}`);
      }
    }
    
    console.log('Limpieza completada');
    
    // Reinicializar servicios correctos
    console.log('Reinicializando servicios correctos...');
    await Service.initializeServices();
    console.log('Servicios reinicializados correctamente');
    
    // Mostrar servicios actuales
    const services = await Service.find({}, 'serviceId displayName isActive');
    console.log('\nServicios actuales en la base de datos:');
    services.forEach(service => {
      console.log(`- ${service.serviceId}: ${service.displayName} (Activo: ${service.isActive})`);
    });
    
  } catch (error) {
    console.error('Error limpiando servicios:', error);
  }
};

// Ejecutar limpieza
const main = async () => {
  await connectDB();
  await cleanServices();
  await mongoose.connection.close();
  console.log('\nProceso completado. Base de datos cerrada.');
  process.exit(0);
};

main();