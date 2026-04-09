require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

app.use(helmet());

// Enable trust proxy for rate limit to work behind Railway's proxy
app.set('trust proxy', 1);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (avatars, logos)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/v1/auth',      require('./modules/auth/auth.routes'));
app.use('/api/v1/users',     require('./modules/users/users.routes'));
app.use('/api/v1/sales',     require('./modules/sales/sales.routes'));
app.use('/api/v1/inventory', require('./modules/inventory/inventory.routes'));
app.use('/api/v1/logistics', require('./modules/logistics/logistics.routes'));
app.use('/api/v1/finance',   require('./modules/finance/finance.routes'));
app.use('/api/v1/hr',        require('./modules/hr/hr.routes'));
app.use('/api/v1/facility',  require('./modules/facility/facility.routes'));
app.use('/api/v1/admin',     require('./modules/admin/admin.routes'));
app.use('/api/v1/executive', require('./modules/executive/executive.routes'));
app.use('/api/v1/ai',        require('./modules/ai/ai.routes'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0', timestamp: new Date() }));

// Root API route (prevents 404 on /api/v1/)
app.get('/api/v1', (req, res) => {
  res.json({ 
    status: 'Omoibo CRM API v1', 
    endpoints: ['/auth', '/users', '/sales', '/inventory', '/logistics', '/finance', '/hr', '/facility', '/admin', '/executive', '/ai'] 
  });
});

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Omoibo CRM API v2.0 running on port ${PORT}`));