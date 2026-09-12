const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { testConnection } = require('./config/db');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const foodRoutes = require('./routes/foodRoutes');
const claimRoutes = require('./routes/claimRoutes');
const providerRoutes = require('./routes/providerRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    app: 'FoodRescue Lite API',
    environment: process.env.VERCEL ? 'Vercel Serverless' : 'Node.js Local',
    timestamp: new Date().toISOString()
  });
});

// Mount REST API routes
app.use('/api/auth', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/admin', adminRoutes);

// Fallback for clean html routes
app.get('/:page', (req, res, next) => {
  const pageFile = path.join(frontendPath, `${req.params.page}.html`);
  if (fs.existsSync(pageFile)) {
    return res.sendFile(pageFile);
  }
  next();
});

// Central error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server locally (Only if not running inside Vercel serverless function and not test mode)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`======================================================`);
    console.log(`  FoodRescue Lite is running on http://localhost:${PORT}`);
    console.log(`  Frontend: http://localhost:${PORT}`);
    console.log(`  API Docs: http://localhost:${PORT}/api/health`);
    console.log(`======================================================`);
    await testConnection();
  });
}

module.exports = app;
