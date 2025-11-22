import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
mongoose.set('strictQuery', true);

import User from './models/User.js';
import Service from './models/Service.js';
import Notice from './models/Notice.js';
import Attendance from './models/Attendance.js';
import AccessCode from './models/AccessCode.js';
import Shift from './models/Shift.js';
import auth, { authorize } from './middleware/auth.js';
import accessCodesRouter from './routes/accessCodes.js';
import shiftsRouter from './routes/shifts.js';
import schedulesRouter from './routes/schedules.js';
import attendanceRouter from './routes/attendance.js';
import panicNotificationsRouter from './routes/panicNotifications.js';
import panicAlertsRouter from './routes/panicAlerts.js';
import directoryRouter from './routes/directory.js';
import subdivisionsRouter from './routes/subdivisions.js';
import residentsRouter from './routes/residents.js';
import guardsRouter from './routes/guards.js';
import usersRouter from './routes/users.js';
import uniformsRouter from './routes/uniforms.js';
import payrollAdvancesRouter from './routes/payrollAdvances.js';
import metricsRouter from './routes/metrics.js';
import paymentsRouter from './routes/payments.js';
import communityServicesRouter from './routes/communityServices.js';
import propertiesRouter from './routes/properties.js';
import CommunityService from './models/CommunityService.js';
import AuditLog from './models/AuditLog.js';

const app = express();
const PORT = process.env.PORT || 5000;
const server = createServer(app);
const allowedOrigin = (process.env.CLIENT_URL || 'http://localhost:5173');
let ioInstance = null;

