// Advanced caching layer for production performance
const NodeCache = require('node-cache');

// Cache instances with optimized TTLs and memory limits
const productCache = new NodeCache({ 
  stdTTL: 600, 
  checkperiod: 120, 
  useClones: false, // Better performance
  maxKeys: 1000 
});

const categoryCache = new NodeCache({ 
  stdTTL: 1800, 
  checkperiod: 300, 
  useClones: false,
  maxKeys: 100 
});

const settingsCache = new NodeCache({ 
  stdTTL: 3600, 
  checkperiod: 600, 
  useClones: false,
  maxKeys: 50 
});

const heroCache = new NodeCache({ 
  stdTTL: 1800, 
  checkperiod: 300, 
  useClones: false,
  maxKeys: 20 
});

// Response cache with LRU eviction
const responseCache = new Map();
const MAX_RESPONSE_CACHE = 100;

// Cleanup old response cache entries
setInterval(() => {
  if (responseCache.size > MAX_RESPONSE_CACHE) {
    const entries = Array.from(responseCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    entries.slice(0, 50).forEach(([key]) => responseCache.delete(key));
  }
}, 60000);

module.exports = {
  productCache,
  categoryCache,
  settingsCache,
  heroCache,
  
  // Middleware for response caching with compression awareness
  cacheMiddleware: (duration = 60) => {
    return (req, res, next) => {
      if (req.method !== 'GET' || req.headers.cookie?.includes('admin')) return next();
      
      const key = req.originalUrl || req.url;
      const cached = responseCache.get(key);
      
      if (cached && Date.now() - cached.timestamp < duration * 1000) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', 'public, max-age=' + duration);
        return res.send(cached.body);
      }
      
      res.originalSend = res.send;
      res.send = function(body) {
        if (responseCache.size < MAX_RESPONSE_CACHE) {
          responseCache.set(key, { body, timestamp: Date.now() });
        }
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', 'public, max-age=' + duration);
        res.originalSend(body);
      };
      next();
    };
  },
  
  clearResponseCache: () => {
    responseCache.clear();
  }
};
