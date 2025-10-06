const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client (service role if performing admin ops server-side)
let supabase = null;
if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  supabase = createClient(process.env.SUPABASE_URL, key, {
    auth: { persistSession: false }
  });
  console.log('✓ Supabase client initialized', { 
    url: process.env.SUPABASE_URL, 
    keyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon' 
  });
} else {
  console.warn('Supabase environment variables not set. Admin features disabled until configured.');
}

// Settings helpers (uses 'settings' table: key text primary key, value jsonb, updated_at timestamptz default now())
async function getSetting(key, fallback = null){
  if(!supabase) return fallback;
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).single();
  if(error) return fallback;
  return data.value;
}
async function setSetting(key, value){
  if(!supabase) return false;
  const { error } = await supabase.from('settings').upsert({ key, value });
  if(error){ console.error('Failed to set setting', key, error); return false; }
  return true;
}

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req,res,next)=>{
  res.locals.title = 'All Strawhats';
  next();
});

// -------- Site Setting Injection (for dynamic logo/name in admin UI) --------
let siteCache = { value: null, fetchedAt: 0 };
async function loadSiteSetting(force=false){
  if(!supabase) return { name: 'All Strawhats', logo_url: '/staticfiles/brand.svg' };
  if(!force && siteCache.value && Date.now() - siteCache.fetchedAt < 60_000){
    return siteCache.value;
  }
  try {
    const site = await getSetting('site', { name: 'All Strawhats', logo_url: '/staticfiles/brand.svg' });
    siteCache = { value: site, fetchedAt: Date.now() };
    return site;
  } catch(e){
    return { name: 'All Strawhats', logo_url: '/staticfiles/brand.svg' };
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
  res.render('admin/theme-customizer', { colors, siteSetting: res.locals.siteSetting });
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
  next();
});

// In-memory storage (per process). In production use a DB or persistent store.
const carts = {}; // key: device id, value: array of cart line items

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
  console.log('→ getAnyProductById called', { id, hasSupabase: !!supabase });
  
  if(supabase){
    try {
      // Direct query by id (UUID primary key) - service role bypasses RLS
      const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
      
      if(error){
        console.error('❌ SUPABASE_PRODUCT_LOOKUP_ERROR', { id, error: error.message, code: error.code, details: error.details, hint: error.hint });
      } else if(data) {
        console.log('✓ SUPABASE_PRODUCT_LOOKUP_SUCCESS', { id, name: data.name, active: data.active });
        return data;
      } else {
        console.warn('⚠ SUPABASE_PRODUCT_LOOKUP_EMPTY', { id, message: 'Query succeeded but returned no data (likely RLS block or product does not exist)' });
      }

    } catch(e){ 
      console.error('💥 SUPABASE_PRODUCT_LOOKUP_EXCEPTION', { id, error: e.message, stack: e.stack }); 
    }
  }
  
  // Fallback to in-memory products
  const memMatch = products.find(p=>p.id === id);
  if(memMatch) {
    console.log('✓ Found in memory fallback', { id });
    return memMatch;
  }
  
  console.warn('❌ Product not found anywhere', { id });
  return null;
}

