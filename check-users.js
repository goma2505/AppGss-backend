import mongoose from 'mongoose';
import User from './models/User.js';

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/property-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Conectado a MongoDB');
    
    const users = await User.find({});
    console.log(`Total de usuarios encontrados: ${users.length}`);
    
    users.forEach((user, index) => {
      console.log(`\n--- Usuario ${index + 1} ---`);
      console.log(`ID: ${user._id}`);
      console.log(`Nombre: ${user.name}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Rol: ${user.role}`);
      console.log(`ServiceCode: ${user.serviceCode}`);
      console.log(`Password hash: ${user.password ? user.password.substring(0, 20) + '...' : 'No password'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkUsers();