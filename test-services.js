import mongoose from 'mongoose';
import Service from './models/Service.js';

// Conectar a MongoDB Atlas
mongoose.connect('mongodb+srv://goma2505_db_user:2505Dell@gssapp.mezmxc8.mongodb.net/property-management?retryWrites=true&w=majority&appName=GSSAPP', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB connected');
  
  // Verificar si hay servicios
  const services = await Service.find({});
  console.log('Servicios existentes:', services.length);
  
  if (services.length === 0) {
    console.log('No hay servicios, creando servicios de prueba...');
    
    const testServices = [
      {
        serviceId: 'ALBA',
        name: 'alba',
        displayName: 'Alba',
        description: 'Fraccionamiento residencial Alba',
        isActive: true
      },
      {
        serviceId: 'PRIVANZA',
        name: 'privanza',
        displayName: 'Privanza',
        description: 'Fraccionamiento Privanza',
        isActive: true
      },
      {
        serviceId: 'CARTAGENA',
        name: 'cartagena',
        displayName: 'Cartagena',
        description: 'Fraccionamiento Cartagena',
        isActive: true
      },
      {
        serviceId: 'SANJULIAN1',
        name: 'san-julian-1',
        displayName: 'San Julian 1',
        description: 'Fraccionamiento San Julian 1',
        isActive: true
      },
      {
        serviceId: 'CASASYES',
        name: 'casas-yes',
        displayName: 'Casas Yes',
        description: 'Fraccionamiento Casas Yes',
        isActive: true
      }
    ];
    
    for (const serviceData of testServices) {
      const service = new Service(serviceData);
      await service.save();
      console.log(`Servicio creado: ${service.displayName}`);
    }
  } else {
    console.log('Servicios encontrados:');
    services.forEach(service => {
      console.log(`- ${service.displayName} (${service.serviceId}) - Activo: ${service.isActive}`);
    });
  }
  
  // Probar el método getAllActiveServices
  const activeServices = await Service.getAllActiveServices();
  console.log('\nServicios activos:', activeServices);
  
  process.exit(0);
})
.catch(err => {
  console.error('Error:', err);
  process.exit(1);
});