import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/appgss';

function normalizeName(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function buildUsername(fullName) {
  const clean = normalizeName(fullName);
  const connectors = new Set(['de','del','la','las','los','y']);
  const parts = clean.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || '';
  // Apellido materno: última palabra que no sea conector
  let idx = parts.length - 1;
  while (idx >= 0 && connectors.has(parts[idx])) idx--;
  const apellido2Word = parts[idx] || '';
  const inicial2 = apellido2Word.slice(0, 1);
  // Apellido paterno: palabra anterior a apellido2 que no sea conector
  let j = idx - 1;
  while (j > 0 && connectors.has(parts[j])) j--;
  const apellido1Word = parts[j] || parts[1] || '';
  return `${firstName}.${apellido1Word}.${inicial2}`;
}

async function createNewGuards() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('Conectado a MongoDB');

    // Eliminar cuentas de prueba (incluyendo alba)
    const deleteResult = await User.deleteMany({
      $or: [
        { username: /prueba/i },
        { email: /prueba/i },
        { username: /\.alba$/i },
        { email: /@gss\.com$/i },
        { username: { $in: ['narciso.hernandez.appgss','karem.sarahi.s','citlali.sarahi.l','luis.angel.s'] } }
      ]
    });
    console.log(`Cuentas de prueba eliminadas: ${deleteResult.deletedCount}`);

    const rawNames = [
      'Narciso Hernandez del Angel',
      'Karem Sarahi Lara Sanchez',
      'Citlali Sarahi Rocha Lara',
      'Luis Angel Ramirez Saldana'
    ];

    const users = rawNames.map((full) => {
      const username = buildUsername(full);
      const email = `${username}@appgss.com`;
      return {
        name: full,
        username,
        email,
        password: 'Prueba1234',
        role: 'guardia',
        serviceCode: undefined,
        accessCode: undefined,
        serviceCodes: []
      };
    });

    for (const userData of users) {
      const existing = await User.findOne({ username: userData.username });
      if (existing) {
        console.log(`Usuario ya existe, se omite: ${userData.username}`);
        continue;
      }
      const user = new User({
        name: userData.name,
        username: userData.username,
        email: userData.email,
        password: userData.password, // será hasheada por el middleware del modelo
        role: userData.role,
        serviceCodes: userData.serviceCodes
      });

      await user.save();
      console.log(`Usuario creado: ${userData.username}`);
    }

    console.log('\n✅ Nuevos guardias creados exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createNewGuards();