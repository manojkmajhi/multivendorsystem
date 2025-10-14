# Production Deployment Guide

## 🚀 Quick Deploy

### Option 1: Standard Deployment

```bash
# Build production package
npm run build:prod

# Upload dist-production.zip to your server
# Then on server:
unzip dist-production.zip
cd dist
npm install --production
cp .env.production .env
# Edit .env with your credentials
npm start
```

### Option 2: PM2 Deployment (Recommended)

```bash
# On server after extracting
npm install --production
npm install -g pm2
cp .env.production .env
# Edit .env with your credentials
npm run pm2:start

# Useful PM2 commands
npm run pm2:logs      # View logs
npm run pm2:restart   # Restart app
npm run pm2:stop      # Stop app
pm2 save              # Save PM2 config
pm2 startup           # Auto-start on reboot
```

## ⚡ Performance Optimizations Included

### Server-Side
- ✅ Gzip compression for all responses
- ✅ Static asset caching (365 days for images/CSS/JS)
- ✅ ETag and Last-Modified headers
- ✅ Security headers (XSS, MIME sniffing, clickjacking protection)
- ✅ Production mode optimizations
- ✅ Cluster mode support via PM2

### Client-Side
- ✅ Image lazy loading
- ✅ Optimized CSS delivery
- ✅ Async JavaScript loading
- ✅ Browser caching hints
- ✅ Resource prefetching

### Database
- ✅ Query result caching (categories, settings)
- ✅ Connection pooling via Supabase client
- ✅ Efficient product lookups

## 📊 Performance Benchmarks

Expected performance with proper hosting:

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Lighthouse Score**: 85-95
- **Server Response**: < 200ms

## 🔧 Server Requirements

### Minimum
- Node.js >= 16.0.0
- 512MB RAM
- 1GB disk space
- 1 CPU core

### Recommended
- Node.js >= 18.0.0
- 1GB RAM
- 5GB disk space
- 2 CPU cores

## 🌐 Hosting Recommendations

### Budget-Friendly
- **Railway**: $5/month, auto-deploy from Git
- **Render**: Free tier available, easy setup
- **Fly.io**: Free tier, global CDN

### Production-Grade
- **DigitalOcean**: $6/month droplet
- **AWS Lightsail**: $5/month
- **Linode**: $5/month

### Serverless
- **Vercel**: Free tier, auto-scaling
- **Netlify**: Free tier with functions
- **AWS Lambda**: Pay per request

## 🔐 Security Checklist

- [ ] Change ADMIN_TOKEN to strong password
- [ ] Use HTTPS (Let's Encrypt free SSL)
- [ ] Set NODE_ENV=production
- [ ] Use SUPABASE_SERVICE_ROLE_KEY (not anon key)
- [ ] Enable Supabase RLS policies
- [ ] Set secure cookie flags in production
- [ ] Configure firewall (allow only 80, 443, 22)
- [ ] Regular backups of database

## 📈 Monitoring

### PM2 Monitoring
```bash
pm2 monit              # Real-time monitoring
pm2 logs allstrawhats  # View logs
pm2 status             # Check status
```

### Log Files
- Error logs: `logs/error.log`
- Output logs: `logs/out.log`

### Health Check Endpoint
```bash
curl http://localhost:3000/
# Should return 200 OK
```

## 🔄 Updates & Maintenance

### Update Application
```bash
# Stop app
pm2 stop allstrawhats

# Backup database (Supabase auto-backups)
# Update files
# Install dependencies
npm install --production

# Restart
pm2 restart allstrawhats
```

### Database Migrations
Run SQL files in Supabase dashboard:
1. SUPABASE_SCHEMA.sql (initial setup)
2. SUPABASE_VARIANT_SCHEMA.sql (variants)
3. SUPABASE_ORDERS_TRACKING.sql (orders)

## 🐛 Troubleshooting

### App won't start
```bash
# Check logs
pm2 logs allstrawhats --lines 100

# Common issues:
# - Missing .env file
# - Wrong Node version (use nvm)
# - Port already in use
# - Missing dependencies
```

### Database connection fails
- Verify SUPABASE_URL and keys in .env
- Check Supabase project status
- Verify RLS policies allow service role

### Images not loading
- Check uploads directory permissions: `chmod 755 strawhats/media/uploads`
- Verify image paths in database
- Check static file serving

### Performance issues
```bash
# Check memory usage
pm2 monit

# Restart if needed
pm2 restart allstrawhats

# Check server resources
htop
df -h
```

## 📞 Support

For issues:
1. Check logs: `pm2 logs allstrawhats`
2. Verify environment variables
3. Test database connection
4. Check server resources

## 🎯 Post-Deployment Checklist

- [ ] App accessible via domain/IP
- [ ] Admin panel login works
- [ ] Products display correctly
- [ ] Cart functionality works
- [ ] Checkout process completes
- [ ] Orders save to database
- [ ] Images load properly
- [ ] Search works
- [ ] Mobile responsive
- [ ] SSL certificate active
- [ ] PM2 auto-restart configured
- [ ] Backups scheduled

## 🚀 Performance Tips

1. **Use CDN**: CloudFlare (free) for static assets
2. **Enable HTTP/2**: Nginx reverse proxy
3. **Database indexes**: Add indexes on frequently queried columns
4. **Image optimization**: Use WebP format, compress images
5. **Caching**: Redis for session/cart data (optional)
6. **Load balancing**: Multiple instances with PM2 cluster mode

## 📝 Environment Variables Reference

```env
# Required
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
ADMIN_TOKEN=your_secure_password

# Optional
SUPABASE_ANON_KEY=eyJxxx...
GOOGLE_MAPS_API_KEY=AIzaxxx...
OTPLESS_APP_ID=xxx
OTPLESS_CLIENT_ID=xxx
OTPLESS_CLIENT_SECRET=xxx
```

---

**Built with ❤️ for fast, reliable anime merchandise stores**
