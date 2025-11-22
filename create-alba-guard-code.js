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

// Crear código específico para guardias de Alba
const createAlbaGuardCode = async () => {
  try {
    // Buscar el servicio Alba
    const albaService = await Service.findByServiceId('ALBA');
    
    if (!albaService) {
      console.error('Servicio Alba no encontrado');
      return;
    }
    
    // Código específico para guardias de Alba
    const albaGuardCode = 'GRD-ALBA-001';
    
    // Verificar si ya existe el código
    const existingCode = albaService.accessCodes.find(ac => ac.code === albaGuardCode);
    
    if (!existingCode) {
      // Agregar el código específico para guardias de Alba
      albaService.addAccessCode('guardia', albaGuardCode);
      await albaService.save();
      console.log(`Código específico para guardias de Alba creado: ${albaGuardCode}`);
    } else {
      console.log(`El código ${albaGuardCode} ya existe para Alba`);
    }
    
    // Mostrar todos los códigos de acceso de Alba
    console.log('\nCódigos de acceso para Alba:');
    albaService.accessCodes.forEach(code => {
      if (code.isActive) {
        console.log(`- ${code.role}: ${code.code}`);
      }
    });
    
  } catch (error) {
    console.error('Error creando código de Alba:', error);
  }
};

// Ejecutar
const main = async () => {
  await connectDB();
  await createAlbaGuardCode();
  await mongoose.connection.close();
  console.log('\nProceso completado. Base de datos cerrada.');
  process.exit(0);
};

main();