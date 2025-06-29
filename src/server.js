const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Import routes
const authRouter = require('./routes/auth');
const tenantsRouter = require('./routes/tenants');
const roomsRouter = require('./routes/rooms');
const paymentsRouter = require('./routes/payments');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

// Import database (this will create tables automatically)
const db = require('./database/database');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';
const BASE_URL = process.env.RAILWAY_STATIC_URL || `http://localhost:${PORT}`;

console.log('🚂 KostKita API Starting...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`🌍 Environment: ${NODE_ENV}`);
console.log(`📍 Base URL: ${BASE_URL}`);
console.log(`🚪 Port: ${PORT}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Allow all origins in development/production for now
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.originalUrl}`);

  if (req.method !== 'GET') {
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    if (req.body && Object.keys(req.body).length > 0) {
      // Don't log passwords
      const logBody = { ...req.body };
      if (logBody.password) logBody.password = '[HIDDEN]';
      if (logBody.old_password) logBody.old_password = '[HIDDEN]';
      if (logBody.new_password) logBody.new_password = '[HIDDEN]';
      console.log('Body:', JSON.stringify(logBody, null, 2));
    }
  }

  next();
});

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    platform: 'Railway',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
    },
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚂 KostKita API on Railway',
    version: '1.0.0',
    platform: 'Railway',
    environment: NODE_ENV,
    endpoints: {
      health: '/health',
      api_docs: '/api',
      demo_login: {
        username: 'admin',
        password: 'admin123',
      },
    },
    links: {
      api_docs: `${BASE_URL}/api`,
      health_check: `${BASE_URL}/health`,
      web_dashboard: BASE_URL,
    },
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/tenants', authenticateToken, tenantsRouter);
app.use('/api/rooms', authenticateToken, roomsRouter);
app.use('/api/payments', authenticateToken, paymentsRouter);

// API documentation
app.get('/api', (req, res) => {
  res.json({
    message: 'KostKita API Documentation',
    version: '1.0.0',
    platform: 'Railway',
    base_url: BASE_URL,
    environment: NODE_ENV,
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Login admin',
        'POST /api/auth/register': 'Register new admin',
        'GET /api/auth/profile': 'Get profile (protected)',
        'PUT /api/auth/profile': 'Update profile (protected)',
        'PUT /api/auth/change-password': 'Change password (protected)',
      },
      rooms: {
        'GET /api/rooms': 'Get all rooms (protected)',
        'POST /api/rooms': 'Create new room (protected)',
        'PUT /api/rooms/:id': 'Update room (protected)',
        'DELETE /api/rooms/:id': 'Delete room (protected)',
      },
      tenants: {
        'GET /api/tenants': 'Get all tenants (protected)',
        'POST /api/tenants': 'Create new tenant (protected)',
        'PUT /api/tenants/:id': 'Update tenant (protected)',
        'DELETE /api/tenants/:id': 'Delete tenant (protected)',
      },
      payments: {
        'GET /api/payments': 'Get all payments (protected)',
        'POST /api/payments': 'Create new payment (protected)',
        'PUT /api/payments/:id': 'Update payment (protected)',
        'DELETE /api/payments/:id': 'Delete payment (protected)',
      },
    },
    demo: {
      username: 'admin',
      password: 'admin123',
      note: 'Use these credentials to test the API',
    },
  });
});

// Serve frontend for non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API endpoint not found',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      available_endpoints: '/api',
    });
  }

  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handling
app.use((err, req, res, next) => {
  console.error('🚨 GLOBAL ERROR HANDLER 🚨');
  console.error('Error:', {
    message: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    platform: 'Railway',
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('🚨 UNCAUGHT EXCEPTION 🚨', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED REJECTION 🚨', reason, 'at promise', promise);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚂 KostKita API on Railway Started!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 URL: ${BASE_URL}`);
  console.log(`📚 API: ${BASE_URL}/api`);
  console.log(`💓 Health: ${BASE_URL}/health`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🚂 Platform: Railway`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Handle server errors
server.on('error', (err) => {
  console.error('🚨 SERVER ERROR 🚨', err);
  process.exit(1);
});

module.exports = app;
