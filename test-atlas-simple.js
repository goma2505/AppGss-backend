import mongoose from 'mongoose';
import User from './models/User.js';
import fs from 'fs';

// Probar diferentes formatos de URI
const uris = [
  'mongodb+srv://eneriramos:2505Dell@cluster0.ggqhb.mongodb.net/appgss',
  'mongodb://eneriramos:2505Dell@cluster0-shard-00-00.ggqhb.mongodb.net:27017,cluster0-shard-00-01.ggqhb.mongodb.net:27017,cluster0-shard-00-02.ggqhb.mongodb.net:27017/appgss?ssl=true&replicaSet=atlas-default-shard-0&authSource=admin&retryWrites=true&w=majority',
  'mongodb://eneriramos:2505Dell@ac-jnqzqhm-shard-00-00.ggqhb.mongodb.net:27017,ac-jnqzqhm-shard-00-01.ggqhb.mongodb.net:27017,ac-jnqzqhm-shard-00-02.ggqhb.mongodb.net:27017/appgss?ssl=true&replicaSet=atlas-default-shard-0&authSource=admin&retryWrites=true&w=majority'
];

async function testAtlas() {
  let output = 'Probando diferentes URIs de MongoDB Atlas...\n\n';
  
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    output += `Probando URI ${i + 1}:\n`;
    output += `${uri.substring(0, 50)}...\n`;
    
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      output += '✅ Conectado exitosamente!\n';
      
      const users = await User.find({});
      output += `Usuarios encontrados: ${users.length}\n\n`;
      
      if (users.length > 0) {
        output += 'Usuarios existentes:\n';
        users.forEach((user, index) => {
          output += `${index + 1}. Username: ${user.username}\n`;
          output += `   Email: ${user.email}\n`;
          output += `   Role: ${user.role}\n\n`;
        });
      }
      
      await mongoose.disconnect();
      break; // Si funciona, salir del loop
      
    } catch (error) {
      output += `❌ Error: ${error.message}\n\n`;
      try {
        await mongoose.disconnect();
      } catch (e) {}
    }
  }
  
  // Escribir resultado a archivo
  fs.writeFileSync('atlas-test-result.txt', output);
  console.log('Resultado guardado en atlas-test-result.txt');
  console.log(output);
}

testAtlas();