// CORS middleware con entorno
app.use((req, res, next) => {
  const isDev = (process.env.NODE_ENV || 'development') === 'development';
  const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
  res.header('Access-Control-Allow-Origin', isDev ? '*' : allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Middleware de logging para todas las peticiones
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
app.use((req, res, next) => {
  res.on('finish', async () => {
    try {
      if (req.user) {
        await AuditLog.create({
          userId: req.user.id || req.user._id,
          role: req.user.role,
          serviceCode: req.user.serviceCode,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });
      }
    } catch (_) {}
  });
  next();
});

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads/notices');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const base = path.basename(file.originalname);
    const sanitized = base
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
    cb(null, `${Date.now()}-${sanitized}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen, PDF y documentos'));
    }
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/access-codes', accessCodesRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/panic-notifications', panicNotificationsRouter);
app.use('/api/panic-alerts', panicAlertsRouter);
app.use('/api/subdivisions', subdivisionsRouter);
app.use('/api/residents', residentsRouter);
app.use('/api/guards', auth, guardsRouter); // Agregando middleware auth
app.use('/api/users', usersRouter);
app.use('/api/uniforms', uniformsRouter);
app.use('/api/payroll-advances', payrollAdvancesRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/directory', directoryRouter);
app.use('/api/community-services', communityServicesRouter);
app.use('/api/properties', propertiesRouter);

// Datos en memoria temporal (sin MongoDB)
let isMongoConnected = false;
const inMemoryUsers = [
  {
    _id: '1',
    username: 'admin',
    email: 'admin@gss.com',
    password: '$2b$10$BTK7jQlvq/CE7hXy0MmEPeQxe9cHGR5vYy7.FQ.wEjq1Nkf3p2raq', // password: admin123
    role: 'admin',
    isActive: true
  },
  {
    _id: '2',
    username: 'test',
    email: 'test@test.com',
    password: '$2b$10$XfizZc8WiafLEwsHVh3W6OUEjlfwgTJKwPz3Vgk2fWI2bXx.3PbDu', // password: password
    role: 'user',
    isActive: true
  },
  {
    _id: '3',
    username: 'admin.prueba',
    email: 'admin.prueba@gss.com',
    password: '$2b$10$v9voxy.M8Tg5CXGWm2fCr..ezrnz2O1Rn46LkAaFaB56LXJJ4KiUK',
    role: 'admin',
    isActive: true
  }
];
// Add temporary admin.alf for in-memory auth
inMemoryUsers.push({
  _id: '4',
  username: 'admin.alf',
  email: 'admin.alf@gss.com',
  password: '$2b$10$v9voxy.M8Tg5CXGWm2fCr..ezrnz2O1Rn46LkAaFaB56LXJJ4KiUK',
  role: 'administrador',
  serviceCode: 'ALBA',
  isActive: true
});

inMemoryUsers.push({ _id: '5', username: 'super.prueba', email: 'super.prueba@gss.com', password: 'super1234', role: 'supervisor', serviceCode: 'ALBA', isActive: true });
inMemoryUsers.push({ _id: '6', username: 'reside.alba', email: 'reside.alba@gss.com', password: 'reside1234', role: 'residente', serviceCode: 'ALBA', street: 'Calle Prueba', number: '123', isActive: true });
inMemoryUsers.push({ _id: '7', username: 'comite.alba', email: 'comite.alba@gss.com', password: 'comite1234', role: 'comite', serviceCode: 'ALBA', isActive: true });
inMemoryUsers.push({ _id: '8', username: 'guardia.prueba', email: 'guardia.prueba@gss.com', password: 'guardia1234', role: 'guardia', serviceCode: 'ALBA', isActive: true });

// Comité Alba: Sergio Davila (Presidente)
inMemoryUsers.push({ _id: '9', name: 'Sergio Davila', username: 'Sergio.Davila.Alba', email: 'sergio.davila.alba@gss.com', password: 'comite1234', role: 'comite', serviceCode: 'ALBA', isActive: true, position: 'Presidente' });

for (const u of inMemoryUsers) {
  if (u.password && !String(u.password).startsWith('$2')) {
    try { u.password = bcrypt.hashSync(u.password, 10); } catch (_) {}
  }
}

const inMemoryServices = [
  {
    _id: '1',
    name: 'Servicio Demo',
    description: 'Servicio de demostración',
    isActive: true
  }
];

console.log('⚠️  Funcionando en modo sin base de datos - usando datos en memoria');
console.log('✅ Usuarios disponibles:');
console.log('   - admin@gss.com / admin123 (admin)');
console.log('   - test@test.com / password (user)');
console.log('   - admin.prueba@gss.com / admin1234 (admin)');
console.log('   - admin.alf@gss.com / admin1234 (administrador)');
console.log('   - super.prueba@gss.com / super1234 (supervisor)');
console.log('   - reside.alba@gss.com / reside1234 (residente)');
console.log('   - comite.alba@gss.com / comite1234 (comite)');
console.log('   - guardia.prueba@gss.com / guardia1234 (guardia)');

// Intentar conectar a MongoDB en segundo plano
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/appgss';
const mongoUser = process.env.MONGODB_USER || undefined;
const mongoPass = process.env.MONGODB_PASS || undefined;
const useTls = mongoUri.startsWith('mongodb+srv://') || process.env.MONGO_TLS === 'true';
mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT) || 15000,
  socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT) || 20000,
  maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 5,
  minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 1,
  retryWrites: process.env.MONGO_RETRY_WRITES !== 'false',
  tls: useTls,
  auth: mongoUser && mongoPass ? { username: mongoUser, password: mongoPass } : undefined
})
.then(async () => {
  console.log('✅ MongoDB conectado - cambiando a modo base de datos');
  isMongoConnected = true;
  const testAccounts = [
    { name: 'Administrador Prueba', username: 'admin.prueba', email: 'admin.prueba@gss.com', password: 'admin1234', role: 'admin', serviceCode: 'GSS' },
    { name: 'Administrador Alf', username: 'admin.alf', email: 'admin.alf@gss.com', password: 'admin1234', role: 'administrador', serviceCode: 'ALBA', allowedServices: ['ALBA'], serviceCodes: ['ALBA'] },
    { name: 'Supervisor Prueba', username: 'super.prueba', email: 'super.prueba@gss.com', password: 'super1234', role: 'supervisor', serviceCode: 'ALBA' },
    { name: 'Residente Alba', username: 'reside.alba', email: 'reside.alba@gss.com', password: 'reside1234', role: 'residente', serviceCode: 'ALBA', street: 'Calle Prueba', number: '123' },
    { name: 'Comité Alba', username: 'comite.alba', email: 'comite.alba@gss.com', password: 'comite1234', role: 'comite', serviceCode: 'ALBA' },
    { name: 'Guardia Prueba', username: 'guardia.prueba', email: 'guardia.prueba@gss.com', password: 'guardia1234', role: 'guardia', serviceCode: 'ALBA', allowedServices: ['ALBA'] }
    ,{ name: 'Sergio Davila', username: 'Sergio.Davila.Alba', email: 'sergio.davila.alba@gss.com', password: 'comite1234', role: 'comite', serviceCode: 'ALBA', position: 'Presidente' }
  ];
  try {
    for (const acc of testAccounts) {
      let existing = await User.findOne({ $or: [{ username: acc.username }, { email: acc.email }] });
      if (!existing) {
        const newUser = new User(acc);
        await newUser.save();
      }
    }
    // Ensure guard account karem.lara.s exists and is valid
    let karem = await User.findOne({ $or: [{ username: 'karem.lara.s' }, { email: 'karem.lara.s' }] });
    if (!karem) {
      karem = new User({ name: 'Karem Lara', username: 'karem.lara.s', role: 'guardia', password: 'guardia1234', serviceCode: 'ALBA', isActive: true });
      await karem.save();
    } else {
      karem.role = 'guardia';
      karem.isActive = true;
      if (!karem.serviceCode) karem.serviceCode = 'ALBA';
      karem.password = 'guardia1234';
      await karem.save();
    }
  } catch (_) {}
})
.catch(err => {
  console.log('❌ MongoDB no disponible:', err.message);
  console.log('💡 Continuando con datos en memoria...');
});

mongoose.connection.on('connected', () => { console.log('mongo:connected') })
mongoose.connection.on('disconnected', () => { console.log('mongo:disconnected') })
mongoose.connection.on('error', (e) => { console.log('mongo:error', e?.message) })

// authorize importado desde middleware

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, password, role = 'residente', serviceCode, accessCode, street, number } = req.body;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ msg: 'Usuario ya existe' });
    }

    // Create new user
    if (!name || !username || !password || !role) {
      return res.status(400).json({ msg: 'Datos incompletos' });
    }

    user = new User({
      name,
      username,
      email,
      password,
      role,
      serviceCode,
      accessCode,
      street,
      number
    });

    if (accessCode) {
      const valid = await Service.validateAccessCode(accessCode, role);
      if (!valid) {
        return res.status(400).json({ msg: 'Código de acceso inválido para el rol' });
      }
    }

    await user.save();

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        serviceCode: user.serviceCode
      }
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'development_jwt_secret',
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
      }
    );
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('=== LOGIN ATTEMPT ===');
    const { email, password } = req.body;
    console.log('Login data:', { email, password: password ? '[PROVIDED]' : '[MISSING]' });


    let user = null;
    
    // Si MongoDB está conectado, usar la base de datos
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      console.log('Using MongoDB for authentication');
      user = await User.findOne({ 
        $or: [
          { email: email },
          { username: email }
        ]
      });
      if (!user) {
        console.log('User not found in DB, trying in-memory');
        user = inMemoryUsers.find(u => u.email === email || u.username === email);
      }
    } else {
      console.log('Using in-memory data for authentication');
      user = inMemoryUsers.find(u => u.email === email || u.username === email);
    }
    
    console.log('User found:', user ? { id: user._id || user.id, username: user.username, email: user.email } : 'NO USER FOUND');
    
    if (!user) {
      console.log('User not found, returning 400');
      return res.status(400).json({ msg: 'Credenciales inválidas' });
    }

    // Validate password
    console.log('Validating password...');
    let isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    if (!isMatch) {
      const fallbackMemUser = inMemoryUsers.find(u => u.email === email || u.username === email);
      if (fallbackMemUser) {
        try {
          isMatch = await bcrypt.compare(password, fallbackMemUser.password);
          if (isMatch) {
            user = fallbackMemUser;
            console.log('Using in-memory user after DB mismatch');
          }
        } catch (_) {}
      }
      if (!isMatch) {
        console.log('Password mismatch, returning 400');
        return res.status(400).json({ msg: 'Credenciales inválidas' });
      }
    }

    // Create JWT payload
    console.log('Creating JWT payload...');
    const payload = {
      user: {
        id: user._id || user.id,
        role: user.role,
        serviceCode: user.serviceCode
      }
    };
    console.log('JWT payload:', payload);

    // Sign token
    console.log('Signing JWT token...');
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'development_jwt_secret',
      { expiresIn: '24h' },
      (err, token) => {
        if (err) {
          console.error('JWT signing error:', err);
          throw err;
        }
        console.log('JWT token created successfully');
        const response = { token, user: { id: user._id || user.id, username: user.username, email: user.email, role: user.role } };
        console.log('Sending response:', response);
        res.json(response);
      }
    );
  } catch (error) {
    console.error('=== LOGIN ERROR ===');
    console.error('Error in login:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Services list
// Nota: la ruta de servicios se define más abajo con fallback a datos en memoria

// Services endpoints - Public route for login
// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('Test endpoint called');
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'GSS API server',
    endpoints: ['/api/health', '/api/auth/login', '/api/services']
  });
});

// Endpoint para verificar conectividad y estado del servidor
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStates[dbStatus],
      name: mongoose.connection.name || 'unknown',
      host: mongoose.connection.host || 'unknown'
    },
    server: {
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

app.get('/api/health/sync', (req, res) => {
  res.json({ ok: true, sync: Boolean(ioInstance) });
});

app.post('/api/sync/broadcast', (req, res) => {
  try {
    const payload = req.body || {};
    if (ioInstance) ioInstance.emit('sync:update', payload);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

import crypto from 'crypto';
app.post('/api/sync/operation', auth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, error: 'database_unavailable' });
    }
    const { resource, id, update, clientVersion = 0, clientHash } = req.body || {};
    if (!resource || !id || !update) {
      return res.status(400).json({ ok: false, error: 'invalid_payload' });
    }
    const hash = crypto.createHash('sha256').update(JSON.stringify(update)).digest('hex');
    if (clientHash && clientHash !== hash) {
      return res.status(422).json({ ok: false, error: 'integrity_failed', serverHash: hash });
    }
    const models = {
      communityServices: CommunityService,
      users: User,
      services: Service
    };
    const Model = models[resource];
    if (!Model) {
      return res.status(400).json({ ok: false, error: 'unknown_resource' });
    }
    const doc = await Model.findById(id);
    const serverVersion = Number(doc?.version || 0);
    if (doc && serverVersion > Number(clientVersion)) {
      return res.status(409).json({ ok: false, conflict: true, server: doc });
    }
    const merged = doc ? { ...doc.toObject(), ...update } : update;
    if (doc) {
      Object.assign(doc, merged);
      doc.version = serverVersion + 1;
      doc.updatedAt = new Date();
      await doc.save();
    } else {
      const created = new Model({ _id: id, ...merged, version: 1, updatedAt: new Date() });
      await created.save();
    }
    try {
      ioInstance && ioInstance.emit('sync:update', { resource, id });
    } catch (_) {}
    res.json({ ok: true });
  } catch (e) {
    console.error('sync operation error', e?.message);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

app.get('/api/services', async (req, res) => {
  console.log('=== SERVICES ENDPOINT CALLED ===');
  
  try {
    let services = [];
    
    if (mongoose.connection.readyState === 1) {
      console.log('Using MongoDB for services');
      services = await Service.find({ isActive: true });
    } else {
      if (STRICT_MONGO) {
        return res.status(503).json({ success: false, error: 'database_unavailable' });
      }
      console.log('Using in-memory data for services');
      services = inMemoryServices.filter(s => s.isActive);
    }
    
    console.log(`Found ${services.length} active services`);
    
    res.json({
      success: true,
      services: services
    });
    
  } catch (error) {
    console.error('Error in /api/services:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Protected services endpoint for authenticated users
app.get('/api/services/protected', auth, async (req, res) => {
  try {
    const services = await Service.getAllActiveServices();
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ msg: 'Error del servidor al obtener servicios' });
  }
});

// Endpoint temporal para actualizar usuarios del fraccionamiento alba
app.post('/api/admin/update-alba-users', auth, authorize('admin', 'administrador'), async (req, res) => {
  try {
    const userUpdates = [
      { email: 'guardias@gmail.com' },
      { username: 'guardia.del.alba' },
      { email: 'reside@prueba.co' }
    ];

    const results = [];
    
    for (const update of userUpdates) {
      const query = update.email ? { email: update.email } : { username: update.username };
      const user = await User.findOne(query);
      
      if (user && (user.role === 'guardia' || user.role === 'residente')) {
        user.subdivision = 'alba';
        await user.save();
        results.push({
          identifier: update.email || update.username,
          success: true,
          role: user.role
        });
      } else if (user) {
        results.push({
          identifier: update.email || update.username,
          success: false,
          reason: `Rol ${user.role} no requiere fraccionamiento`
        });
      } else {
        results.push({
          identifier: update.email || update.username,
          success: false,
          reason: 'Usuario no encontrado'
        });
      }
    }

    // Verificar usuarios actualizados
    const albaUsers = await User.find({ subdivision: 'alba' });
    
    res.json({
      message: 'Proceso completado',
      results,
      albaUsers: albaUsers.map(u => ({
        identifier: u.email || u.username,
        role: u.role,
        subdivision: u.subdivision
      }))
    });
  } catch (error) {
    console.error('Error updating alba users:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

ioInstance = new SocketIOServer(server, { cors: { origin: allowedOrigin, methods: ['GET','POST'] } });
ioInstance.on('connection', socket => {
  socket.on('sync:emit', data => {
    ioInstance.emit('sync:update', data);
  });
});
server.listen(PORT, '0.0.0.0', () => console.log(`Server started on port ${PORT} and accessible from any IP`));

// Seed inicial de servicios para ALBA
(async () => {
  try {
    const code = 'ALBA';
    const seeds = [
      { name: 'Jardinería', notes: '', phone: '4771002551', externalUrl: '', isActive: true },
      { name: 'Alberca', notes: '', phone: '', externalUrl: '', isActive: true },
      { name: 'Dogpark', notes: '', phone: '', externalUrl: '', isActive: true }
    ];
    for (const s of seeds) {
      const exists = await CommunityService.findOne({ serviceCode: code, name: s.name });
      if (!exists) {
        const item = new CommunityService({ serviceCode: code, ...s });
        await item.save();
      }
    }
    console.log('✅ Servicios comunitarios ALBA verificados/sembrados');
  } catch (e) {
    console.log('ℹ️ No se pudo sembrar servicios comunitarios (posible modo sin DB)');
  }
})();
