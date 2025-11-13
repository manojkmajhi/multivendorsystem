// Image optimization and lazy loading helper
const fs = require('fs');
const path = require('path');

// Generate low-quality placeholder for images
function generatePlaceholder(imagePath) {
  // Return a tiny base64 placeholder
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3C/svg%3E';
}

// Middleware to add image optimization headers
function imageOptimizationMiddleware(req, res, next) {
  const ext = path.extname(req.path).toLowerCase();
  
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
    // Add aggressive caching
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Add image optimization hints
    res.setHeader('Accept-CH', 'DPR, Width, Viewport-Width');
    
    // Enable lazy loading hint
    res.setHeader('Link', '<' + req.path + '>; rel=preload; as=image');
  }
  
  next();
}

module.exports = {
  generatePlaceholder,
  imageOptimizationMiddleware
};
