const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
const compression = require('compression');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { productCache, categoryCache, settingsCache, heroCache, cacheMiddleware, clearResponseCache } = require('./src/services/cacheService');

const app = express();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Optimize Express settings
app.set('x-powered-by', false);
app.set('etag', 'strong');
if (NODE_ENV === 'production') {
  app.set('view cache', true);
}

// Enable aggressive gzip compression
app.use(compression({ level: 6, threshold: 1024 }));

// Production optimizations
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Supabase client with connection pooling
let supabase = null;
if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  supabase = createClient(process.env.SUPABASE_URL, key, {
    auth: { persistSession: false },
    db: { schema: 'public' },
    global: { headers: { 'x-connection-pool': 'enabled' } }
  });
  console.log('✓ Supabase client initialized with pooling', { 
    url: process.env.SUPABASE_URL, 
    keyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon' 
  });
} else {
  console.warn('Supabase environment variables not set. Admin features disabled until configured.');
}

// Nodemailer configuration for OTP emails
const nodemailer = require('nodemailer');

// Configure email transporter - using Gmail or custom SMTP
let emailTransporter = null;

if (process.env.SMTP_HOST) {
  // Custom SMTP configuration
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log('✓ Email transporter configured with custom SMTP');
} else if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
  // Gmail configuration
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });
  console.log('✓ Email transporter configured with Gmail');
} else {
  console.log('⚠ Email transporter not configured. OTP emails will be logged to console only.');
  console.log('Set SMTP_HOST/SMTP_USER/SMTP_PASS or GMAIL_USER/GMAIL_PASS in .env to enable email sending');
}

// OTP email sending function
async function sendOTPEmail(email, otp) {
  if (!emailTransporter) {
    console.log('⚠ Email not sent (transporter not configured). OTP for testing:', otp);
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER || 'noreply@cropsay.com',
      to: email,
      subject: 'Cropsay - Password Reset Code',
      html: `
        <h2>Reset Your Password</h2>
        <p>We received a request to reset the password for your account. Use the following One-Time Password (OTP) to reset your password:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="letter-spacing: 5px; font-family: monospace; color: #333; margin: 0; font-size: 36px;">${otp}</h1>
        </div>
        
        <p><strong>This OTP will expire in 10 minutes.</strong></p>
        
        <p>If you didn't request a password reset, please ignore this email.</p>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          Do not share this OTP with anyone. Cropsay will never ask you for this code via email or phone.
        </p>
      `
    };
    
    await emailTransporter.sendMail(mailOptions);
    console.log('✓ OTP email sent to:', email);
    return true;
  } catch(err) {
    console.error('Email send error:', err.message);
    return false;
  }
}

// Settings helpers with aggressive caching
async function getSetting(key, fallback = null){
  if(!supabase) return fallback;
  
  const cached = settingsCache.get(key);
  if(cached !== undefined) return cached;
  
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).single();
  if(error) return fallback;
  
  settingsCache.set(key, data.value);
  return data.value;
}
async function setSetting(key, value){
  if(!supabase) return false;
  const { error } = await supabase.from('settings').upsert({ key, value });
  if(error){ console.error('Failed to set setting', key, error); return false; }
  settingsCache.set(key, value);
  clearResponseCache();
  return true;
}

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance and security headers
app.use((req,res,next)=>{
  res.locals.title = 'All Strawhats';
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Performance headers
  res.setHeader('X-DNS-Prefetch-Control', 'on');
  res.setHeader('Accept-CH', 'DPR, Viewport-Width, Width, Save-Data');
  
  // Enable compression for all responses
  if (req.headers['accept-encoding'] && req.headers['accept-encoding'].includes('gzip')) {
    res.setHeader('Vary', 'Accept-Encoding');
  }
  
  next();
});

// -------- Site Setting Injection (for dynamic logo/name in admin UI) --------
let siteCache = { value: null, fetchedAt: 0 };
async function loadSiteSetting(force=false){
  if(!supabase) return { name: 'Cropsay', logo_url: '/staticfiles/brand.svg' };
  if(!force && siteCache.value && Date.now() - siteCache.fetchedAt < 60_000){
    return siteCache.value;
  }
  try {
    const site = await getSetting('site', { name: 'Cropsay', logo_url: '/staticfiles/brand.svg' });
    siteCache = { value: site, fetchedAt: Date.now() };
    return site;
  } catch(e){
    return { name: 'Cropsay', logo_url: '/staticfiles/brand.svg' };
  }
}

// -------- Theme Management --------
let themeCache = { value: null, fetchedAt: 0 };
async function loadTheme(force=false){
  if(!supabase) return 'blue';
  if(!force && themeCache.value && Date.now() - themeCache.fetchedAt < 60_000){
    return themeCache.value;
  }
  try {
    const theme = await getSetting('theme', 'blue');
    themeCache = { value: theme, fetchedAt: Date.now() };
    return theme;
  } catch(e){
    return 'blue';
  }
}

// Dynamic CSS endpoint - MUST be before middleware
app.get('/custom-theme.css', async (req,res)=>{
  const colors = await getSetting('theme_colors', { 
    btn_bg: '#000000', btn_text: '#ffffff', btn_hover: '#333333',
    link_color: '#007bff', link_hover: '#0056b3',
    navbar_bg: '#ffffff', navbar_text: '#000000',
    card_bg: '#f8f8f8', card_radius: '2',
    footer_bg: '#343a40', footer_text: '#ffffff',
    success_color: '#28a745', danger_color: '#dc3545'
  });
  console.log('🎨 Serving custom theme CSS:', colors);
  
  const css = `
/* Advanced Custom Theme */
.btn, .btn-dark, .btn-primary, button.btn-dark, button.btn-primary {
  background-color: ${colors.btn_bg} !important;
  border-color: ${colors.btn_bg} !important;
  color: ${colors.btn_text} !important;
}
.btn:hover, .btn-dark:hover, .btn-primary:hover, button.btn-dark:hover, button.btn-primary:hover {
  background-color: ${colors.btn_hover} !important;
  border-color: ${colors.btn_hover} !important;
  color: ${colors.btn_text} !important;
}
.btn-outline-dark, .btn-outline-primary {
  color: ${colors.btn_bg} !important;
  border-color: ${colors.btn_bg} !important;
  background: transparent !important;
}
.btn-outline-dark:hover, .btn-outline-primary:hover {
  background-color: ${colors.btn_bg} !important;
  border-color: ${colors.btn_bg} !important;
  color: ${colors.btn_text} !important;
}
a { color: ${colors.link_color} !important; }
a:hover, a:focus { color: ${colors.link_hover} !important; }
nav.navbar, .navbar { background-color: ${colors.navbar_bg} !important; }
nav.navbar *, .navbar * { color: ${colors.navbar_text} !important; }
.product, .product-grid .product, .card { background-color: ${colors.card_bg} !important; border-radius: ${colors.card_radius}px !important; }
footer, .footer, .bg-dark { background-color: ${colors.footer_bg} !important; }
footer *, .footer * { color: ${colors.footer_text} !important; }
.btn-success { background-color: ${colors.success_color} !important; border-color: ${colors.success_color} !important; }
.btn-success:hover { background-color: ${colors.success_color} !important; filter: brightness(0.9) !important; }
.alert-success, .badge-success, .bg-success { background-color: ${colors.success_color} !important; }
.text-success { color: ${colors.success_color} !important; }
.btn-danger { background-color: ${colors.danger_color} !important; border-color: ${colors.danger_color} !important; }
.btn-danger:hover { background-color: ${colors.danger_color} !important; filter: brightness(0.9) !important; }
.alert-danger, .badge-danger, .bg-danger { background-color: ${colors.danger_color} !important; }
.text-danger { color: ${colors.danger_color} !important; }
  `;
  
  res.setHeader('Content-Type', 'text/css');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(css);
});

// Theme customizer routes
app.get('/admin/theme-customizer', adminGuard, async (req,res)=>{
  const colors = await getSetting('theme_colors', { 
    btn_bg: '#000000', btn_text: '#ffffff', btn_hover: '#333333',
    link_color: '#007bff', link_hover: '#0056b3',
    success_color: '#28a745', danger_color: '#dc3545'
  });
  res.render('admin/theme-customizer', { active: 'theme', colors, siteSetting: res.locals.siteSetting });
});

