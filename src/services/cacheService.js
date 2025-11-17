const NodeCache = require('node-cache');

const productCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const categoryCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
const settingsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const heroCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const responseCache = new Map();

const cacheMiddleware = (duration = 30) => {
  return (req, res, next) => {
    const key = req.originalUrl || req.url;
    const cached = responseCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < duration * 1000) {
      res.setHeader('X-Cache', 'HIT');
      return res.send(cached.data);
    }
    
    res.sendResponse = res.send;
    res.send = (body) => {
      responseCache.set(key, { data: body, timestamp: Date.now() });
      res.setHeader('X-Cache', 'MISS');
      res.sendResponse(body);
    };
    
    next();
  };
};

const clearResponseCache = () => responseCache.clear();

const clearAllCaches = () => {
  productCache.flushAll();
  categoryCache.flushAll();
  settingsCache.flushAll();
  heroCache.flushAll();
  clearResponseCache();
};

module.exports = {
  productCache,
  categoryCache,
  settingsCache,
  heroCache,
  cacheMiddleware,
  clearResponseCache,
  clearAllCaches
};