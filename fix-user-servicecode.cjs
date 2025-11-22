const mongoose = require('mongoose');

// Conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/property-management');
    console.log('MongoDB conectado exitosamente');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Definir el esquema de User
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'guard', 'resident', 'administrador', 'guardia', 'residente'], required: true },
  serviceCode: { type: String, uppercase: true },
  street: String,
  number: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// Función para verificar y corregir usuarios sin serviceCode
const fixUserServiceCodes = async () => {
  try {
    console.log('🔍 Verificando usuarios sin serviceCode...');
    
    // Buscar todos los usuarios
    const allUsers = await User.find({});
    console.log(`📊 Total de usuarios encontrados: ${allUsers.length}`);
    
    // Filtrar usuarios sin serviceCode (excluyendo administradores)
    const usersWithoutServiceCode = allUsers.filter(user => 
      !user.serviceCode && user.role !== 'admin' && user.role !== 'administrador'
    );
    
    console.log(`\n⚠️  Usuarios sin serviceCode (excluyendo admins): ${usersWithoutServiceCode.length}`);
    
    if (usersWithoutServiceCode.length > 0) {
      console.log('\n📋 Usuarios sin serviceCode:');
      usersWithoutServiceCode.forEach(user => {
        console.log(`  - ${user.username} (${user.role}) - ID: ${user._id}`);
      });
      
      // Asignar serviceCode por defecto basado en el rol
      for (const user of usersWithoutServiceCode) {
        let defaultServiceCode = 'ALBA'; // Código por defecto
        
        // Si es guardia, asignar ALBA
        if (user.role === 'guardia' || user.role === 'guard') {
          defaultServiceCode = 'ALBA';
        }
        // Si es residente, podríamos necesitar más información
        else if (user.role === 'residente' || user.role === 'resident') {
          defaultServiceCode = 'ALBA'; // Por ahora usar ALBA como defecto
        }
        // Si es manager, usar ALBA
        else if (user.role === 'manager') {
          defaultServiceCode = 'ALBA';
        }
        
        user.serviceCode = defaultServiceCode;
        await user.save();
        
        console.log(`  ✅ Actualizado ${user.username}: serviceCode = ${defaultServiceCode}`);
      }
    }
    
    // Mostrar resumen final
    console.log('\n📊 Resumen final de usuarios por rol y serviceCode:');
    const usersByRole = {};
    const finalUsers = await User.find({});
    
    finalUsers.forEach(user => {
      const key = `${user.role} - ${user.serviceCode || 'SIN_CODIGO'}`;
      if (!usersByRole[key]) {
        usersByRole[key] = 0;
      }
      usersByRole[key]++;
    });
    
    Object.keys(usersByRole).forEach(key => {
      console.log(`  ${key}: ${usersByRole[key]} usuarios`);
    });
    
    console.log('\n🎉 Corrección de serviceCode completada!');
    
  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  }
};

// Ejecutar el script
const main = async () => {
  await connectDB();
  await fixUserServiceCodes();
  await mongoose.connection.close();
  console.log('\n🔌 Conexión a la base de datos cerrada.');
  process.exit(0);
};

main();