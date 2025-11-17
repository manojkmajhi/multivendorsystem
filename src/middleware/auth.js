const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');

let cachedAdminHash = null;

const getAdminHash = async () => {
  const supabase = getDatabase();
  if (!supabase) return null;
  if (cachedAdminHash) return cachedAdminHash;
  
  const { data, error } = await supabase.from('settings').select('value').eq('key', 'admin_auth').single();
  if (!error && data?.value?.password_hash) {
    cachedAdminHash = data.value.password_hash;
    return cachedAdminHash;
  }
  return null;
};

const adminGuard = async (req, res, next) => {
  const sessionToken = req.cookies.admin_session;
  const hash = await getAdminHash();
  
  if (!hash) {
    const token = req.headers['x-admin-token'] || req.query.admin_token || req.cookies.admin_token;
    const expected = process.env.ADMIN_TOKEN || 'dev-admin';
    if (token === expected) return next();
  }
  
  if (sessionToken && hash && sessionToken === hash) {
    return next();
  }
  
  return res.redirect('/admin/login?next=' + encodeURIComponent(req.originalUrl));
};

const farmerGuard = (req, res, next) => {
  const token = req.cookies.farmer_session;
  if (!token) return res.redirect('/farmers/login');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    if (decoded?.type === 'farmer') {
      req.farmer = decoded;
      return next();
    }
  } catch (e) {
    res.clearCookie('farmer_session');
  }
  
  return res.redirect('/farmers/login');
};

module.exports = { adminGuard, farmerGuard, getAdminHash };