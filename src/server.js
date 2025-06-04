const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { authenticateToken } = require('./middleware/auth');

// Import routes
const authRouter = require('./routes/auth');
const tenantsRouter = require('./routes/tenants');
const roomsRouter = require('./routes/rooms');
const paymentsRouter = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Protected routes (auth required)
app.use('/api/tenants', authenticateToken, tenantsRouter);
app.use('/api/rooms', authenticateToken, roomsRouter);
app.use('/api/payments', authenticateToken, paymentsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to KostKita API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});