# Theme Management System

## Overview
The All Strawhats store now includes a comprehensive theme management system that allows you to customize the color scheme of your entire website from the admin panel.

## Features

### 1. **Multiple Color Themes**
- 🔵 **Blue** (Default) - Professional and trustworthy
- 🔴 **Red** - Bold and energetic
- 🟢 **Green** - Fresh and natural
- 🟣 **Purple** - Creative and unique

### 2. **Admin Interface**
- Visual theme selector with emoji indicators
- Current theme display showing active color
- One-click theme reset to default
- Real-time preview of selected theme

### 3. **Site-Wide Application**
- Theme applies consistently across all pages:
  - Homepage
  - Product listings
  - Product details
  - Cart
  - Checkout
  - All other frontend pages

### 4. **Database Persistence**
- Theme selection is saved to Supabase `settings` table
- Cached for performance (60-second cache)
- Survives server restarts

## How to Use

### Changing the Theme

1. Navigate to **Admin Panel** → **Settings**
2. Scroll to the **Theme Customization** section
3. Select your desired color from the dropdown:
   - 🔵 Blue (Default)
   - 🔴 Red
   - 🟢 Green
   - 🟣 Purple
4. Click **Save Settings**
5. The new theme will be applied immediately across the entire website

### Resetting to Default

If you want to return to the default blue theme:

1. Go to **Admin Panel** → **Settings**
2. In the **Theme Customization** section, find the **Current Theme** box
3. Click the **🔄 Reset to Default** button
4. Confirm the action
5. The theme will be reset to blue

## Technical Details

### File Structure

```
strawhats/staticfiles/
├── style.blue.css    # Default blue theme
├── style.red.css     # Red theme
├── style.green.css   # Green theme
└── style.purple.css  # Purple theme
```

### Database Schema

The theme is stored in the `settings` table:

```sql
key: 'theme'
value: 'blue' | 'red' | 'green' | 'purple'
```

### Server Implementation

**Theme Loading:**
```javascript
// Loads theme from database with caching
async function loadTheme(force=false) {
  // Returns: 'blue', 'red', 'green', or 'purple'
}
```

**Theme Middleware:**
```javascript
// Makes theme available to all views
app.use(async (req,res,next)=>{
  res.locals.theme = await loadTheme();
  next();
});
```

**Admin Routes:**
- `GET /admin/settings` - Shows theme selector
- `POST /admin/settings` - Saves theme selection
- `POST /admin/settings/reset-theme` - Resets to default

### View Templates

All EJS templates dynamically load the theme:

```html
<link rel="stylesheet" href="/staticfiles/style.<%= theme || 'blue' %>.css" />
```

## Adding New Themes

To add a new theme color:

1. **Create CSS File:**
   ```bash
   cp strawhats/staticfiles/style.blue.css strawhats/staticfiles/style.orange.css
   ```

2. **Update Color Variables:**
   Edit the new CSS file and change the primary color values:
   ```css
   :root {
     --primary-color: #ff9500;
     --primary-hover: #e68600;
     --primary-light: #fff3e0;
   }
   ```

3. **Update Admin Settings:**
   Edit `views/admin/settings.ejs` and add the new option:
   ```html
   <option value="orange" <%= theme === 'orange' ? 'selected' : '' %>>🟠 Orange</option>
   ```

4. **Test:**
   - Restart the server
   - Go to Admin → Settings
   - Select the new theme
   - Verify it applies correctly

## Performance

- **Caching:** Theme is cached for 60 seconds to reduce database queries
- **Static Files:** CSS files are served as static assets with browser caching
- **No Runtime Overhead:** Theme is loaded once per request via middleware

## Troubleshooting

### Theme Not Changing

1. **Clear Browser Cache:**
   - Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or clear cache manually in browser settings

2. **Check Database:**
   - Verify Supabase connection is working
   - Check `settings` table has `theme` key

3. **Verify File Exists:**
   - Ensure the CSS file exists: `strawhats/staticfiles/style.{theme}.css`

4. **Check Server Logs:**
   - Look for any errors related to theme loading

### Theme Resets on Server Restart

- This is normal if using in-memory fallback (no Supabase)
- Configure Supabase to persist theme selection

### Different Theme on Different Pages

- Clear browser cache
- Check that all view templates use `<%= theme || 'blue' %>`

## Best Practices

1. **Test Before Deploying:**
   - Test theme changes in development first
   - Verify all pages render correctly

2. **Backup:**
   - Keep backup of original CSS files
   - Document any custom modifications

3. **Consistency:**
   - Use the admin panel to change themes
   - Don't manually edit theme files in production

4. **Performance:**
   - Theme caching is automatic
   - No need to restart server after theme change

## Future Enhancements

Potential improvements for the theme system:

- [ ] Custom color picker for creating unique themes
- [ ] Theme preview before applying
- [ ] Dark mode support
- [ ] Per-user theme preferences
- [ ] Scheduled theme changes (e.g., seasonal themes)
- [ ] Theme import/export functionality
- [ ] Advanced customization (fonts, spacing, etc.)

## Support

For issues or questions about the theme system:
- Check this documentation first
- Review server logs for errors
- Verify Supabase configuration
- Test with default blue theme

---

**Last Updated:** 2024
**Version:** 1.0.0
