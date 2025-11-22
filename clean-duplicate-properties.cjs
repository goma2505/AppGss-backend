const mongoose = require('mongoose');

// Conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/property-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB conectado exitosamente');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Definir el esquema de Property
const PropertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  housesCount: { type: Number, required: true },
  guardsCount: { type: Number, required: true, default: 0 },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  serviceId: { type: String, required: true, uppercase: true },
  createdAt: { type: Date, default: Date.now }
});

const Property = mongoose.model('Property', PropertySchema);

// Función para limpiar propiedades duplicadas
const cleanDuplicateProperties = async () => {
  try {
    console.log('🧹 Iniciando limpieza de propiedades duplicadas...');
    
    // Buscar todas las propiedades
    const allProperties = await Property.find({});
    console.log(`📊 Total de propiedades encontradas: ${allProperties.length}`);
    
    // Agrupar por serviceId
    const propertiesByService = {};
    allProperties.forEach(property => {
      if (!propertiesByService[property.serviceId]) {
        propertiesByService[property.serviceId] = [];
      }
      propertiesByService[property.serviceId].push(property);
    });
    
    console.log('\n📋 Propiedades por servicio:');
    Object.keys(propertiesByService).forEach(serviceId => {
      console.log(`  ${serviceId}: ${propertiesByService[serviceId].length} propiedades`);
      propertiesByService[serviceId].forEach(prop => {
        console.log(`    - ${prop.name} (ID: ${prop._id})`);
      });
    });
    
    // Limpiar duplicados para cada servicio
    for (const serviceId of Object.keys(propertiesByService)) {
      const properties = propertiesByService[serviceId];
      
      if (properties.length > 1) {
        console.log(`\n🔧 Limpiando duplicados para servicio ${serviceId}...`);
        
        // Mantener solo la propiedad principal (la primera o la que tenga "Área Principal" en el nombre)
        let mainProperty = properties.find(p => p.name.includes('Área Principal')) || properties[0];
        
        // Eliminar las demás propiedades
        const toDelete = properties.filter(p => p._id.toString() !== mainProperty._id.toString());
        
        for (const prop of toDelete) {
          console.log(`  ❌ Eliminando: ${prop.name} (ID: ${prop._id})`);
          await Property.findByIdAndDelete(prop._id);
        }
        
        // Asegurar que la propiedad principal tenga el nombre correcto
        if (!mainProperty.name.includes('Área Principal')) {
          mainProperty.name = `${serviceId} - Área Principal`;
          await mainProperty.save();
          console.log(`  ✏️  Renombrado a: ${mainProperty.name}`);
        }
        
        console.log(`  ✅ Mantenido: ${mainProperty.name} (ID: ${mainProperty._id})`);
      } else {
        console.log(`\n✅ Servicio ${serviceId} ya tiene solo una propiedad`);
      }
    }
    
    // Verificar resultado final
    const finalProperties = await Property.find({});
    console.log(`\n📊 Total de propiedades después de la limpieza: ${finalProperties.length}`);
    
    console.log('\n🎉 Limpieza completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
};

// Ejecutar el script
const main = async () => {
  await connectDB();
  await cleanDuplicateProperties();
  await mongoose.connection.close();
  console.log('\n🔌 Conexión a la base de datos cerrada.');
  process.exit(0);
};

main();