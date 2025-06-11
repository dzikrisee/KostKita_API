const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { authenticateToken } = require('./middleware/auth');

// Import routes
const authRouter = require('./routes/auth');
const tenantsRouter = require('./routes/tenants');
const roomsRouter = require('./routes/rooms');
const paymentsRouter = require('./routes/payments');

const app = express();

// Railway environment configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RAILWAY_STATIC_URL = process.env.RAILWAY_STATIC_URL;
const RAILWAY_PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN;

// Determine the base URL
const getBaseUrl = () => {
  if (RAILWAY_PUBLIC_DOMAIN) {
    return `https://${RAILWAY_PUBLIC_DOMAIN}`;
  }
  if (RAILWAY_STATIC_URL) {
    return RAILWAY_STATIC_URL;
  }
  return `http://localhost:${PORT}`;
};

const BASE_URL = getBaseUrl();

console.log('🚂 Railway Configuration:');
console.log(`   NODE_ENV: ${NODE_ENV}`);
console.log(`   PORT: ${PORT}`);
console.log(`   BASE_URL: ${BASE_URL}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);

// Enhanced CORS for Railway
const corsOrigins = ['http://localhost:3000', 'http://localhost:5500', 'http://localhost:8000', 'http://127.0.0.1:5500', 'http://127.0.0.1:8000', BASE_URL, 'file://', 'null'];

// Add Railway URLs
if (RAILWAY_STATIC_URL) corsOrigins.push(RAILWAY_STATIC_URL);
if (RAILWAY_PUBLIC_DOMAIN) corsOrigins.push(`https://${RAILWAY_PUBLIC_DOMAIN}`);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Request logging (development only)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check with Railway info
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    platform: 'Railway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: '1.0.0',
    database: 'SQLite',
    base_url: BASE_URL,
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
    endpoints: {
      health: '/health',
      api_docs: '/api',
      dashboard: '/ (web UI)',
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

// Error handling
app.use((err, req, res, next) => {
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

// Start server
app.listen(PORT, () => {
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
