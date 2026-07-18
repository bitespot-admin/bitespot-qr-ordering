const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const menuRoutes = require('./routes/menuRoutes');
const tableRoutes = require('./routes/tableRoutes');
const orderRoutes = require('./routes/orderRoutes');
const waiterCallRoutes = require('./routes/waiterCallRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const publicRoutes = require('./routes/publicRoutes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---- API routes ----
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/menu-items', menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/waiter-calls', waiterCallRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/public', publicRoutes);

// ---- Static frontend (customer + admin) ----
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Customer entry point: /menu/:restaurantSlug/:tableSlug -> menu.html
// The page itself calls /api/public/menu/... on load to resolve the
// restaurant + table from the URL.
app.get('/menu/:restaurantSlug/:tableSlug', (req, res) => {
  res.sendFile(path.join(publicDir, 'customer', 'menu.html'));
});

// Admin dashboard entry points
app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin', 'login.html')));
app.get('/admin/*', (req, res, next) => {
  const page = req.params[0].split('/')[0] || 'login';
  const filePath = path.join(publicDir, 'admin', `${page}.html`);
  res.sendFile(filePath, (err) => (err ? next() : null));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