// --- Data access helpers (DB first, fallback to in-memory) ---
async function dbFetchProducts(filter = {}) {
  if(!supabase) {
    let list = products.filter(p=>p.active!==false);
    if(filter.category) list = list.filter(p=> (p.category||'').toLowerCase() === filter.category.toLowerCase());
    if(filter.id) list = list.filter(p=> p.id === filter.id);
    return list;
  }
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
  return data || [];
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

let categoriesCache = { data: null, fetchedAt: 0 };
async function dbFetchCategories(force=false){
  if(!supabase) return fallbackCategories;
  if(!force && categoriesCache.data && (Date.now()-categoriesCache.fetchedAt)<30_000){
    return categoriesCache.data;
  }
  const { data, error } = await supabase.from('categories').select('*').order('created_at');
  if(error){ console.error('DB_CATEGORIES_ERROR', error); return fallbackCategories; }
  // Normalize to ensure .image always exists for templates
  const normalized = (data||[]).map(c=> ({ ...c, image: c.image_url || c.image || '' }));
  categoriesCache = { data: normalized, fetchedAt: Date.now() };
  return normalized;
}

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Serve static frontend (index.html) and assets.
// Dynamic root resolution so we can rename legacy folder (stickersnepal.com -> mugiwara) without code changes.
// Add any newly renamed static bundles here; order = priority.
const STATIC_ROOT_CANDIDATES = ['strawhats', 'mugiwara', 'stickersnepal.com', 'allstrawhats'];
const staticRoot = STATIC_ROOT_CANDIDATES.find(dir => {
  try { return fs.existsSync(path.join(__dirname, dir)); } catch(e){ return false; }
}) || 'stickersnepal.com';
console.log('✓ Static root resolved:', staticRoot);
app.use('/media', express.static(path.join(__dirname, staticRoot, 'media')));
app.use('/staticfiles', express.static(path.join(__dirname, staticRoot, 'staticfiles')));
// NOTE: root static ("/") is mounted at bottom after dynamic routes.

// -------- Multer Configuration for File Uploads --------
// Use dynamic staticRoot so uploaded media stays inside the active static directory
const uploadDir = path.join(__dirname, staticRoot, 'media', 'uploads');
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
    let stats = { products: products.length, categories: fallbackCategories.length };
    if (supabase) {
      const [{ count: pCount }, { count: cCount }] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true })
      ]);
      stats = { products: pCount || 0, categories: cCount || 0 };
    }
  res.render('admin/dashboard', { stats, siteSetting: res.locals.siteSetting });
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
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending:false }).limit(200);
      if (!error && data) list = data;
    }
  res.render('admin/products', { items: list, msg: req.query.msg || '', siteSetting: res.locals.siteSetting });
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
    res.render('admin/categories', { items: list, msg: req.query.msg || '', siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load categories.' });
  }
});

