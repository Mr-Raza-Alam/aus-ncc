const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectDB } = require('./shared/db');

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');

const app = express();

// Core middleware
app.use(cors());
app.use(helmet());
// app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Silence favicon requests on API root
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// Root endpoint for API server
app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'AUS-NCC Portal API Server',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
    },
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'AUS-NCC API is active',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/attendance', attendanceRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR] Unhandled error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

// Start server locally (not on Vercel)
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
if (!isVercel) {
  const PORT = process.env.PORT || 5000;

  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[ERROR] Failed to connect to MongoDB:', err.message);
      console.error('Please check your MONGODB_URI in backend/.env or start your MongoDB service.');
    });
}

module.exports = app;
