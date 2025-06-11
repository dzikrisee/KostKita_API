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
const PORT = process.env.PORT || 3000;

// Enhanced CORS configuration for frontend integration
app.use(
  cors({
    origin: [
      'http://localhost:3000', // Backend itself
      'http://localhost:5500', // Live Server default port
      'http://localhost:8000', // Python simple server
      'http://127.0.0.1:5500', // Live Server alternative
      'http://127.0.0.1:8000', // Python server alternative
      'file://', // Direct file access
      'null', // For local file development
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (helpful for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files (if you want to serve frontend from backend)
// Uncomment this if you put frontend in a 'public' folder
// app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRouter);

// Protected routes (auth required)
app.use('/api/tenants', authenticateToken, tenantsRouter);
app.use('/api/rooms', authenticateToken, roomsRouter);
app.use('/api/payments', authenticateToken, paymentsRouter);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'KostKita API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Login admin',
        'POST /api/auth/register': 'Register new admin',
        'PUT /api/auth/profile': 'Update profile (protected)',
        'PUT /api/auth/change-password': 'Change password (protected)',
      },
      rooms: {
        'GET /api/rooms': 'Get all rooms (protected)',
        'GET /api/rooms/:id': 'Get room by ID (protected)',
        'POST /api/rooms': 'Create new room (protected)',
        'PUT /api/rooms/:id': 'Update room (protected)',
        'DELETE /api/rooms/:id': 'Delete room (protected)',
      },
      tenants: {
        'GET /api/tenants': 'Get all tenants (protected)',
        'GET /api/tenants/:id': 'Get tenant by ID (protected)',
        'POST /api/tenants': 'Create new tenant (protected)',
        'PUT /api/tenants/:id': 'Update tenant (protected)',
        'DELETE /api/tenants/:id': 'Delete tenant (protected)',
      },
      payments: {
        'GET /api/payments': 'Get all payments (protected)',
        'GET /api/payments/:id': 'Get payment by ID (protected)',
        'GET /api/payments/tenant/:tenantId': 'Get payments by tenant (protected)',
        'GET /api/payments/room/:roomId': 'Get payments by room (protected)',
        'POST /api/payments': 'Create new payment (protected)',
        'PUT /api/payments/:id': 'Update payment (protected)',
        'DELETE /api/payments/:id': 'Delete payment (protected)',
      },
    },
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to KostKita API',
    documentation: '/api',
    health: '/health',
    version: '1.0.0',
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableRoutes: ['GET /', 'GET /api', 'GET /health', 'POST /api/auth/login', 'POST /api/auth/register', 'GET /api/rooms', 'GET /api/tenants', 'GET /api/payments'],
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Send appropriate error response
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message,
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Please login again',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'Please login again',
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 KostKita API Server is running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`💓 Health Check: http://localhost:${PORT}/health`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});
