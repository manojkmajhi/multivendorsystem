const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
require('dotenv').config();

const { NODE_ENV } = require('./config/constants');
const { initializeDatabase } = require('./config/database');

const app = express();

// Initialize services
initializeDatabase();

// Express settings
app.set('x-powered-by', false);
app.set('etag', 'strong');
if (NODE_ENV === 'production') {
  app.set('view cache', true);
  app.set('trust proxy', 1);
}

// Middleware
app.use(compression({ level: 6, threshold: 1024 }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.locals.title = 'All Strawhats';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// View engine
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');

// Static files
app.use('/public', express.static(path.join(__dirname, '..', 'public'), {
  maxAge: '365d',
  etag: true,
  lastModified: true
}));

app.use('/media', express.static(path.join(__dirname, '..', 'strawhats', 'media'), {
  maxAge: '365d',
  etag: true,
  lastModified: true
}));

// Routes will be added here
// app.use('/', require('./routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).render('simple-message', { 
    title: 'Not Found', 
    message: 'Page not found.' 
  });
});

module.exports = app;