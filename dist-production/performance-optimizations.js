// Advanced caching layer for production performance
const NodeCache = require('node-cache');

// Cache instances with different TTLs
const productCache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // 10 min
const categoryCache = new NodeCache({ stdTTL: 1800, checkperiod: 300 }); // 30 min
const settingsCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // 1 hour
const heroCache = new NodeCache({ stdTTL: 1800, checkperiod: 300 }); // 30 min

// Response cache for full pages (aggressive)
const responseCache = new Map();
const RESPONSE_CACHE_TTL = 60000; // 1 minute

module.exports = {
  productCache,
  categoryCache,
  settingsCache,
  heroCache,
  
  // Middleware for response caching
  cacheMiddleware: (duration = 60) => {
    return (req, res, next) => {
      if (req.method !== 'GET') return next();
      
      const key = req.originalUrl || req.url;
      const cached = responseCache.get(key);
      
      if (cached && Date.now() - cached.timestamp < duration * 1000) {
        res.setHeader('X-Cache', 'HIT');
        return res.send(cached.body);
      }
      
      res.originalSend = res.send;
      res.send = function(body) {
        responseCache.set(key, { body, timestamp: Date.now() });
        res.setHeader('X-Cache', 'MISS');
        res.originalSend(body);
      };
      next();
    };
  },
  
  clearResponseCache: () => {
    responseCache.clear();
  }
};