app.post('/admin/theme-customizer/save', adminGuard, async (req,res)=>{
  try {
    const { colors } = req.body;
    await setSetting('theme_colors', colors);
    res.json({ success: true });
  } catch(e){
    console.error('THEME_SAVE_ERROR', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.use(async (req,res,next)=>{
  res.locals.siteSetting = await loadSiteSetting();
  const customColors = await getSetting('custom_colors', { primary: '#2b90d9', secondary: '#6c757d', success: '#28a745', danger: '#dc3545' });
  res.locals.customColors = customColors;
  const socialLinks = await getSetting('social', {});
  res.locals.socialLinks = socialLinks;
  const seoSettings = await getSetting('seo', {});
  res.locals.seo = seoSettings;
  next();
});

// Favicon handler to prevent 404 errors
app.get('/favicon.ico', (req, res) => res.status(204).send());

// In-memory storage (per process). In production use a DB or persistent store.
const carts = {}; // key: device id, value: array of cart line items
const otpStore = {}; // OTP storage for farmer signup/reset
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes for OTP validity

// Cached product lookup with automatic refresh
async function getCachedProduct(id) {
  const cached = productCache.get(id);
  if(cached) return cached;
  
  const product = await getAnyProductById(id);
  if (product) productCache.set(id, product);
  return product;
}

// In-memory fallback product catalog (used only if Supabase unavailable). Real data comes from DB.
// Brand clean-up: legacy type 'Sticker' renamed to neutral 'Product'. If DB still has 'Sticker', we normalize below.
const products = [
  { id: '455', name: 'Avengers Logo', price: 45, image: '/media/455_Avengers%20Logo.jpg', type: 'Product', category: 'Marvel-Studios', active: true },
  { id: '516', name: 'God of Beer', price: 45, image: '/media/516_God%20of%20Beer.jpg', type: 'Product', category: 'Marvel-Studios', active: true },
  { id: '722', name: 'In case of fire', price: 45, image: '/media/722_In%20case%20of%20fire%26git%2C%20github%2C%20gitlab%2C%20commit%2C%20push.jpg', type: 'Product', category: 'Profession', active: true },
  { id: '739', name: 'React', price: 45, image: '/media/739_React%26frontend%2C%20mern%20stack%2C%20react%20native.jpg', type: 'Product', category: 'Profession', active: true },
  { id: '485', name: 'Casette', price: 45, image: '/media/485_Casette%26starlord%2C%20awesome%20mix%20vol%201.jpg', type: 'Product', category: 'Music', active: true },
  { id: '165', name: 'Mugiwara Pirates', price: 45, image: '/media/165_Mugiwara%20Pirates%26straw%20hat%2C%20pirates%2C%20pirate%20logo%2C.jpg', type: 'Product', category: 'Anime', active: true },
  { id: '730', name: 'Middle Finger', price: 45, image: '/media/730_Middle%20Finger%26sql%2C%20codes%2C%20program.jpg', type: 'Product', category: 'Others', active: true },
  { id: '245', name: 'Spongebob License', price: 45, image: '/media/245_Spongebob%20License%26driving%20school.jpg', type: 'Product', category: 'Cartoon', active: true },
  { id: '701', name: 'Chrome Dinasour', price: 45, image: '/media/701_Chrome%20Dinasour%26no%20internet%2C%20google%20chrome%2C%20cactus.jpg', type: 'Product', category: 'Games', active: true },
  { id: '735', name: 'Programmer', price: 45, image: '/media/735_Programmer%26developer%2C%20coder.jpg', type: 'Product', category: 'Profession', active: true },
  { id: '464', name: 'The Scar', price: 45, image: '/media/464_The%20Scar.jpg', type: 'Product', category: 'Movies', active: true },
  { id: '12', name: 'Levi Fuck You', price: 45, image: '/media/12_Levi%20Fuck%20You%26angry%2C.jpg', type: 'Product', category: 'Anime', active: true }
];

function normalizeType(t){
  if(!t) return 'Product';
  if(t === 'Sticker') return 'Product';
  if(t === 'Sticker Pack') return 'Pack';
  return t;
}

// Unified product lookup (DB first if configured, then fallback array)
async function getAnyProductById(id){
  if(!id) return null;
  id = String(id).trim();
  if(NODE_ENV !== 'production') console.log('→ getAnyProductById called', { id, hasSupabase: !!supabase });
  
  if(supabase){
    try {
      // Direct query by id (UUID primary key) - service role bypasses RLS
      const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
      
      if(error){
        if(NODE_ENV !== 'production') console.error('❌ SUPABASE_PRODUCT_LOOKUP_ERROR', { id, error: error.message });
      } else if(data) {
        if(NODE_ENV !== 'production') console.log('✓ SUPABASE_PRODUCT_LOOKUP_SUCCESS', { id, name: data.name });
        return data;
      }

    } catch(e){ 
      if(NODE_ENV !== 'production') console.error('💥 SUPABASE_PRODUCT_LOOKUP_EXCEPTION', { id, error: e.message }); 
    }
  }
  
  // Fallback to in-memory products
  const memMatch = products.find(p=>p.id === id);
  if(memMatch) return memMatch;
  
  if(NODE_ENV !== 'production') console.warn('❌ Product not found', { id });
  return null;
}

// --- Data access helpers with caching ---
async function dbFetchProducts(filter = {}) {
  if(!supabase) {
    let list = products.filter(p=>p.active!==false);
    if(filter.category) list = list.filter(p=> (p.category||'').toLowerCase() === filter.category.toLowerCase());
    if(filter.id) list = list.filter(p=> p.id === filter.id);
    return list;
  }
  
  // Cache key based on filter
  const cacheKey = JSON.stringify(filter);
  const cached = productCache.get(cacheKey);
  if(cached) return cached;
  
  let query = supabase.from('products').select('*').eq('active', true);
  if(filter.category && filter.category.toLowerCase() !== 'all') {
    query = query.eq('category', filter.category);
  }
  if(filter.id) {
    query = query.eq('id', filter.id);
  }
  if(filter.orderLatest) query = query.order('created_at', { ascending:false });
  if(filter.limit) query = query.limit(filter.limit);
  
  const { data, error } = await query;
  if(error) { console.error('DB_PRODUCTS_ERROR', error); return []; }
  
  const result = data || [];
  productCache.set(cacheKey, result);
  return result;
}

async function dbFetchProductById(id){
  const list = await dbFetchProducts({ id });
  return list[0] || null;
}

// Categories fallback list (if DB not configured). Real list is dynamic from categories table.
const fallbackCategories = [
  { name: 'Sports', image: '/staticfiles/Sports.jpg' },
  { name: 'Animals', image: '/staticfiles/Animals.jpg' },
  { name: 'Movies', image: '' },
  { name: 'Profession', image: '' },
  { name: 'Anime', image: '' },
  { name: 'Cartoon', image: '/staticfiles/Cartoon.jpg' },
  { name: 'Automobile', image: '/staticfiles/Automobile.jpg' },
  { name: 'Games', image: '/staticfiles/Games.jpg' },
  { name: 'Marvel-Studios', image: '/staticfiles/Marvel-Studios.jpg' }
];

async function dbFetchCategories(force=false){
  if(!supabase) return fallbackCategories;
  
  if(!force) {
    const cached = categoryCache.get('all');
    if(cached) return cached;
  }
  
  const { data, error } = await supabase.from('categories').select('*').order('created_at');
  if(error){ console.error('DB_CATEGORIES_ERROR', error); return fallbackCategories; }
  
  const normalized = (data||[]).map(c=> ({ ...c, image: c.image_url || c.image || '' }));
  categoryCache.set('all', normalized);
  return normalized;
}

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Serve static frontend (index.html) and assets.
// Dynamic root resolution so we can rename legacy folder (stickersnepal.com -> mugiwara) without code changes.
// Add any newly renamed static bundles here; order = priority.
const STATIC_ROOT_CANDIDATES = ['strawhats', 'mugiwara', 'allstrawhats'];
const staticRoot = STATIC_ROOT_CANDIDATES.find(dir => {
  try { return fs.existsSync(path.join(__dirname, dir)); } catch(e){ return false; }
}) || 'public';
console.log('✓ Static root resolved:', staticRoot);

// Log debug endpoints in development
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 Debug endpoints available:');
  console.log('  - GET /admin/debug/farmer?email=EMAIL');
  console.log('  - POST /admin/debug/test-password (body: {email, password})');
}
// Serve static files with aggressive caching
app.use('/media', express.static(path.join(__dirname, staticRoot, 'media'), {
  maxAge: '365d',
  etag: true,
  lastModified: true,
  immutable: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Serve uploads from public/uploads directory
app.use('/media/uploads', express.static(path.join(__dirname, 'public', 'uploads'), {
  maxAge: '365d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));
app.use('/staticfiles', express.static(path.join(__dirname, staticRoot, 'staticfiles'), {
  maxAge: '365d',
  etag: true,
  lastModified: true,
  immutable: true,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));
// NOTE: root static ("/") is mounted at bottom after dynamic routes.

// -------- Multer Configuration for File Uploads --------
// Use public/uploads directory for farmer uploads
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Multer error handling middleware
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).render('simple-message', { 
        title: 'Error', 
        message: 'File too large. Maximum size is 5MB.' 
      });
    }
    return res.status(400).render('simple-message', { 
      title: 'Error', 
      message: 'File upload error: ' + err.message 
    });
  } else if (err) {
    console.error('Upload error:', err);
    return res.status(500).render('simple-message', { 
      title: 'Error', 
      message: err.message 
    });
  }
  next();
}

// -------- Admin Auth (very light placeholder) --------
// For now use a simple header token or query param; later integrate Supabase auth.
let cachedAdminHash = null;
async function getAdminHash(){
  if(!supabase) return null;
  if(cachedAdminHash) return cachedAdminHash;
  const { data, error } = await supabase.from('settings').select('value').eq('key','admin_auth').single();
  if(!error && data && data.value && data.value.password_hash){
    cachedAdminHash = data.value.password_hash;
    return cachedAdminHash;
  }
  return null;
}
async function adminGuard(req,res,next){
  const sessionToken = req.cookies.admin_session;
  const hash = await getAdminHash();
  // If no password has been set yet, allow fallback dev token
  if(!hash){
    const token = req.headers['x-admin-token'] || req.query.admin_token || req.cookies.admin_token;
    const expected = process.env.ADMIN_TOKEN || 'dev-admin';
    if(token === expected) return next();
  }
  // We store the exact hash value in the cookie after login; just compare directly
  if(sessionToken && hash && sessionToken === hash){
    return next();
  }
  return res.redirect('/admin/login?next=' + encodeURIComponent(req.originalUrl));
}

// -------- Admin Routes (CRUD skeleton) --------
app.get('/admin/', adminGuard, async (req,res)=>{
  try {
    let stats = { 
      products: products.length, 
      categories: fallbackCategories.length,
      heroImages: 0,
      orders: { total: 0, pending: 0, delivered: 0, revenue: 0 },
      recentOrders: [],
      lowStock: []
    };
    
    if (supabase) {
      const [productsRes, categoriesRes, heroRes, ordersRes] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact' }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('hero_images').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5)
      ]);
      
      const allOrders = ordersRes.data || [];
      stats = { 
        products: productsRes.count || 0,
        activeProducts: (productsRes.data || []).filter(p => p.active).length,
        categories: categoriesRes.count || 0,
        heroImages: heroRes.count || 0,
        orders: {
          total: allOrders.length,
          pending: allOrders.filter(o => o.status === 'pending').length,
          delivered: allOrders.filter(o => o.status === 'delivered').length,
          revenue: allOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + parseFloat(o.total || 0), 0)
        },
        recentOrders: allOrders.slice(0, 5),
        lowStock: (productsRes.data || []).filter(p => !p.has_variants && p.stock < 10).slice(0, 5)
      };
    }
    
    res.render('admin/dashboard', { active: 'dashboard', stats, siteSetting: res.locals.siteSetting });
  } catch (e) {
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load dashboard.' });
  }
});

// ---- Admin Auth UI ----
app.get('/admin/login', async (req,res)=>{
  const hash = await getAdminHash();
  if(req.cookies.admin_session && hash && req.cookies.admin_session === hash){
    return res.redirect(req.query.next || '/admin/');
  }
  res.render('admin/login', { next: req.query.next || '/admin/', siteSetting: res.locals.siteSetting });
});

app.post('/admin/login', async (req,res)=>{
  const { password, next } = req.body;
  const hash = await getAdminHash();
  if(hash){
    const ok = await bcrypt.compare(password, hash);
    if(!ok) return res.status(401).render('simple-message', { title: 'Unauthorized', message: 'Invalid password.' });
    // Store the hash itself as session token (since we already treat possession as auth). Do NOT store plain password.
    res.cookie('admin_session', hash, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*3600*1000 });
    return res.redirect(next || '/admin/');
  }
  const expected = process.env.ADMIN_TOKEN || 'dev-admin';
  if(password === expected){
    res.cookie('admin_token', expected, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*3600*1000 });
    return res.redirect(next || '/admin/');
  }
  res.status(401).render('simple-message', { title: 'Unauthorized', message: 'Invalid password.' });
});

app.post('/admin/logout', (req,res)=>{
  res.clearCookie('admin_session');
  res.clearCookie('admin_token');
  res.redirect('/admin/login');
});

app.get('/admin/products', adminGuard, async (req,res)=>{
  try {
    let list = products; // fallback in-memory
    if (supabase) {
      const { data, error } = await supabase.from('products')
        .select('*, seller:seller_id(full_name, business_name)')
        .order('created_at', { ascending:false }).limit(200);
      if (!error && data) list = data;
    }
  res.render('admin/products', { active: 'products', items: list, msg: req.query.msg || '', siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load products.' });
  }
});

app.get('/admin/products/new', adminGuard, async (req,res)=>{
  const categories = await dbFetchCategories();
  res.render('admin/product-form', { item: null, categories, siteSetting: res.locals.siteSetting });
});

app.post('/admin/products/new', adminGuard, upload.single('imageFile'), handleMulterError, async (req,res)=>{
  productCache.flushAll();
  clearResponseCache();
  console.log('📝 Creating new product...');
  console.log('Body keys:', Object.keys(req.body));
  console.log('has_variants:', req.body.has_variants);
  console.log('variants:', req.body.variants);
  
  const { name, price, category, type, image, has_variants, base_sku, stock, variants } = req.body;
  const short_description = (req.body.short_description || '').trim();
  const long_description = (req.body.long_description || '').trim();

  let finalImage = image || '';
  if (req.file) finalImage = '/media/uploads/' + req.file.filename;

  try {
    if (supabase) {
      const insertPayload = {
        name,
        price: parseFloat(price),
        category,
        type,
        image: finalImage,
        short_description: short_description || null,
        long_description: long_description || null,
        has_variants: has_variants === 'on',
        base_sku: base_sku || null,
        stock: has_variants === 'on' ? 0 : parseInt(stock || 0)
      };
      console.log('Inserting product:', insertPayload);
      const { data: product, error } = await supabase.from('products').insert(insertPayload).select().single();
      if (error) throw error;
      console.log('Product created:', product.id);

      // Insert variants if enabled
      if (has_variants === 'on' && variants) {
        console.log('Processing variants...');
        console.log('Raw variants data:', variants);
        console.log('Is array?', Array.isArray(variants));
        
        // Convert object with numeric keys to array
        let variantArray;
        if (Array.isArray(variants)) {
          variantArray = variants;
        } else if (typeof variants === 'object') {
          variantArray = Object.values(variants);
        } else {
          variantArray = [variants];
        }
        console.log('Variant array length:', variantArray.length);
        
        const variantsToInsert = [];
        for (const v of variantArray) {
          console.log('Variant data:', v);
          if (v.sku && v.combination) {
            const variantPayload = {
              product_id: product.id,
              sku: v.sku.trim(),
              price_adjustment: parseFloat(v.price_adjustment || 0),
              stock: parseInt(v.stock || 0),
              image: v.image || null,
              attribute_combination: typeof v.combination === 'string' ? JSON.parse(v.combination) : v.combination
            };
            console.log('Preparing variant:', variantPayload);
            variantsToInsert.push(variantPayload);
          } else {
            console.log('Skipping variant - missing sku or combination');
          }
        }
        
        if (variantsToInsert.length > 0) {
          console.log('Inserting', variantsToInsert.length, 'variants');
          const { data: insertedVariants, error: vError } = await supabase.from('variants').insert(variantsToInsert).select();
          if (vError) {
            console.error('❌ Variant insert error:', vError);
            throw new Error('Failed to save variants: ' + vError.message);
          }
          console.log('✓ Variants inserted:', insertedVariants?.length || 0);
        }
      } else {
        console.log('No variants to process');
      }
    } else {
      products.push({
        id: String(Date.now()),
        name,
        price: parseFloat(price),
        category,
        type,
        image: finalImage,
        short_description: short_description || null,
        long_description: long_description || null
      });
    }
    res.redirect('/admin/products?msg=' + encodeURIComponent('Product created'));
  } catch (e) {
    console.error('❌ Error creating product:', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to create product: ' + e.message });
  }
});

// Edit product
app.get('/admin/products/:id/edit', adminGuard, async (req,res)=>{
  const id = req.params.id;
  try {
    let item = await dbFetchProductById(id);
    const categories = await dbFetchCategories();
    if(!item) return res.status(404).render('simple-message', { title: 'Not Found', message: 'Product not found.' });
    
    // Fetch variants if product has them
    if (item.has_variants && supabase) {
      const { data: variants } = await supabase.from('variants').select('*').eq('product_id', id);
      item.variants = variants || [];
    }
    
    res.render('admin/product-form', { item, categories, siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load product.' });
  }
});

app.post('/admin/products/:id/edit', adminGuard, upload.single('imageFile'), handleMulterError, async (req,res)=>{
  productCache.flushAll();
  clearResponseCache();
  const id = req.params.id;
  const { name, price, category, type, image, has_variants, base_sku, stock, variants } = req.body;
  const short_description = (req.body.short_description || '').trim();
  const long_description = (req.body.long_description || '').trim();
  let finalImage = image || '';
  if (req.file) finalImage = '/media/uploads/' + req.file.filename;

  try {
    if (supabase) {
      const updateData = {
        name,
        price: parseFloat(price),
        category,
        type,
        image: finalImage,
        short_description: short_description || null,
        long_description: long_description || null,
        has_variants: has_variants === 'on',
        base_sku: base_sku || null,
        stock: has_variants === 'on' ? 0 : parseInt(stock || 0)
      };
      Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);
      const { error } = await supabase.from('products').update(updateData).eq('id', id);
      if (error) throw error;

      // Update variants
      if (has_variants === 'on' && variants) {
        console.log('Updating variants for product:', id);
        console.log('Raw variants data:', variants);
        console.log('Is array?', Array.isArray(variants));
        
        // Delete existing variants first
        const { error: deleteError } = await supabase.from('variants').delete().eq('product_id', id);
        if (deleteError) {
          console.error('❌ Error deleting old variants:', deleteError);
          throw new Error('Failed to delete old variants: ' + deleteError.message);
        }
        console.log('✓ Old variants deleted');
        
        // Convert object with numeric keys to array
        let variantArray;
        if (Array.isArray(variants)) {
          variantArray = variants;
        } else if (typeof variants === 'object') {
          variantArray = Object.values(variants);
        } else {
          variantArray = [variants];
        }
        console.log('Variant array length:', variantArray.length);
        
        const variantsToInsert = [];
        for (const v of variantArray) {
          console.log('Variant data:', v);
          if (v.sku && v.combination) {
            const variantPayload = {
              product_id: id,
              sku: v.sku.trim(),
              price_adjustment: parseFloat(v.price_adjustment || 0),
              stock: parseInt(v.stock || 0),
              image: v.image || null,
              attribute_combination: typeof v.combination === 'string' ? JSON.parse(v.combination) : v.combination
            };
            console.log('Preparing variant:', variantPayload);
            variantsToInsert.push(variantPayload);
          }
        }
        
        if (variantsToInsert.length > 0) {
          console.log('Inserting', variantsToInsert.length, 'variants');
          const { data: insertedVariants, error: vError } = await supabase.from('variants').insert(variantsToInsert).select();
          if (vError) {
            console.error('❌ Variant insert error:', vError);
            throw new Error('Failed to save variants: ' + vError.message);
          }
          console.log('✓ Variants inserted:', insertedVariants?.length || 0);
        }
      } else {
        // Remove variants if disabled
        const { error: deleteError } = await supabase.from('variants').delete().eq('product_id', id);
        if (deleteError) console.error('Error removing variants:', deleteError);
      }
    } else {
      const idx = products.findIndex(p => p.id === id);
      if (idx === -1) return res.status(404).render('simple-message', { title: 'Not Found', message: 'Product missing.' });
      products[idx] = {
        ...products[idx],
        name,
        price: parseFloat(price),
        category,
        type,
        image: finalImage,
        short_description: short_description || null,
        long_description: long_description || null
      };
    }
    res.redirect('/admin/products?msg=' + encodeURIComponent('Product updated'));
  } catch (e) {
    console.error('❌ Failed to update product:', e.message, e.details || '');
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to update product: ' + (e.message || 'Unknown error') });
  }
});

// Delete product
app.post('/admin/products/:id/delete', adminGuard, async (req,res)=>{
  productCache.flushAll();
  clearResponseCache();
  const id = req.params.id;
  try {
    if (supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if(error) throw error;
    } else {
      const idx = products.findIndex(p=>p.id === id);
      if(idx !== -1) products.splice(idx,1);
    }
    res.redirect('/admin/products?msg=' + encodeURIComponent('Product deleted'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to delete product.' });
  }
});

// Toggle active
app.post('/admin/products/:id/toggle-active', adminGuard, async (req,res)=>{
  const id = req.params.id;
  try {
    if (supabase) {
      const { data, error } = await supabase.from('products').select('active').eq('id', id).single();
      if(error) throw error;
      const { error: upErr } = await supabase.from('products').update({ active: !data.active }).eq('id', id);
      if(upErr) throw upErr;
    } else {
      const item = products.find(p=>p.id===id);
      if(item) item.active = !item.active;
    }
    res.redirect('/admin/products?msg=' + encodeURIComponent('Status updated'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to toggle active.' });
  }
});

app.get('/admin/categories', adminGuard, async (req,res)=>{
  try {
    const list = await dbFetchCategories();
    res.render('admin/categories', { active: 'categories', items: list, msg: req.query.msg || '', siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load categories.' });
  }
});

app.post('/admin/categories/new', adminGuard, upload.single('imageFile'), async (req,res)=>{
  categoryCache.flushAll();
  clearResponseCache();
  const { name, image_url } = req.body;
  let finalImage = image_url;
  
  // If a file was uploaded, use it instead of the URL
  if (req.file) {
    finalImage = '/media/uploads/' + req.file.filename;
  }
  
  try {
    if (supabase) {
      const { error } = await supabase.from('categories').insert({ name, image_url: finalImage });
      if(error) throw error;
      await dbFetchCategories(true);
    } else {
      fallbackCategories.push({ name, image: finalImage });
    }
    res.redirect('/admin/categories?msg=' + encodeURIComponent('Category added'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to add category.' });
  }
});

app.post('/admin/categories/:id/edit', adminGuard, upload.single('imageFile'), async (req,res)=>{
  categoryCache.flushAll();
  clearResponseCache();
  const id = req.params.id;
  const { name, image_url } = req.body;
  let finalImage = image_url;
  
  // If a file was uploaded, use it instead of the URL
  if (req.file) {
    finalImage = '/media/uploads/' + req.file.filename;
  }
  
  try {
    if (supabase) {
      const { error } = await supabase.from('categories').update({ name, image_url: finalImage }).eq('id', id);
      if(error) throw error;
      await dbFetchCategories(true);
    } else {
      const idx = fallbackCategories.findIndex(c=>c.name===id);
      if(idx!==-1) {
        fallbackCategories[idx] = { name, image: finalImage };
      }
    }
    res.redirect('/admin/categories?msg=' + encodeURIComponent('Category updated'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to update category.' });
  }
});

app.post('/admin/categories/:id/delete', adminGuard, async (req,res)=>{
  categoryCache.flushAll();
  clearResponseCache();
  const id = req.params.id; // id or name fallback
  try {
    if (supabase) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if(error) throw error;
      await dbFetchCategories(true);
    } else {
      const idx = fallbackCategories.findIndex(c=>c.name===id);
      if(idx!==-1) fallbackCategories.splice(idx,1);
    }
    res.redirect('/admin/categories?msg=' + encodeURIComponent('Category deleted'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to delete category.' });
  }
});

// Settings (logo, site name, etc.)
app.get('/admin/settings', adminGuard, async (req,res)=>{
  try {
    const site = await getSetting('site', { name: 'All Strawhats', logo_url: '/staticfiles/brand.svg' });
    const customColors = await getSetting('custom_colors', { primary: '#2b90d9', secondary: '#6c757d', success: '#28a745', danger: '#dc3545' });
    const seo = await getSetting('seo', {});
    const social = await getSetting('social', {});
    const payment = await getSetting('payment', { esewa_qr: 'https://i.postimg.cc/mDPmcWp9/Whats-App-Image-2025-10-14-at-16-17-59-1cdf0cb6.jpg' });
  res.render('admin/settings', { active: 'settings', site, customColors, seo, social, payment, msg: req.query.msg || '', siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load settings.' });
  }
});

app.post('/admin/settings', adminGuard, upload.single('qr_file'), async (req,res)=>{
  const { name, logo_url, new_password, primary_color, secondary_color, success_color, danger_color,
    meta_description, meta_keywords, site_tagline, og_title, og_description, og_image,
    twitter_card, twitter_handle, google_analytics, google_verification, facebook_pixel,
    facebook_url, instagram_url, twitter_url, youtube_url, tiktok_url, contact_email, phone_number, esewa_qr } = req.body;
  try {
    let siteOk = true;
    const siteResult = await setSetting('site', { name, logo_url });
    if(!siteResult) siteOk = false;
    
    // Save custom colors
    if(primary_color){
      const colors = {
        primary: primary_color || '#2b90d9',
        secondary: secondary_color || '#6c757d',
        success: success_color || '#28a745',
        danger: danger_color || '#dc3545'
      };
      await setSetting('custom_colors', colors);
    }
    
    // Save SEO settings
    const seoData = { meta_description, meta_keywords, site_tagline, og_title, og_description, og_image,
      twitter_card, twitter_handle, google_analytics, google_verification, facebook_pixel };
    await setSetting('seo', seoData);
    
    // Save social media links
    const socialData = { facebook_url, instagram_url, twitter_url, youtube_url, tiktok_url, contact_email, phone_number };
    await setSetting('social', socialData);
    
    // Save payment settings (eSewa QR)
    let finalQr = esewa_qr;
    if(req.file) finalQr = '/media/uploads/' + req.file.filename;
    const paymentData = { esewa_qr: finalQr };
    await setSetting('payment', paymentData);
    
    let pwChanged = false;
    if(new_password && new_password.trim().length){
      if(!supabase){
        return res.status(500).render('simple-message', { title:'Error', message:'Supabase not configured; cannot set password.' });
      }
      if(new_password.trim().length < 6){
        return res.status(400).render('simple-message', { title:'Weak Password', message:'Password must be at least 6 characters.' });
      }
      const password_hash = await bcrypt.hash(new_password.trim(), 10);
      const { error } = await supabase.from('settings').upsert({ key: 'admin_auth', value: { password_hash, updated_at: new Date().toISOString() } });
      if(error) throw error;
      cachedAdminHash = password_hash;
      res.cookie('admin_session', password_hash, { httpOnly:true, sameSite:'lax', maxAge:7*24*3600*1000 });
      pwChanged = true;
    }
    if(!siteOk){
      return res.status(500).render('simple-message', { title:'Partial Error', message:'Password updated but failed to save site settings (RLS or missing service key).' });
    }
    await loadSiteSetting(true); // refresh cache
    const msg = encodeURIComponent('Settings saved' + (pwChanged? ' (password updated)':'') );
    res.redirect('/admin/settings?msg=' + msg);
  } catch(e){
    console.error('SETTINGS_SAVE_ERROR', e);
    let hint = 'Failed to save settings.';
    if(e && e.code === '42501') hint = 'RLS blocked write. Use SUPABASE_SERVICE_ROLE_KEY in .env or adjust policies.';
    res.status(500).render('simple-message', { title: 'Error', message: hint });
  }
});

// Reset theme to default
app.post('/admin/settings/reset-theme', adminGuard, async (req,res)=>{
  try {
    await setSetting('custom_colors', { primary: '#2b90d9', secondary: '#6c757d', success: '#28a745', danger: '#dc3545' });
    res.redirect('/admin/settings?msg=' + encodeURIComponent('Colors reset to default'));
  } catch(e){
    console.error('THEME_RESET_ERROR', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to reset colors.' });
  }
});

// ---------- Hero Images CRUD ----------
app.get('/admin/hero-images', adminGuard, async (req,res)=>{
  try {
    let list = [];
    if(supabase){
      const { data, error } = await supabase.from('hero_images').select('*').order('position');
      if(!error && data) list = data;
    }
  res.render('admin/hero-images', { active: 'hero', items: list, msg: req.query.msg || '', siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load hero images.' });
  }
});

app.post('/admin/hero-images/new', adminGuard, upload.single('imageFile'), async (req,res)=>{
  heroCache.flushAll();
  clearResponseCache();
  const { title, image_url, description, link_url, cta_label, position } = req.body;
  let finalImage = image_url;
  
  // If a file was uploaded, use it instead of the URL
  if (req.file) {
    finalImage = '/media/uploads/' + req.file.filename;
  }
  
  try {
    if(supabase){
      const { error } = await supabase.from('hero_images').insert({ 
        title, 
        image_url: finalImage, 
        description,
        link_url, 
        cta_label,
        position: parseInt(position||0,10) 
      });
      if(error) throw error;
    }
    res.redirect('/admin/hero-images?msg=' + encodeURIComponent('Hero image added'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to add hero image.' });
  }
});

app.post('/admin/hero-images/:id/edit', adminGuard, upload.single('imageFile'), async (req,res)=>{
  heroCache.flushAll();
  clearResponseCache();
  const id = req.params.id;
  const { title, image_url, description, link_url, cta_label, position } = req.body;
  let finalImage = image_url;
  
  // If a file was uploaded, use it instead of the URL
  if (req.file) {
    finalImage = '/media/uploads/' + req.file.filename;
  }
  
  try {
    if(supabase){
      const { error } = await supabase.from('hero_images').update({ 
        title, 
        image_url: finalImage, 
        description,
        link_url, 
        cta_label,
        position: parseInt(position||0,10) 
      }).eq('id', id);
      if(error) throw error;
    }
    res.redirect('/admin/hero-images?msg=' + encodeURIComponent('Hero image updated'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to update hero image.' });
  }
});

app.post('/admin/hero-images/:id/delete', adminGuard, async (req,res)=>{
  heroCache.flushAll();
  clearResponseCache();
  const id = req.params.id;
  try {
    if(supabase){
      const { error } = await supabase.from('hero_images').delete().eq('id', id);
      if(error) throw error;
    }
    res.redirect('/admin/hero-images?msg=' + encodeURIComponent('Deleted'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to delete hero image.' });
  }
});

app.post('/admin/hero-images/:id/toggle-active', adminGuard, async (req,res)=>{
  const id = req.params.id;
  try {
    if(supabase){
      const { data, error } = await supabase.from('hero_images').select('active').eq('id', id).single();
      if(error) throw error;
      const { error: upErr } = await supabase.from('hero_images').update({ active: !data.active }).eq('id', id);
      if(upErr) throw upErr;
    }
    res.redirect('/admin/hero-images?msg=' + encodeURIComponent('Status updated'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to update status.' });
  }
});

// ---------- Orders Management ----------
app.get('/admin/orders', adminGuard, async (req,res)=>{
  try {
    const filter = req.query.filter || 'all';
    let orders = [];
    
    if(supabase){
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      
      if(filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data, error } = await query;
      if(!error && data) orders = data;
    }
    
    // Calculate stats
    const allOrders = supabase ? (await supabase.from('orders').select('*')).data || [] : [];
    const stats = {
      total: allOrders.length,
      pending: allOrders.filter(o => o.status === 'pending').length,
      confirmed: allOrders.filter(o => o.status === 'confirmed').length,
      processing: allOrders.filter(o => o.status === 'processing').length,
      shipped: allOrders.filter(o => o.status === 'shipped').length,
      delivered: allOrders.filter(o => o.status === 'delivered').length,
      cancelled: allOrders.filter(o => o.status === 'cancelled').length,
      revenue: allOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + parseFloat(o.total || 0), 0)
    };
    
    res.render('admin/orders', { 
      active: 'orders',
      orders, 
      stats,
      filter,
      msg: req.query.msg || '', 
      siteSetting: res.locals.siteSetting 
    });
  } catch(e){
    console.error('ORDERS_LIST_ERROR', e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load orders.' });
  }
});

// Get single order (JSON for modal)
app.get('/admin/orders/:id', adminGuard, async (req,res)=>{
  const id = req.params.id;
  try {
    if(supabase){
      const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
      if(error) throw error;
      res.json(data);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch(e){
    console.error('ORDER_FETCH_ERROR', e);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order tracking info
app.post('/admin/orders/:id/tracking', adminGuard, async (req,res)=>{
  const id = req.params.id;
  const { status, estimated_date, note } = req.body;
  
  try {
    if(supabase){
      const { data: order, error: fetchError } = await supabase.from('orders').select('tracking_info').eq('id', id).single();
      if(fetchError) throw fetchError;
      
      const trackingInfo = order.tracking_info || {};
      trackingInfo[status] = { estimated_date, note, updated_at: new Date().toISOString() };
      
      const { error } = await supabase.from('orders').update({ tracking_info: trackingInfo }).eq('id', id);
      if(error) throw error;
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Database not configured' });
    }
  } catch(e){
    console.error('TRACKING_UPDATE_ERROR', e);
    res.status(500).json({ error: 'Failed to update tracking info' });
  }
});

// Update order status
app.post('/admin/orders/:id/status', adminGuard, async (req,res)=>{
  const id = req.params.id;
  const { status } = req.body;
  
  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if(!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    if(supabase){
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if(error) throw error;
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Database not configured' });
    }
  } catch(e){
    console.error('ORDER_UPDATE_ERROR', e);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Delete order
app.post('/admin/orders/:id/delete', adminGuard, async (req,res)=>{
  const id = req.params.id;
  try {
    if(supabase){
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if(error) throw error;
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Database not configured' });
    }
  } catch(e){
    console.error('ORDER_DELETE_ERROR', e);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Public order tracking page
app.get('/track-order', async (req,res)=>{
  res.render('track-order', { siteSetting: res.locals.siteSetting, socialLinks: res.locals.socialLinks });
});

// API endpoint for order tracking
app.get('/api/track-order', async (req,res)=>{
  try {
    const phone = req.query.phone;
    if(!phone) return res.json({ success: false, message: 'Phone number required' });
    
    if(supabase){
      const { data, error } = await supabase.from('orders').select('*').eq('customer_mobile', phone).order('created_at', { ascending: false });
      if(error) return res.json({ success: false, message: 'Failed to fetch orders' });
      if(!data || data.length === 0) return res.json({ success: false, message: 'No orders found for this phone number' });
      res.json({ success: true, orders: data });
    } else {
      res.json({ success: false, message: 'Tracking system not available' });
    }
  } catch(e){
    console.error('TRACK_ORDER_ERROR', e);
    res.status(500).json({ success: false, message: 'Failed to track orders' });
  }
});

// Category route with caching
app.get('/shop/:category/', cacheMiddleware(30), async (req, res) => {
  try {
    const catParam = req.params.category;
    const allCategories = await dbFetchCategories();
    const isAll = catParam.toLowerCase() === 'all';
    const catObj = isAll ? { name: 'All', image: '' } : allCategories.find(c => c.name.toLowerCase() === catParam.toLowerCase());
    if (!catObj) {
      return res.status(404).render('simple-message', { title: 'Not Found', message: 'Category not found.' });
    }

    // Fetch products for category
    const catProducts = await dbFetchProducts({ category: catObj.name });

    // Pagination
    const pageSize = 32; // matches original site layout (1-32 of X)
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const totalCount = catProducts.length;
    const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const endIdxExclusive = Math.min(startIdx + pageSize, totalCount);
    const pageProducts = catProducts.slice(startIdx, endIdxExclusive);

    res.render('shop-category', {
      activeCategory: catObj.name,
      categories: allCategories,
      products: pageProducts,
      total: totalCount,
      showingStart: totalCount ? startIdx + 1 : 0,
      showingEnd: endIdxExclusive,
      page: safePage,
      totalPages,
      siteSetting: res.locals.siteSetting
    });
  } catch(e){
    console.error('CATEGORY_PAGE_ERROR', e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load category.' });
  }
});

// Product details page with caching
app.get('/details/:id/', cacheMiddleware(60), async (req,res)=>{
  try {
    const id = req.params.id;
    let product = null;
    
    if (supabase) {
      const { data } = await supabase.from('products')
        .select('*, seller:seller_id(full_name, business_name, profile_image)')
        .eq('id', id).single();
      product = data;
    } else {
      product = await dbFetchProductById(id);
    }
    
    if(!product) return res.status(404).render('simple-message', { title:'Not Found', message:'Product not found.' });
    
    // Fetch variants if product has them
    if (product.has_variants && supabase) {
      const { data: variants } = await supabase.from('variants').select('*').eq('product_id', id).eq('active', true);
      product.variants = variants || [];
    }
    
    // Related products: same category (exclude current) limit 6
    let related = await dbFetchProducts({ category: product.category, limit: 12, orderLatest: true });
    related = related.filter(p=>p.id !== product.id).slice(0,6);
    res.render('product-details', { product, related, siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error('DETAILS_PAGE_ERROR', e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load product.' });
  }
});

// Search route - /search/all/?q=query
app.get('/search/:category/', async (req, res) => {
  try {
    const searchQuery = (req.query.q || '').trim().toLowerCase();
    const catParam = req.params.category;
    
    if (!searchQuery) {
      return res.redirect('/');
    }

    const allCategories = await dbFetchCategories();
    
    // Fetch all products (or from specific category if not 'all')
    let allProducts = [];
    if (catParam.toLowerCase() === 'all') {
      allProducts = await dbFetchProducts({});
    } else {
      allProducts = await dbFetchProducts({ category: catParam });
    }
    
    console.log('🔍 SEARCH DEBUG:', { 
      query: searchQuery, 
      totalProducts: allProducts.length,
      sampleProduct: allProducts[0] ? {
        name: allProducts[0].name,
        hasShortDesc: !!allProducts[0].short_description,
        hasLongDesc: !!allProducts[0].long_description,
        shortDescPreview: (allProducts[0].short_description || '').substring(0, 50),
        longDescPreview: (allProducts[0].long_description || '').substring(0, 50)
      } : null
    });
    
    // Filter products based on search query (name, category, type, and descriptions)
    const searchResults = allProducts.filter(p => {
      // Normalize text: lowercase, decode HTML entities, remove extra spaces
      const normalize = (text) => {
        return (text || '')
          .toLowerCase()
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      const name = normalize(p.name);
      const category = normalize(p.category);
      const type = normalize(p.type);
      const shortDesc = normalize(p.short_description);
      const longDesc = normalize(p.long_description);
      
      // Combine all searchable text
      const searchableText = `${name} ${category} ${type} ${shortDesc} ${longDesc}`;
      
      return searchableText.includes(searchQuery);
    });
    
    console.log('🔍 SEARCH RESULTS:', { matchCount: searchResults.length });

    // Pagination
    const pageSize = 32;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const totalCount = searchResults.length;
    const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const endIdxExclusive = Math.min(startIdx + pageSize, totalCount);
    const pageProducts = searchResults.slice(startIdx, endIdxExclusive);

    res.render('shop-category', {
      activeCategory: 'Search Results',
      categories: allCategories,
      products: pageProducts,
      total: totalCount,
      showingStart: totalCount ? startIdx + 1 : 0,
      showingEnd: endIdxExclusive,
      page: safePage,
      totalPages,
      searchQuery,
      siteSetting: res.locals.siteSetting
    });
  } catch(e){
    console.error('SEARCH_PAGE_ERROR', e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to perform search.' });
  }
});

// API endpoint to get product variants
app.get('/api/product-variants/:id', async (req, res) => {
  try {
    const id = req.params.id;
    console.log('🔍 Fetching variants for product:', id);
    
    if (!supabase) {
      console.log('⚠️ No supabase connection');
      return res.json({ variants: [], attributes: [] });
    }
    
    const { data: variants, error: vError } = await supabase.from('variants').select('*').eq('product_id', id).eq('active', true);
    console.log('📦 Variants found:', variants?.length || 0);
    if (vError) console.error('Variant fetch error:', vError);
    
    // Extract unique attribute keys and values from variants (same as product details page)
    const attrs = {};
    if (variants && variants.length) {
      variants.forEach(v => {
        const combo = v.attribute_combination || {};
        Object.keys(combo).forEach(key => {
          if (!attrs[key]) attrs[key] = new Set();
          attrs[key].add(combo[key]);
        });
      });
    }
    
    // Convert to array format
    const attributes = Object.keys(attrs).map(key => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      slug: key,
      values: Array.from(attrs[key]).map(v => ({ value: v }))
    }));
    
    console.log('📤 Sending response:', { variantCount: variants?.length || 0, attributeCount: attributes.length });
    res.json({ variants: variants || [], attributes });
  } catch (e) {
    console.error('💥 VARIANT_FETCH_ERROR', e);
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

// API endpoint for search suggestions/autocomplete
app.get('/api/search-suggestions', async (req, res) => {
  try {
    const query = (req.query.q || '').trim().toLowerCase();
    
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Fetch all products
    const allProducts = await dbFetchProducts({});
    
    // Normalize text helper
    const normalize = (text) => {
      return (text || '')
        .toLowerCase()
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    // Filter and get top 10 matches (search in name, descriptions, category, type)
    const matches = allProducts
      .filter(p => {
        const name = normalize(p.name);
        const shortDesc = normalize(p.short_description);
        const longDesc = normalize(p.long_description);
        const category = normalize(p.category);
        const type = normalize(p.type);
        const searchableText = `${name} ${shortDesc} ${longDesc} ${category} ${type}`;
        return searchableText.includes(query);
      })
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        category: p.category
      }));

    res.json({ suggestions: matches });
  } catch(e){
    console.error('SEARCH_SUGGESTIONS_ERROR', e);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Well-known route to silence 404 noise from Chrome DevTools request
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ version: 1, note: 'Placeholder to avoid 404.' });
});

// Helper to get / create a cart bucket
function getCart(device) {
  if (!carts[device]) carts[device] = []; // each item: {productId, qty}
  return carts[device];
}

// OTP API endpoints
app.post('/api/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const response = await fetch('https://auth.otpless.app/auth/otp/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'clientId': process.env.OTPLESS_CLIENT_ID,
        'clientSecret': process.env.OTPLESS_CLIENT_SECRET
      },
      body: JSON.stringify({
        phoneNumber: phone,
        otpLength: 6,
        channel: 'WHATSAPP',
        expiry: 300
      })
    });
    const data = await response.json();
    console.log('OTPless send response:', data);
    res.json(data);
  } catch(e) {
    console.error('Send OTP error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/verify-otp', async (req, res) => {
  try {
    const { phone, otp, orderId } = req.body;
    const response = await fetch('https://auth.otpless.app/auth/otp/v1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'clientId': process.env.OTPLESS_CLIENT_ID,
        'clientSecret': process.env.OTPLESS_CLIENT_SECRET
      },
      body: JSON.stringify({
        orderId: orderId,
        otp: otp,
        phoneNumber: phone
      })
    });
    const data = await response.json();
    console.log('OTPless verify response:', data);
    res.json(data);
  } catch(e) {
    console.error('Verify OTP error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/otpless-config', (req, res) => {
  res.json({ appId: process.env.OTPLESS_APP_ID });
});

app.get('/api/payment-settings', async (req, res) => {
  try {
    const payment = await getSetting('payment', { esewa_qr: 'https://i.postimg.cc/mDPmcWp9/Whats-App-Image-2025-10-14-at-16-17-59-1cdf0cb6.jpg' });
    res.json(payment);
  } catch(e) {
    res.json({ esewa_qr: 'https://i.postimg.cc/mDPmcWp9/Whats-App-Image-2025-10-14-at-16-17-59-1cdf0cb6.jpg' });
  }
});

// Add to cart endpoint (front-end calls /add_to_cart/?productid=..&qty=..&variantid=..)
app.get('/add_to_cart/', async (req, res) => {
  try {
    const { productid, qty, variantid } = req.query;
    
    if (!productid || !qty) return res.status(400).json({ error: 'productid and qty required' });
    
    const trimmed = String(productid).trim();
    const product = await getCachedProduct(trimmed);
    
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const device = req.cookies.device || 'anonymous';
    
    const cart = getCart(device);
    const cartKey = variantid ? `${trimmed}_${variantid}` : trimmed;
    const existing = cart.find(i => i.productId === trimmed && i.variantId === (variantid || null));
    if (existing) {
      existing.qty += parseInt(qty, 10);
    } else {
      cart.push({ productId: trimmed, variantId: variantid || null, qty: parseInt(qty, 10) });
    }
    
    const totalCount = cart.reduce((a,c)=>a+c.qty,0);
    return res.json({ ok: true, count: totalCount });
  } catch(e){
    if(NODE_ENV !== 'production') console.error('ADD_TO_CART_ERROR', e);
    return res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// Get cart endpoint with batch loading
app.get('/get_cart/', async (req,res)=>{
  try {
    const device = req.cookies.device || 'anonymous';
    const cart = getCart(device);
    
    // Batch load all products and variants
    const productIds = [...new Set(cart.map(it => it.productId))];
    const variantIds = cart.filter(it => it.variantId).map(it => it.variantId);
    
    // Load products in parallel
    const productPromises = productIds.map(id => getCachedProduct(id));
    const productsData = await Promise.all(productPromises);
    const productsMap = new Map(productsData.filter(p => p).map(p => [p.id, p]));
    
    // Batch load variants if needed
    let variantsMap = new Map();
    if(variantIds.length && supabase){
      const { data: variants } = await supabase.from('variants').select('*').in('id', variantIds);
      if(variants) variantsMap = new Map(variants.map(v => [v.id, v]));
    }
    
    // Build cart response
    const mapped = cart.map(it => {
      const p = productsMap.get(it.productId);
      if(!p) return [it.productId, 'Unknown', it.qty, 0, '', 'Product', it.qty, null];
      
      let finalPrice = parseFloat(p.price) || 0;
      let finalImage = p.image || '';
      let finalName = p.name || p.title || 'Item';
      
      if(it.variantId){
        const variant = variantsMap.get(it.variantId);
        if(variant){
          finalPrice += parseFloat(variant.price_adjustment || 0);
          if(variant.image && variant.image.trim()) finalImage = variant.image;
          const combo = variant.attribute_combination || {};
          const variantLabel = Object.values(combo).filter(v => v).join(' / ');
          if(variantLabel) finalName += ` (${variantLabel})`;
        }
      }
      
      return [p.id, finalName, it.qty, finalPrice, finalImage, normalizeType(p.type), it.qty, it.variantId || null];
    });
    
    res.json({ cart: mapped });
  } catch(e){
    console.error('GET_CART_ERROR', e);
    res.status(500).json({ error: 'Failed to load cart' });
  }
});

// Remove from cart endpoint
app.get('/remove_from_cart/', async (req, res) => {
  try {
    const device = req.cookies.device || 'anonymous';
    const productId = req.query.productid;
    const variantId = req.query.variantid || null;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID required' });
    }
    
    const cart = getCart(device);
    const index = cart.findIndex(item => item.productId === productId && item.variantId === variantId);
    
    if (index !== -1) {
      cart.splice(index, 1);
      // Cart is modified in place since getCart returns the reference
      console.log('✓ Removed from cart', { device, productId, variantId, remainingItems: cart.length });
      res.json({ success: true, message: 'Item removed from cart' });
    } else {
      console.log('⚠️ Item not found in cart', { device, productId, variantId });
      res.json({ success: false, message: 'Item not found in cart' });
    }
  } catch(e) {
    console.error('REMOVE_FROM_CART_ERROR', e);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// Cache management endpoint (admin only)
app.get('/__clear_cache', adminGuard, (req, res) => {
  productCache.flushAll();
  categoryCache.flushAll();
  settingsCache.flushAll();
  heroCache.flushAll();
  clearResponseCache();
  console.log('🗑️ All caches cleared by admin');
  res.json({ success: true, message: 'All caches cleared successfully' });
});

app.get('/__cache_stats', adminGuard, (req, res) => {
  res.json({
    products: productCache.getStats(),
    categories: categoryCache.getStats(),
    settings: settingsCache.getStats(),
    hero: heroCache.getStats()
  });
});

// Debug endpoints (disabled in production)
if (NODE_ENV !== 'production') {
app.get('/__debug_products', async (req,res)=>{
  const list = [...products];
  if(supabase){
    try { const { data, error } = await supabase.from('products').select('id,name,price,active').limit(200);
      if(!error && data){ data.forEach(d=>{ if(!list.find(p=>p.id===d.id)) list.push(d); }); }
    } catch(e){}
  }
  res.json({ count: list.length, ids: list.map(p=>p.id) });
});

app.get('/__debug_lookup', async (req,res)=>{
  const id = (req.query.productid||'').trim();
  let product = null, errInfo = null;
  try { product = await getAnyProductById(id); } catch(e){ errInfo = String(e); }
  res.json({ input:id, supabaseConfigured: !!supabase, found: !!product, product, errInfo });
});

app.get('/__debug_env', (req,res)=>{
  res.json({ supabaseConfigured: !!supabase, hasUrl: !!process.env.SUPABASE_URL, hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY, hasAnon: !!process.env.SUPABASE_ANON_KEY });
});

app.get('/__test_add_to_cart', async (req,res)=>{
  try {
    const device = req.cookies.device || 'test-device';
    // Use first available product
    let testProductId = '455'; // fallback
    if(supabase){
      const { data } = await supabase.from('products').select('id').limit(1).single();
      if(data) testProductId = data.id;
    }
    
    const product = await getAnyProductById(testProductId);
    if(!product) return res.json({ error: 'No products available to test' });
    
    const cart = getCart(device);
    cart.push({ productId: testProductId, qty: 1 });
    carts[device] = cart;
    
    res.json({ 
      ok: true, 
      message: 'Test product added to cart', 
      device, 
      productId: testProductId, 
      productName: product.name,
      cartSize: cart.length,
      instructions: 'Now visit /get_cart/ or /cart/ to see if data renders correctly'
    });
  } catch(e){
    res.json({ error: e.message });
  }
});
}

// Dynamic homepage with caching
app.get('/', cacheMiddleware(30), async (req,res)=>{
  try {
    // Parallel fetch with caching
    let heroImages = heroCache.get('active');
    
    const [categories, productsList] = await Promise.all([
      dbFetchCategories(),
      dbFetchProducts({ orderLatest:true, limit: 12 })
    ]);
    
    if(!heroImages && supabase){
      const { data } = await supabase.from('hero_images').select('*').eq('active', true).order('position');
      heroImages = data || [];
      if(heroImages.length) heroCache.set('active', heroImages);
    }
    if(!heroImages.length){
      heroImages = [{ image_url:'/staticfiles/hero-banner.jpg', title: res.locals.siteSetting.name, link_url:'/shop/All/', position:0 }];
    }
    res.render('home', { categories, products: productsList, heroImages, siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error('HOME_RENDER_ERROR', e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load homepage.' });
  }
});

// Cart page with batch loading
app.get('/cart/', async (req,res)=>{
  try {
    const device = req.cookies.device || 'anonymous';
    const cart = getCart(device);
    
    // Batch load products and variants
    const productIds = [...new Set(cart.map(it => it.productId))];
    const variantIds = cart.filter(it => it.variantId).map(it => it.variantId);
    
    const productPromises = productIds.map(id => getAnyProductById(id));
    const productsData = await Promise.all(productPromises);
    const productsMap = new Map(productsData.filter(p => p).map(p => [p.id, p]));
    
    let variantsMap = new Map();
    if(variantIds.length && supabase){
      const { data: variants } = await supabase.from('variants').select('*').in('id', variantIds);
      if(variants) variantsMap = new Map(variants.map(v => [v.id, v]));
    }
    
    const items = cart.map(item => {
      const p = productsMap.get(item.productId);
      if(!p) return { id: item.productId, variantId: null, name: 'Unknown', price: 0, image: '', qty: item.qty, subtotal: 0 };
      
      let finalPrice = parseFloat(p.price) || 0;
      let finalImage = p.image || '';
      let finalName = p.name || p.title || 'Item';
      
      if(item.variantId){
        const variant = variantsMap.get(item.variantId);
        if(variant){
          finalPrice += parseFloat(variant.price_adjustment || 0);
          if(variant.image && variant.image.trim()) finalImage = variant.image;
          const combo = variant.attribute_combination || {};
          const variantLabel = Object.values(combo).filter(v => v).join(' / ');
          if(variantLabel) finalName += ` (${variantLabel})`;
        }
      }
      
      return { 
        id: p.id, 
        variantId: item.variantId || null,
        name: finalName, 
        price: finalPrice, 
        image: finalImage, 
        qty: item.qty, 
        subtotal: finalPrice * item.qty 
      };
    });
    
    const total = items.reduce((s,i)=>s+i.subtotal,0);
    const itemCount = items.reduce((s,i)=>s+i.qty,0);
    res.render('cart', { items, total, itemCount, siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error('CART_PAGE_ERROR', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load cart.' });
  }
});

// Checkout page with batch loading
app.get('/checkout/', async (req, res) => {
  try {
    const device = req.cookies.device || 'anonymous';
    const cart = getCart(device);
    
    // Batch load products and variants
    const productIds = [...new Set(cart.map(it => it.productId))];
    const variantIds = cart.filter(it => it.variantId).map(it => it.variantId);
    
    const productPromises = productIds.map(id => getCachedProduct(id));
    const productsData = await Promise.all(productPromises);
    const productsMap = new Map(productsData.filter(p => p).map(p => [p.id, p]));
    
    let variantsMap = new Map();
    if(variantIds.length && supabase){
      const { data: variants } = await supabase.from('variants').select('*').in('id', variantIds);
      if(variants) variantsMap = new Map(variants.map(v => [v.id, v]));
    }
    
    const items = cart.map(item => {
      const p = productsMap.get(item.productId);
      if(!p) return null;
      
      let finalPrice = parseFloat(p.price) || 0;
      let finalImage = p.image || '';
      let finalName = p.name || p.title || 'Item';
      
      if(item.variantId){
        const variant = variantsMap.get(item.variantId);
        if(variant){
          finalPrice += parseFloat(variant.price_adjustment || 0);
          if(variant.image && variant.image.trim()) finalImage = variant.image;
          const combo = variant.attribute_combination || {};
          const variantLabel = Object.values(combo).filter(v => v).join(' / ');
          if(variantLabel) finalName += ` (${variantLabel})`;
        }
      }
      
      return { 
        id: p.id,
        variantId: item.variantId || null,
        name: finalName, 
        price: finalPrice, 
        image: finalImage, 
        qty: item.qty, 
        subtotal: finalPrice * item.qty 
      };
    }).filter(Boolean);
    
    const total = items.reduce((s,i)=>s+i.subtotal,0);
    if(!items.length) return res.redirect('/cart/');
    res.render('checkout', { items, total, siteSetting: res.locals.siteSetting, googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '' });
  } catch(e){
    console.error('CHECKOUT_PAGE_ERROR', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load checkout.' });
  }
});

// Submit order from checkout
app.post('/checkout/', async (req, res) => {
  try {
    const { name, mobile, email, region, area, address, notes, subtotal, deliveryFee, total, paymentMethod, paymentScreenshot } = req.body;
    
    // Validate required fields
    if(!name || !mobile || !region || !area || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const device = req.cookies.device || 'anonymous';
    const cart = getCart(device);
    
    if(!cart.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // Build order items from cart (including variant info)
    const orderItems = [];
    for(const item of cart){
      const p = await getAnyProductById(item.productId);
      if(p){
        let finalPrice = parseFloat(p.price) || 0;
        let finalImage = p.image || '';
        let finalName = p.name || 'Item';
        let variantInfo = null;
        
        // If variant specified, fetch variant details
        if(item.variantId && supabase){
          const { data: variant } = await supabase.from('variants').select('*').eq('id', item.variantId).single();
          if(variant){
            finalPrice += parseFloat(variant.price_adjustment || 0);
            if(variant.image && variant.image.trim()) finalImage = variant.image;
            variantInfo = variant.attribute_combination || {};
            const variantLabel = Object.values(variantInfo).filter(v => v).join(' / ');
            if(variantLabel) finalName += ` (${variantLabel})`;
          }
        }
        
        orderItems.push({
          productId: p.id,
          variantId: item.variantId || null,
          variantInfo,
          productName: finalName,
          price: finalPrice,
          qty: item.qty,
          subtotal: finalPrice * item.qty,
          image: finalImage
        });
      }
    }
    
    if(!orderItems.length) {
      return res.status(400).json({ error: 'No valid items in cart' });
    }
    
    // Validate payment method
    if(paymentMethod === 'esewa' && !paymentScreenshot){
      return res.status(400).json({ error: 'Payment screenshot required for eSewa payment' });
    }
    
    // Create order in database
    if(supabase){
      const orderData = {
        customer_name: name,
        customer_mobile: mobile,
        customer_email: email || null,
        region,
        area,
        address,
        notes: notes || null,
        subtotal: parseFloat(subtotal),
        delivery_fee: parseFloat(deliveryFee),
        total: parseFloat(total),
        status: 'pending',
        payment_method: paymentMethod || 'cod',
        payment_screenshot: paymentScreenshot || null,
        items: orderItems
        // order_number will be auto-generated by database trigger
      };
      
      console.log('Creating order with payment info:', { 
        paymentMethod, 
        hasScreenshot: !!paymentScreenshot,
        screenshotLength: paymentScreenshot ? paymentScreenshot.length : 0
      });
      
      const { data, error } = await supabase.from('orders').insert(orderData).select().single();
      
      if(error) {
        console.error('ORDER_CREATE_ERROR', error);
        throw error;
      }
      
      // Clear cart after successful order
      carts[device] = [];
      
      res.json({ 
        success: true, 
        orderId: data.id,
        orderNumber: data.order_number,
        message: 'Order placed successfully!' 
      });
    } else {
      // Fallback if no database
      console.warn('Order received but no database configured:', { name, mobile, total });
      carts[device] = [];
      res.json({ 
        success: true, 
        orderId: 'TEMP-' + Date.now(),
        orderNumber: 'TEMP-' + Date.now(),
        message: 'Order received (test mode)' 
      });
    }
  } catch(e){
    console.error('CHECKOUT_SUBMIT_ERROR', e);
    res.status(500).json({ error: 'Failed to place order. Please try again.' });
  }
});

// Set cart quantity (allows decreasing / removing)
app.get('/set_cart_qty/', (req, res) => {
  const { productid, qty, variantid } = req.query;
  if(!productid || typeof qty === 'undefined') return res.status(400).json({ error:'productid and qty required'});
  const q = parseInt(qty,10);
  const device = req.cookies.device || 'anonymous';
  const cart = getCart(device);
  const entry = cart.find(i=>i.productId===productid && i.variantId === (variantid || null));
  if(!entry) return res.status(404).json({ error:'Item not in cart'});
  if(q <= 0){
    const idx = cart.indexOf(entry);
    cart.splice(idx,1);
  } else {
    entry.qty = q;
  }
  return res.json({ ok:true });
});

// -------- SELLER ROUTES --------
function sellerGuard(req,res,next){
  const token = req.cookies.farmer_session;
  if(!token) return res.redirect('/farmers/login');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    if(!decoded || decoded.type !== 'farmer') {
      res.clearCookie('farmer_session');
      return res.redirect('/farmers/login');
    }
    req.farmer = decoded;
    next();
  } catch(e) {
    res.clearCookie('farmer_session');
    return res.redirect('/farmers/login');
  }
}

app.get('/sellers/', async (req,res)=>{
  try {
    let sellers = [];
    if(supabase){
      const { data } = await supabase.from('sellers').select('*').eq('status', 'approved');
      sellers = data || [];
    }
    const categories = await dbFetchCategories();
    res.render('sellers', { sellers, categories, siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load sellers.' });
  }
});

// Keep backward compatibility
app.get('/farmers/', (req,res) => res.redirect('/sellers/'));

app.get('/sellers/signup', (req,res)=>{
  res.render('seller-signup-new', { siteSetting: res.locals.siteSetting });
});

app.post('/api/sellers/signup-send-otp', async (req,res)=>{
  try {
    const { email } = req.body;
    if(!email.endsWith('@cropsay.com')) return res.json({ success:false, message:'Only @cropsay.com emails allowed' });
    
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if(error) return res.json({ success:false, message:'Failed to send OTP' });
    
    console.log('✅ Signup OTP sent to', email);
    res.json({ success:true });
  } catch(e){
    res.json({ success:false, message:e.message });
  }
});

app.post('/api/sellers/signup-verify', async (req,res)=>{
  try {
    const { email, otp, password } = req.body;
    
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    if(error || !data.user) return res.json({ success:false, message:'Invalid OTP' });
    
    const password_hash = await bcrypt.hash(password, 10);
    const username = email.split('@')[0];
    
    const { data: seller, error: createError } = await supabase.from('sellers').insert({
      email,
      full_name: username.charAt(0).toUpperCase() + username.slice(1),
      phone: '+977-' + Math.floor(Math.random() * 9000000000 + 1000000000),
      business_name: username + ' Business',
      password_hash,
      status: 'approved'
    }).select().single();
    
    if(createError) return res.json({ success:false, message:'Failed to create account' });
    
    const sessionCookie = jwt.sign({ farmer_id: seller.id, email, name: seller.full_name, type: 'farmer' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
    res.cookie('farmer_session', sessionCookie, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7*24*60*60*1000, sameSite: 'lax' });
    
    console.log('✅ Seller created and logged in:', seller.id);
    res.json({ success:true });
  } catch(e){
    res.json({ success:false, message:e.message });
  }
});

// Keep backward compatibility
app.get('/farmers/signup', (req,res) => res.redirect('/sellers/signup'));

app.get('/farmers/forgot-password', (req,res)=>{
  res.render('farmer-forgot-password', { siteSetting: res.locals.siteSetting, error: null });
});

app.get('/farmers/reset-password-otp', (req,res)=>{
  res.render('farmer-reset-password-otp', { 
    siteSetting: res.locals.siteSetting,
    process: { env: { 
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    }}
  });
});

app.get('/farmers/reset-password-otp', (req,res)=>{
  res.render('farmer-reset-password-otp', { 
    siteSetting: res.locals.siteSetting,
    process: { env: { 
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    }}
  });
});

app.post('/api/farmers/send-otp', async (req,res)=>{
  try {
    const { email } = req.body;
    if(!email.endsWith('@cropsay.com')) return res.json({ success:false, message:'Only @cropsay.com emails allowed' });
    
    // Use Supabase OTP
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/farmers/signup`
      }
    });

    if(error) {
      console.error('Supabase OTP Error:', error);
      return res.json({ success:false, message:'Failed to send OTP' });
    }

    console.log('OTP sent to', email);
    res.json({ success:true, message:'OTP sent to your email' });
  } catch(e){
    console.error('Send OTP Error:', e);
    res.json({ success:false, message:e.message });
  }
});

app.post('/api/farmers/verify-otp', async (req,res)=>{
  try {
    const { email, otp } = req.body;
    
    // Verify OTP with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'email'
    });

    if(!error && data.user) {
      res.json({ success:true });
    } else {
      return res.json({ success:false, message:'Invalid or expired OTP' });
    }
  } catch(e){
    console.error('Verify OTP Error:', e);
    res.json({ success:false, message:e.message });
  }
});

app.post('/api/farmers/complete-signup', async (req,res)=>{
  try {
    const { email, name, phone, password, businessName } = req.body;

    // Validate required fields
    if (!email || !name || !phone || !password || !businessName) {
      return res.json({ success: false, message: 'All fields are required' });
    }

    // Hash password so farmer can log in later
    const password_hash = await bcrypt.hash(password, 10);

    // Check if farmer already exists
    const { data: existingFarmer, error: checkError } = await supabase
      .from('farmers')
      .select('id')
      .eq('email', email)
      .single();

    if (existingFarmer) {
      return res.json({ success: false, message: 'Farmer already exists with this email' });
    }

    // Create farmer record using service role (bypass RLS)
    const { data: newFarmer, error: insertError } = await supabase
      .from('farmers')
      .insert({
        email,
        full_name: name,
        phone,
        business_name: businessName,
        status: 'approved', // Auto-approve for now
        password_hash
      })
      .select()
      .single();

    if (insertError) {
      console.error('Farmer insert error:', insertError);
      return res.json({ success: false, message: 'Failed to create farmer account: ' + insertError.message });
    }

    if (!newFarmer) {
      console.error('No farmer returned after insert');
      return res.json({ success: false, message: 'Failed to create farmer account: No data returned' });
    }

    // Create session cookie for automatic login
    const sessionCookie = jwt.sign(
      {
        farmer_id: newFarmer.id,
        email: email,
        name: name,
        type: 'farmer'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.cookie('farmer_session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax'
    });

    console.log('Farmer created successfully:', newFarmer.id, email);

    res.json({
      success: true,
      message: 'Signup successful',
      redirectUrl: '/farmers/dashboard'
    });

  } catch(e){
    console.error('Complete signup error:', e);
    res.json({ success: false, message: 'Error completing signup: ' + e.message });
  }
});

app.post('/api/farmers/forgot-password', async (req,res)=>{
  try {
    const { email } = req.body;
    
    if(!email.endsWith('@cropsay.com')) {
      return res.json({ success:false, message:'Only @cropsay.com emails are allowed' });
    }
    
    // Check sellers table for the email
    let { data: seller, error: queryError } = await supabase
      .from('sellers')
      .select('id, email, status')
      .eq('email', email)
      .single();
    
    // If seller doesn't exist, create one automatically
    if(queryError || !seller) {
      console.log('📝 Creating new seller for:', email);
      const username = email.split('@')[0];
      const { data: newSeller, error: createError } = await supabase
        .from('sellers')
        .insert({
          email,
          full_name: username.charAt(0).toUpperCase() + username.slice(1),
          phone: '+977-' + Math.floor(Math.random() * 9000000000 + 1000000000),
          business_name: username + ' Business',
          status: 'approved'
        })
        .select('id, email, status')
        .single();
      
      if(createError) {
        console.error('❌ Failed to create seller:', createError);
        return res.json({ success:false, message:'Failed to create account' });
      }
      
      seller = newSeller;
      console.log('✅ New seller created:', seller.id);
    }
    
    if(seller.status !== 'approved') {
      console.log('❌ Account not approved:', email, 'Status:', seller.status);
      return res.json({ success:false, message:'Account not approved' });
    }
    
    // Use Supabase OTP for email
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false
      }
    });

    if(error) {
      console.error('❌ Supabase OTP Error:', error);
      return res.json({ success:false, message:'Failed to send OTP' });
    }

    console.log('✅ OTP sent to', email);
    res.json({ success:true, message:'OTP sent to your email' });
  } catch(e){
    console.error('💥 Forgot Password Error:', e);
    res.json({ success:false, message:e.message });
  }
});

app.post('/api/farmers/verify-reset-otp', async (req,res)=>{
  try {
    const { email, otp } = req.body;
    
    // Verify OTP with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'email'
    });

    if(error || !data.user) {
      return res.json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Store verified email for password reset
    otpStore[email] = { verified: true, expiry: Date.now() + (10 * 60 * 1000) };
    
    res.json({ success: true, message: 'OTP verified' });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

app.post('/api/farmers/reset-password', async (req,res)=>{
  try {
    const { email, password } = req.body;
    
    // Check if OTP was verified
    if (!otpStore[email] || !otpStore[email].verified || Date.now() > otpStore[email].expiry) {
      return res.json({ success: false, message: 'OTP verification expired. Please verify OTP again.' });
    }
    
    if (!password || password.length < 6) {
      return res.json({ success: false, message: 'Password must be at least 6 characters' });
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    console.log('🔐 Updating password for:', email, 'New hash length:', password_hash.length);
    
    // Check if seller exists, create if needed (same as forgot password)
    let { data: seller } = await supabase
      .from('sellers')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (!seller && email.endsWith('@cropsay.com')) {
      console.log('📝 Creating seller during password reset for:', email);
      const username = email.split('@')[0];
      const { data: newSeller, error: createError } = await supabase
        .from('sellers')
        .insert({
          email,
          full_name: username.charAt(0).toUpperCase() + username.slice(1),
          phone: '+977-' + Math.floor(Math.random() * 9000000000 + 1000000000),
          business_name: username + ' Business',
          status: 'approved'
        })
        .select('id, email')
        .single();
      
      if (createError) {
        console.error('❌ Failed to create seller during reset:', createError);
        return res.json({ success: false, message: 'Failed to create account' });
      }
      seller = newSeller;
    }
    
    if (!seller) {
      console.error('❌ No user found with email:', email);
      return res.json({ success: false, message: 'User not found' });
    }
    
    // Update password
    const { data: updateResult, error: updateError } = await supabase
      .from('sellers')
      .update({ password_hash, updated_at: new Date().toISOString() })
      .eq('email', email)
      .select('id, email');
    
    if (updateError) {
      console.error('❌ Password update error:', updateError);
      return res.json({ success: false, message: 'Failed to reset password: ' + updateError.message });
    }
    
    delete otpStore[email];
    console.log('✅ Password reset successful for:', email, 'User ID:', updateResult[0].id);
    res.json({ success: true, message: 'Password reset successful' });
  } catch(e){
    console.error('💥 Reset password error:', e);
    res.json({ success: false, message: e.message });
  }
});

// Sellers login (redirect to farmers for backward compatibility)
app.get('/sellers/login', (req,res) => res.redirect('/farmers/login'));

app.get('/farmers/login', (req,res)=>{
  const token = req.cookies.farmer_session;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      if (decoded && decoded.type === 'farmer') {
        return res.redirect('/farmers/dashboard');
      }
    } catch (e) {
      // Invalid token, clear it and show login page
      res.clearCookie('farmer_session');
    }
  }
  res.render('farmer-login', { siteSetting: res.locals.siteSetting, error: null });
});

// Development-only debug endpoints: inspect farmer record and test password
if (process.env.NODE_ENV !== 'production') {
  app.get('/admin/debug/farmer', async (req, res) => {
    try {
      const email = req.query.email;
      if (!email) return res.json({ success: false, message: 'email query param required' });

      const { data, error } = await supabase.from('sellers').select('id,email,status,password_hash,full_name,created_at').eq('email', email).single();
      if (error) return res.json({ success: false, message: error.message });

      return res.json({
        success: true,
        farmer: {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          status: data.status,
          has_password_hash: !!data.password_hash,
          password_hash_length: data.password_hash ? data.password_hash.length : 0,
          created_at: data.created_at
        }
      });
    } catch (e) {
      console.error('Debug farmer error:', e);
      res.json({ success: false, message: e.message });
    }
  });
  
  app.post('/admin/debug/test-password', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.json({ success: false, message: 'email and password required' });

      const { data, error } = await supabase.from('sellers').select('password_hash').eq('email', email).single();
      if (error) return res.json({ success: false, message: error.message });
      if (!data.password_hash) return res.json({ success: false, message: 'No password hash found' });

      const match = await bcrypt.compare(password, data.password_hash);
      return res.json({
        success: true,
        password_match: match,
        hash_info: {
          length: data.password_hash.length,
          starts_with: data.password_hash.substring(0, 10) + '...'
        }
      });
    } catch (e) {
      console.error('Debug password test error:', e);
      res.json({ success: false, message: e.message });
    }
  });
}

// Sellers login POST (redirect to farmers for backward compatibility)
app.post('/sellers/login', (req,res) => res.redirect(307, '/farmers/login'));

app.post('/farmers/login', async (req,res)=>{
  const { email, password } = req.body;
  
  // Validate input
  if (!email || !password) {
    return res.render('farmer-login', { siteSetting: res.locals.siteSetting, error: 'Email and password are required.' });
  }
  
  if(!supabase) return res.render('farmer-login', { siteSetting: res.locals.siteSetting, error: 'Database not configured.' });
  
  try {
    console.log('🔐 Login attempt for:', email);
    
    // Find the seller (bypass RLS with service role)
    const { data: sellers, error: queryError } = await supabase
      .from('sellers')
      .select('*')
      .eq('email', email);
    
    if(queryError) {
      console.error('❌ Database query error:', queryError.message);
      return res.render('farmer-login', { siteSetting: res.locals.siteSetting, error: 'Login failed. Please try again.' });
    }

    if(!sellers || sellers.length === 0) {
      console.log('❌ Seller not found:', email);
      return res.render('farmer-login', { siteSetting: res.locals.siteSetting, error: 'Invalid email or password.' });
    }

    const farmer = sellers[0];
    console.log('👤 Farmer found:', {
      email: farmer.email,
      status: farmer.status,
      hasPassword: !!farmer.password_hash,
      passwordLength: farmer.password_hash ? farmer.password_hash.length : 0
    });

    // Check if password is set
    if (!farmer.password_hash) {
      console.log('❌ No password set for:', email);
      return res.render('farmer-login', { siteSetting: res.locals.siteSetting, error: 'No password is set for this account. Please use "Forgot Password" to set one.' });
    }

    // Check account status
    if(farmer.status !== 'approved') {
      console.log('❌ Account not approved:', email, 'Status:', farmer.status);
      return res.render('farmer-login', { siteSetting: res.locals.siteSetting, error: 'Your account is not approved yet. Please contact support.' });
    }

    // Verify password
    console.log('🔍 Verifying password for:', email);
    const passwordMatch = await bcrypt.compare(password, farmer.password_hash);
    console.log('🔐 Password verification result:', passwordMatch);
    
    if(!passwordMatch) {
      console.log('❌ Password mismatch for:', email);
      return res.render('farmer-login', { siteSetting: res.locals.siteSetting, error: 'Invalid email or password.' });
    }

    console.log('✅ Login successful for:', email);

    // Create session
    const sessionCookie = jwt.sign(
      {
        farmer_id: farmer.id,
        email: farmer.email,
        name: farmer.full_name || farmer.name || '',
        type: 'farmer'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.cookie('farmer_session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax'
    });

    res.redirect('/farmers/dashboard');
  } catch(e){
    console.error('💥 Login error:', e.message, e.stack);
    res.render('farmer-login', { siteSetting: res.locals.siteSetting, error: 'Login failed. Please try again.' });
  }
});

app.post('/farmers/logout', (req,res)=>{
  res.clearCookie('farmer_session');
  res.redirect('/farmers/login');
});

// Sellers dashboard (redirect to farmers for now)
app.get('/sellers/dashboard', sellerGuard, async (req,res)=>{
  try {
    const token = req.cookies.farmer_session;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const farmerId = decoded.farmer_id;

    if (!farmerId) {
      return res.status(401).render('simple-message', { title:'Error', message:'Invalid session. Please login again.' });
    }

    const { data: farmer, error: farmerError } = await supabase.from('sellers').select('*').eq('id', farmerId).single();
    
    if (farmerError || !farmer) {
      console.error('Seller not found:', farmerError);
      return res.status(404).render('simple-message', { title:'Error', message:'Seller profile not found.' });
    }

    const { data: products } = await supabase.from('products').select('*').eq('seller_id', farmerId);
    const { data: posts } = await supabase.from('seller_posts').select('*').eq('seller_id', farmerId).order('created_at', { ascending:false });
    
    res.render('farmer-dashboard', { farmer, products: products||[], posts: posts||[], siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error('Dashboard error:', e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load dashboard.' });
  }
});

app.get('/farmers/dashboard', sellerGuard, async (req,res)=>{
  try {
    // Decode JWT token to get farmer_id
    const token = req.cookies.farmer_session;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const farmerId = decoded.farmer_id;

    if (!farmerId) {
      return res.status(401).render('simple-message', { title:'Error', message:'Invalid session. Please login again.' });
    }

    const { data: farmer, error: farmerError } = await supabase.from('sellers').select('*').eq('id', farmerId).single();
    
    if (farmerError || !farmer) {
      console.error('Farmer not found:', farmerError);
      return res.status(404).render('simple-message', { title:'Error', message:'Farmer profile not found.' });
    }

    const { data: products } = await supabase.from('products').select('*').eq('seller_id', farmerId);
    const { data: posts } = await supabase.from('seller_posts').select('*').eq('seller_id', farmerId).order('created_at', { ascending:false });
    
    res.render('farmer-dashboard', { farmer, products: products||[], posts: posts||[], siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error('Dashboard error:', e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load dashboard.' });
  }
});

// ---- Farmer Product CRUD ----

// List farmer's products
app.get('/farmers/products', sellerGuard, async (req, res) => {
  try {
    const token = req.cookies.farmer_session;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const farmerId = decoded.farmer_id;

    const { data: farmer } = await supabase.from('farmers').select('full_name').eq('id', farmerId).single();
    const { data: products } = await supabase.from('products').select('*').eq('farmer_id', farmerId).order('created_at', { ascending: false });

    res.render('farmer-products', {
      farmer,
      products: products || [],
      siteSetting: res.locals.siteSetting,
      msg: req.query.msg || null
    });
  } catch (e) {
    console.error('Farmer products list error:', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load products.' });
  }
});

// Show form to create new product
app.get('/farmers/products/new', sellerGuard, async (req, res) => {
  try {
    const token = req.cookies.farmer_session;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const { data: farmer } = await supabase.from('farmers').select('full_name').eq('id', decoded.farmer_id).single();
    
    const categories = await dbFetchCategories();
    
    res.render('farmer-product-form', {
      item: null,
      farmer,
      categories,
      siteSetting: res.locals.siteSetting
    });
  } catch (e) {
    console.error('Farmer new product form error:', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load form.' });
  }
});

// Handle creation of new product
app.post('/farmers/products/new', sellerGuard, upload.single('image'), async (req, res) => {
  try {
    const token = req.cookies.farmer_session;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const farmerId = decoded.farmer_id;

    const { name, price, stock, category, short_description, long_description } = req.body;
    const image = req.file ? '/media/uploads/' + req.file.filename : null;

    const { error } = await supabase.from('products').insert({
      name,
      price: parseFloat(price),
      stock: parseInt(stock || 0),
      category: category || 'Organic',
      short_description,
      long_description,
      image,
      farmer_id: farmerId,
      active: true, // Auto-approve products for now
      type: 'Product'
    });

    if (error) throw error;

    res.redirect('/farmers/products?msg=' + encodeURIComponent('Product created successfully!'));
  } catch (e) {
    console.error('Farmer create product error:', e);
    res.redirect('/farmers/products?msg=' + encodeURIComponent('Error: Failed to create product.'));
  }
});

// Show form to edit a product
app.get('/farmers/products/:id/edit', sellerGuard, async (req, res) => {
  try {
    const token = req.cookies.farmer_session;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const farmerId = decoded.farmer_id;
    const { id } = req.params;

    const { data: farmer } = await supabase.from('farmers').select('full_name').eq('id', farmerId).single();
    const { data: item, error } = await supabase.from('products').select('*').eq('id', id).single();

    if (error || !item) return res.status(404).render('simple-message', { title: 'Not Found', message: 'Product not found.' });
    if (item.farmer_id !== farmerId) return res.status(403).render('simple-message', { title: 'Forbidden', message: 'You do not own this product.' });

    const categories = await dbFetchCategories();

    res.render('farmer-product-form', {
      item,
      farmer,
      categories,
      siteSetting: res.locals.siteSetting
    });
  } catch (e) {
    console.error('Farmer edit product form error:', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load form.' });
  }
});

// Handle update of a product
app.post('/farmers/products/:id/edit', sellerGuard, upload.single('image'), async (req, res) => {
  try {
    const token = req.cookies.farmer_session;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const farmerId = decoded.farmer_id;
    const { id } = req.params;

    const { data: existingProduct } = await supabase.from('products').select('id, farmer_id, image').eq('id', id).single();
    if (!existingProduct || existingProduct.farmer_id !== farmerId) {
      return res.status(403).render('simple-message', { title: 'Forbidden', message: 'You do not own this product.' });
    }

    const { name, price, stock, category, short_description, long_description } = req.body;
    
    const updateData = {
      name,
      price: parseFloat(price),
      stock: parseInt(stock || 0),
      category: category || 'Organic',
      short_description,
      long_description,
    };

    if (req.file) {
      updateData.image = '/media/uploads/' + req.file.filename;
    }

    const { error } = await supabase.from('products').update(updateData).eq('id', id);

    if (error) throw error;

    res.redirect('/farmers/products?msg=' + encodeURIComponent('Product updated successfully!'));
  } catch (e) {
    console.error('Farmer update product error:', e);
    res.redirect('/farmers/products?msg=' + encodeURIComponent('Error: Failed to update product.'));
  }
});

// Handle deletion of a product
app.post('/farmers/products/:id/delete', sellerGuard, async (req, res) => {
  try {
    const token = req.cookies.farmer_session;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const farmerId = decoded.farmer_id;
    const { id } = req.params;

    const { data: product } = await supabase.from('products').select('id, farmer_id').eq('id', id).single();
    if (!product || product.farmer_id !== farmerId) {
      return res.status(403).render('simple-message', { title: 'Forbidden', message: 'You do not own this product.' });
    }

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) throw error;

    res.redirect('/farmers/products?msg=' + encodeURIComponent('Product deleted successfully.'));
  } catch (e) {
    console.error('Farmer delete product error:', e);
    res.redirect('/farmers/products?msg=' + encodeURIComponent('Error: Failed to delete product.'));
  }
});

app.post('/farmers/profile/update', sellerGuard, upload.fields([{name:'profile_image'},{name:'cover_image'}]), async (req,res)=>{
  try {
    // Decode JWT to get farmer_id
    const token = req.cookies.farmer_session;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const farmerId = decoded.farmer_id;

    const { full_name, phone, business_name, location, bio } = req.body;
    const updateData = { full_name, phone, business_name, location, bio };
    if(req.files?.profile_image) updateData.profile_image = '/media/uploads/' + req.files.profile_image[0].filename;
    if(req.files?.cover_image) updateData.cover_image = '/media/uploads/' + req.files.cover_image[0].filename;
    
    await supabase.from('farmers').update(updateData).eq('id', farmerId);
    res.json({ success:true });
  } catch(e){
    res.status(500).json({ error:e.message });
  }
});

app.post('/farmers/posts/add', sellerGuard, upload.single('media_file'), async (req,res)=>{
  try {
    // Decode JWT to get farmer_id
    const token = req.cookies.farmer_session;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const farmerId = decoded.farmer_id;

    const { content, media_type, media_url } = req.body;
    let finalUrl = media_url;
    if(req.file) finalUrl = '/media/uploads/' + req.file.filename;
    await supabase.from('farmer_posts').insert({ farmer_id:farmerId, content, media_type, media_url:finalUrl });
    res.json({ success:true });
  } catch(e){
    res.status(500).json({ error:e.message });
  }
});

app.get('/sellers/:id', async (req,res)=>{
  try {
    const { data: seller } = await supabase.from('sellers').select('*').eq('id', req.params.id).eq('status', 'approved').single();
    if(!seller) return res.status(404).render('simple-message', { title:'Not Found', message:'Seller not found.' });
    const { data: posts } = await supabase.from('seller_posts').select('*').eq('seller_id', req.params.id).order('created_at', { ascending:false });
    const { data: products } = await supabase.from('products').select('*').eq('seller_id', req.params.id).eq('active', true);
    res.render('farmer-profile', { farmer: seller, posts: posts||[], products: products||[], siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load seller profile.' });
  }
});

app.post('/api/farmer-applications', async (req,res)=>{
  try {
    const { full_name, phone, email, business_name, location, message } = req.body;
    await supabase.from('farmer_applications').insert({ full_name, phone, email, business_name, location, message });
    res.json({ success:true });
  } catch(e){
    res.status(500).json({ error:e.message });
  }
});

app.get('/admin/farmer-applications', adminGuard, async (req,res)=>{
  try {
    const { data: applications } = await supabase.from('farmer_applications').select('*').order('created_at', { ascending:false });
    res.render('admin/farmer-applications', { active: 'farmer-applications', applications: applications||[], msg: req.query.msg||'', siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load applications.' });
  }
});

app.post('/admin/farmer-applications/approve', adminGuard, async (req,res)=>{
  try {
    const { application_id, email_prefix, password } = req.body;
    const { data: app } = await supabase.from('farmer_applications').select('*').eq('id', application_id).single();
    const email = email_prefix + '@cropsay.com';
    const password_hash = await bcrypt.hash(password, 10);
    await supabase.from('farmers').insert({ email, full_name:app.full_name, phone:app.phone, business_name:app.business_name, location:app.location, password_hash, status:'approved' });
    await supabase.from('farmer_applications').update({ status:'approved', reviewed_at:new Date().toISOString() }).eq('id', application_id);
    res.json({ success:true, email, password });
  } catch(e){
    res.status(500).json({ error:e.message });
  }
});

app.post('/admin/farmer-applications/reject', adminGuard, async (req,res)=>{
  try {
    await supabase.from('farmer_applications').update({ status:'rejected', reviewed_at:new Date().toISOString() }).eq('id', req.body.application_id);
    res.json({ success:true });
  } catch(e){
    res.status(500).json({ error:e.message });
  }
});

// -------- COMPREHENSIVE SELLER MANAGEMENT ROUTES --------

// Seller management dashboard
app.get('/admin/sellers', adminGuard, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status || '';
    const searchQuery = req.query.search || '';
    const sortBy = req.query.sort || 'created_at';
    
    let query = supabase.from('sellers').select('*', { count: 'exact' });
    
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    
    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,business_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }
    
    query = query.order(sortBy, { ascending: sortBy === 'full_name' }).range(offset, offset + limit - 1);
    
    const { data: sellers, error, count } = await query;
    if (error) throw error;
    
    // Get statistics
    const [totalRes, activeRes, pendingRes, productsRes] = await Promise.all([
      supabase.from('sellers').select('*', { count: 'exact', head: true }),
      supabase.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('products').select('*', { count: 'exact', head: true })
    ]);
    
    const stats = {
      total: totalRes.count || 0,
      active: activeRes.count || 0,
      pending: pendingRes.count || 0,
      totalProducts: productsRes.count || 0
    };
    
    const totalPages = Math.ceil((count || 0) / limit);
    
    res.render('admin/seller-management', {
      active: 'sellers',
      sellers: sellers || [],
      stats,
      currentPage: page,
      totalPages,
      statusFilter,
      searchQuery,
      msg: req.query.msg || '',
      siteSetting: res.locals.siteSetting
    });
  } catch (e) {
    console.error('SELLER_MANAGEMENT_ERROR', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load seller management.' });
  }
});

// Export sellers to CSV (must be before :id route)
app.get('/admin/sellers/export', adminGuard, async (req, res) => {
  try {
    const { data: sellers, error } = await supabase
      .from('sellers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Create CSV content
    const headers = ['ID', 'Full Name', 'Email', 'Phone', 'Business Name', 'Location', 'Status', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...sellers.map(seller => [
        seller.id,
        `"${seller.full_name || ''}"`,
        `"${seller.email || ''}"`,
        `"${seller.phone || ''}"`,
        `"${seller.business_name || ''}"`,
        `"${seller.location || ''}"`,
        seller.status,
        new Date(seller.created_at).toISOString().split('T')[0]
      ].join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sellers-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (e) {
    console.error('EXPORT_SELLERS_ERROR', e);
    res.status(500).json({ error: 'Failed to export sellers' });
  }
});

// Get single seller details
app.get('/admin/sellers/:id', adminGuard, async (req, res) => {
  try {
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json(seller);
  } catch (e) {
    console.error('SELLER_FETCH_ERROR', e);
    res.status(500).json({ error: 'Failed to fetch seller' });
  }
});

// Add new seller
app.post('/admin/sellers/add', adminGuard, upload.single('profile_image'), async (req, res) => {
  try {
    const { full_name, email, phone, business_name, location, status, bio } = req.body;
    const profile_image = req.file ? '/media/uploads/' + req.file.filename : null;
    
    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const password_hash = await bcrypt.hash(tempPassword, 10);
    
    const { data, error } = await supabase.from('sellers').insert({
      full_name,
      email,
      phone,
      business_name,
      location,
      status: status || 'approved',
      bio,
      profile_image,
      password_hash
    }).select().single();
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      seller: data,
      tempPassword,
      message: 'Seller added successfully' 
    });
  } catch (e) {
    console.error('ADD_SELLER_ERROR', e);
    res.status(500).json({ error: e.message });
  }
});

// Approve seller
app.post('/admin/sellers/:id/approve', adminGuard, async (req, res) => {
  try {
    const { error } = await supabase
      .from('farmers')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('APPROVE_SELLER_ERROR', e);
    res.status(500).json({ error: 'Failed to approve seller' });
  }
});

// Suspend seller
app.post('/admin/sellers/:id/suspend', adminGuard, async (req, res) => {
  try {
    const { error } = await supabase
      .from('farmers')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('SUSPEND_SELLER_ERROR', e);
    res.status(500).json({ error: 'Failed to suspend seller' });
  }
});

// Reactivate seller
app.post('/admin/sellers/:id/reactivate', adminGuard, async (req, res) => {
  try {
    const { error } = await supabase
      .from('farmers')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('REACTIVATE_SELLER_ERROR', e);
    res.status(500).json({ error: 'Failed to reactivate seller' });
  }
});

// Delete seller
app.post('/admin/sellers/:id/delete', adminGuard, async (req, res) => {
  try {
    // First, update all products to remove seller reference
    await supabase.from('products').update({ farmer_id: null }).eq('farmer_id', req.params.id);
    
    // Then delete the seller
    const { error } = await supabase.from('farmers').delete().eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE_SELLER_ERROR', e);
    res.status(500).json({ error: 'Failed to delete seller' });
  }
});

// Edit seller form
app.get('/admin/sellers/:id/edit', adminGuard, async (req, res) => {
  try {
    const { data: seller, error } = await supabase.from('sellers').select('*').eq('id', req.params.id).single();
    if (error || !seller) return res.status(404).render('simple-message', { title: 'Not Found', message: 'Seller not found.' });
    res.render('admin/seller-form', { seller, siteSetting: res.locals.siteSetting });
  } catch (e) {
    console.error('SELLER_EDIT_ERROR', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load seller.' });
  }
});

// Update seller
app.post('/admin/sellers/:id/edit', adminGuard, async (req, res) => {
  try {
    const { full_name, email, phone, business_name, location, status } = req.body;
    const { error } = await supabase.from('sellers').update({
      full_name, email, phone, business_name, location, status
    }).eq('id', req.params.id);
    if (error) throw error;
    res.redirect('/admin/sellers?msg=' + encodeURIComponent('Seller updated successfully'));
  } catch (e) {
    console.error('SELLER_UPDATE_ERROR', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to update seller.' });
  }
});



// Seller applications (using seller_applications view)
app.post('/api/seller-applications', async (req, res) => {
  try {
    const { full_name, phone, email, business_name, location, message } = req.body;
    await supabase.from('seller_applications').insert({ full_name, phone, email, business_name, location, message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin seller applications management
app.get('/admin/seller-applications', adminGuard, async (req, res) => {
  try {
    const { data: applications } = await supabase.from('seller_applications').select('*').order('created_at', { ascending: false });
    res.render('admin/seller-applications', { active: 'seller-applications', applications: applications || [], msg: req.query.msg || '', siteSetting: res.locals.siteSetting });
  } catch (e) {
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load applications.' });
  }
});

app.post('/admin/seller-applications/approve', adminGuard, async (req, res) => {
  try {
    const { application_id, email_prefix, password } = req.body;
    const { data: app } = await supabase.from('seller_applications').select('*').eq('id', application_id).single();
    const email = email_prefix + '@cropsay.com';
    const password_hash = await bcrypt.hash(password, 10);
    await supabase.from('sellers').insert({ email, full_name: app.full_name, phone: app.phone, business_name: app.business_name, location: app.location, password_hash, status: 'approved' });
    await supabase.from('seller_applications').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', application_id);
    res.json({ success: true, email, password });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/seller-applications/reject', adminGuard, async (req, res) => {
  try {
    await supabase.from('seller_applications').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', req.body.application_id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve remaining static assets with caching
app.use('/', express.static(path.join(__dirname, staticRoot), { 
  index: false,
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Catch-all 404 handler: render the simple-message template so we keep the minimal Not Found UI
app.use(function(req, res){
  // Prefer specific messages for product/category-like routes
  let message = 'Page not found.';
  try{
    if(String(req.path).startsWith('/details/') || String(req.path).startsWith('/product')) message = 'Product not found.';
    if(String(req.path).startsWith('/shop/')) message = 'Category not found.';
  }catch(e){}
  return res.status(404).render('simple-message', { title: 'Not Found', message });
});

function start(port, attempt=0){
  const srv = app.listen(port, () => {
    // Enable HTTP keep-alive
    srv.keepAliveTimeout = 65000;
    srv.headersTimeout = 66000;
    console.log('='.repeat(60));
    console.log(`✓ All Strawhats Server [${NODE_ENV.toUpperCase()}]`);
    console.log(`✓ Running on http://localhost:${port}`);
    console.log(`✓ Admin panel: http://localhost:${port}/admin/`);
    if (NODE_ENV !== 'production') {
      console.log(`✓ Debug endpoints:`);
      console.log(`  - http://localhost:${port}/__debug_env`);
      console.log(`  - http://localhost:${port}/__debug_products`);
      console.log(`  - http://localhost:${port}/__debug_lookup?productid=YOUR_ID`);
    }
    console.log('='.repeat(60));
  });
  srv.on('error', (err)=>{
    if(err.code === 'EADDRINUSE' && attempt < 5){
      const next = port + 1;
      console.warn(`Port ${port} in use, trying ${next}...`);
      start(next, attempt+1);
    } else {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });
}
start(Number(PORT));
