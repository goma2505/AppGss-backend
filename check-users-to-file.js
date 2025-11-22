import mongoose from 'mongoose';
import User from './models/User.js';
import fs from 'fs';

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/property-management');
    let output = 'Conectado a MongoDB\n';
    
    const users = await User.find({});
    output += `Total de usuarios: ${users.length}\n`;
    
    users.forEach(user => {
      output += `- Username: ${user.username}, Email: ${user.email}, Name: ${user.name}\n`;
    });
    
    fs.writeFileSync('users-check-result.txt', output);
    console.log('Resultado guardado en users-check-result.txt');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    const errorOutput = `Error: ${error.message}\n${error.stack}`;
    fs.writeFileSync('users-check-result.txt', errorOutput);
    console.log('Error guardado en users-check-result.txt');
    process.exit(1);
  }
}

checkUsers();