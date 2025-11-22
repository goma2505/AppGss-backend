import mongoose from 'mongoose';
import Service from './models/Service.js';

const checkServices = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/gss-app');
    console.log('Conectado a MongoDB');
    
    const services = await Service.find({}, 'serviceId displayName isActive');
    console.log('\nServicios en la base de datos:');
    console.log('================================');
    
    if (services.length === 0) {
      console.log('No hay servicios en la base de datos');
    } else {
      services.forEach(service => {
        console.log(`- ${service.serviceId}: ${service.displayName} (${service.isActive ? 'Activo' : 'Inactivo'})`);
      });
    }
    
    console.log(`\nTotal de servicios: ${services.length}`);
    
    // Verificar servicios específicos mencionados
    const expectedServices = ['ALBA', 'PRIVANZA', 'CASASYES'];
    console.log('\nVerificando servicios específicos:');
    expectedServices.forEach(serviceId => {
      const found = services.find(s => s.serviceId === serviceId);
      if (found) {
        console.log(`✓ ${serviceId}: ${found.displayName} - ${found.isActive ? 'Activo' : 'Inactivo'}`);
      } else {
        console.log(`✗ ${serviceId}: NO ENCONTRADO`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

checkServices();