app.post('/admin/categories/new', adminGuard, upload.single('imageFile'), async (req,res)=>{
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
  res.render('admin/settings', { site, customColors, seo, social, msg: req.query.msg || '', siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load settings.' });
  }
});

app.post('/admin/settings', adminGuard, async (req,res)=>{
  const { name, logo_url, new_password, primary_color, secondary_color, success_color, danger_color,
    meta_description, meta_keywords, site_tagline, og_title, og_description, og_image,
    twitter_card, twitter_handle, google_analytics, google_verification, facebook_pixel,
    facebook_url, instagram_url, twitter_url, youtube_url, tiktok_url, contact_email, phone_number } = req.body;
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
  res.render('admin/hero-images', { items: list, msg: req.query.msg || '', siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load hero images.' });
  }
});

app.post('/admin/hero-images/new', adminGuard, upload.single('imageFile'), async (req,res)=>{
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

// Category route matching existing links like /shop/DC-Studios/
app.get('/shop/:category/', async (req, res) => {
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

// Product details page
app.get('/details/:id/', async (req,res)=>{
  try {
    const id = req.params.id;
    const product = await dbFetchProductById(id);
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

// Add to cart endpoint (front-end calls /add_to_cart/?productid=..&qty=..)
app.get('/add_to_cart/', async (req, res) => {
  try {
    const { productid, qty } = req.query;
    console.log('🛒 ADD_TO_CART request', { productid, qty, cookies: req.cookies });
    
    if (!productid || !qty) {
      console.warn('❌ Missing params');
      return res.status(400).json({ error: 'productid and qty required' });
    }
    
    const trimmed = String(productid).trim();
    const product = await getAnyProductById(trimmed);
    
    if (!product) {
      console.error('❌ ADD_TO_CART_PRODUCT_NOT_FOUND', { productid: trimmed });
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const device = req.cookies.device || 'anonymous';
    console.log('✓ Product found, adding to cart', { productid: trimmed, device, productName: product.name });
    
    const cart = getCart(device);
    const existing = cart.find(i => i.productId === trimmed);
    if (existing) {
      existing.qty += parseInt(qty, 10);
    } else {
      cart.push({ productId: trimmed, qty: parseInt(qty, 10) });
    }
    
    const totalCount = cart.reduce((a,c)=>a+c.qty,0);
    console.log('✓ Cart updated', { device, itemCount: cart.length, totalQty: totalCount });
    
    return res.json({ ok: true, count: totalCount });
  } catch(e){
    console.error('💥 ADD_TO_CART_ERROR', e);
    return res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// Get cart endpoint (JSON) expected by various front-end scripts
app.get('/get_cart/', async (req,res)=>{
  try {
    const device = req.cookies.device || 'anonymous';
    const cart = getCart(device);
    console.log('📋 GET_CART request', { device, itemCount: cart.length });
    
    // Look up each product properly (including DB)
    const mapped = [];
    for(const it of cart){
      const p = await getAnyProductById(it.productId);
      if(p){
        // Format: [id, name, qty, price, image, type, qty_duplicate]
  mapped.push([p.id, p.name || p.title || 'Item', it.qty, parseFloat(p.price) || 0, p.image || '', normalizeType(p.type), it.qty]);
        console.log('  ✓ Product loaded', { id: p.id, name: p.name, price: p.price });
      } else {
        console.warn('  ⚠️ Product not found in DB', { productId: it.productId });
        // Return placeholder so cart doesn't break
  mapped.push([it.productId, 'Unknown', it.qty, 0, '', 'Product', it.qty]);
      }
    }
    
    console.log('✓ GET_CART response', { mappedCount: mapped.length });
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
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID required' });
    }
    
    const cart = getCart(device);
    const index = cart.findIndex(item => item.productId === productId);
    
    if (index !== -1) {
      cart.splice(index, 1);
      // Cart is modified in place since getCart returns the reference
      console.log('✓ Removed from cart', { device, productId, remainingItems: cart.length });
      res.json({ success: true, message: 'Item removed from cart' });
    } else {
      console.log('⚠️ Item not found in cart', { device, productId });
      res.json({ success: false, message: 'Item not found in cart' });
    }
  } catch(e) {
    console.error('REMOVE_FROM_CART_ERROR', e);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// Debug endpoint to list visible product IDs (in-memory + optional DB) for troubleshooting
app.get('/__debug_products', async (req,res)=>{
  const list = [...products];
  if(supabase){
    try { const { data, error } = await supabase.from('products').select('id,name,price,active').limit(200);
      if(!error && data){ data.forEach(d=>{ if(!list.find(p=>p.id===d.id)) list.push(d); }); }
    } catch(e){}
  }
  res.json({ count: list.length, ids: list.map(p=>p.id) });
});

// Single product lookup debug
app.get('/__debug_lookup', async (req,res)=>{
  const id = (req.query.productid||'').trim();
  let product = null, errInfo = null;
  try { product = await getAnyProductById(id); } catch(e){ errInfo = String(e); }
  res.json({ input:id, supabaseConfigured: !!supabase, found: !!product, product, errInfo });
});

// Environment (non-sensitive flags only)
app.get('/__debug_env', (req,res)=>{
  res.json({ supabaseConfigured: !!supabase, hasUrl: !!process.env.SUPABASE_URL, hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY, hasAnon: !!process.env.SUPABASE_ANON_KEY });
});

// Test cart system - manually add a product to verify everything works
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

// Dynamic homepage (fully DB-backed)
app.get('/', async (req,res)=>{
  try {
    const [categories, productsList] = await Promise.all([
      dbFetchCategories(),
      dbFetchProducts({ orderLatest:true, limit: 12 })
    ]);
    let heroImages = [];
    if(supabase){
      const { data } = await supabase.from('hero_images').select('*').eq('active', true).order('position');
      heroImages = data || [];
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

// Cart page
app.get('/cart/', async (req,res)=>{
  try {
    const device = req.cookies.device || 'anonymous';
    const cart = getCart(device);
    console.log('🛒 CART_PAGE request', { device, itemCount: cart.length });
    
    // Look up each product properly (including DB)
    const items = [];
    for(const item of cart){
      const p = await getAnyProductById(item.productId);
      if(p){
        items.push({ 
          id: p.id, 
          name: p.name || p.title || 'Item', 
          price: parseFloat(p.price) || 0, 
          image: p.image || '', 
          qty: item.qty, 
          subtotal: (parseFloat(p.price) || 0) * item.qty 
        });
        console.log('  ✓ Cart item', { id: p.id, name: p.name, price: p.price, qty: item.qty });
      } else {
        console.warn('  ⚠️ Product not found', { productId: item.productId });
        items.push({ id: item.productId, name: 'Unknown', price: 0, image: '', qty: item.qty, subtotal: 0 });
      }
    }
    
    const total = items.reduce((s,i)=>s+i.subtotal,0);
    const itemCount = items.reduce((s,i)=>s+i.qty,0);
    console.log('✓ Cart page render', { itemCount, total });
    
    res.render('cart', { items, total, itemCount, siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error('CART_PAGE_ERROR', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load cart.' });
  }
});

// Checkout page (collects delivery details) - minimal server render, submit would be implemented later
app.get('/checkout/', async (req, res) => {
  try {
    const device = req.cookies.device || 'anonymous';
    const cart = getCart(device);
    
    // Look up each product properly
    const items = [];
    for(const item of cart){
      const p = await getAnyProductById(item.productId);
      if(p){
        items.push({ 
          id: p.id, 
          name: p.name || p.title || 'Item', 
          price: parseFloat(p.price) || 0, 
          image: p.image || '', 
          qty: item.qty, 
          subtotal: (parseFloat(p.price) || 0) * item.qty 
        });
      }
    }
    
    const total = items.reduce((s,i)=>s+i.subtotal,0);
    if(!items.length) return res.redirect('/cart/');
    res.render('checkout', { items, total, siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error('CHECKOUT_PAGE_ERROR', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load checkout.' });
  }
});

// Submit order from checkout
app.post('/checkout/', async (req, res) => {
  try {
    const { name, mobile, email, region, area, address, notes, subtotal, deliveryFee, total } = req.body;
    
    // Validate required fields
    if(!name || !mobile || !region || !area || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const device = req.cookies.device || 'anonymous';
    const cart = getCart(device);
    
    if(!cart.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // Build order items from cart
    const orderItems = [];
    for(const item of cart){
      const p = await getAnyProductById(item.productId);
      if(p){
        orderItems.push({
          productId: p.id,
          productName: p.name || 'Item',
          price: parseFloat(p.price) || 0,
          qty: item.qty,
          subtotal: (parseFloat(p.price) || 0) * item.qty,
          image: p.image || ''
        });
      }
    }
    
    if(!orderItems.length) {
      return res.status(400).json({ error: 'No valid items in cart' });
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
        items: orderItems
        // order_number will be auto-generated by database trigger
      };
      
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
  const { productid, qty } = req.query;
  if(!productid || typeof qty === 'undefined') return res.status(400).json({ error:'productid and qty required'});
  const q = parseInt(qty,10);
  const device = req.cookies.device || 'anonymous';
  const cart = getCart(device);
  const entry = cart.find(i=>i.productId===productid);
  if(!entry) return res.status(404).json({ error:'Item not in cart'});
  if(q <= 0){
    const idx = cart.indexOf(entry);
    cart.splice(idx,1);
  } else {
    entry.qty = q;
  }
  return res.json({ ok:true });
});

// Serve remaining static assets
app.use('/', express.static(path.join(__dirname, staticRoot), { index:false }));

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
    console.log('='.repeat(60));
    console.log(`✓ Server running on http://localhost:${port}`);
    console.log(`✓ Admin panel: http://localhost:${port}/admin/`);
    console.log(`✓ Debug endpoints:`);
    console.log(`  - http://localhost:${port}/__debug_env`);
    console.log(`  - http://localhost:${port}/__debug_products`);
    console.log(`  - http://localhost:${port}/__debug_lookup?productid=YOUR_ID`);
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
