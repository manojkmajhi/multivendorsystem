# ✅ Product Image Upload Feature - Implementation Complete

## What Was Added

### 1. **File Upload Form** (`views/admin/product-form.ejs`)
- Added file input field with image preview
- Added `enctype="multipart/form-data"` to form
- Live preview of selected image before upload
- Option to use either file upload OR URL input
- Displays current image if editing existing product
- Shows new image preview when file is selected

### 2. **Backend File Handling** (`server.js`)
- Installed and configured **Multer** for file uploads
- Created uploads directory: `stickersnepal.com/media/uploads/`
- File validation:
  - Only image files allowed (jpg, png, gif, webp)
  - Maximum file size: 5MB
  - Automatic filename sanitization
- Updated product creation route to handle file uploads
- Updated product edit route to handle file uploads
- Files are saved with timestamp to prevent conflicts

### 3. **Features**
✅ Upload from local computer  
✅ Live image preview  
✅ File size limit (5MB)  
✅ File type validation  
✅ Unique filenames (timestamp-based)  
✅ Works with existing URL input (optional)  
✅ No database schema changes needed  

## Files Modified

1. ✅ `views/admin/product-form.ejs` - Added file input and preview
2. ✅ `server.js` - Added multer config and file handling
3. ✅ Created `SUPABASE_STORAGE_SETUP.md` - Documentation

## How to Use

### For Admin Users:

1. Go to **Admin Panel** → **Products** → **New Product** (or edit existing)
2. Fill in product details (name, price, category, etc.)
3. **To upload an image:**
   - Click "Choose File" button
   - Select an image from your computer (jpg, png, gif, webp)
   - Preview will appear automatically
4. **OR enter an image URL** (if you prefer to use external images)
5. Click "Create Product" or "Update Product"
6. Image will be saved to `/media/uploads/` and stored in database

### Image Preview:
- **Current Image**: Shows the existing product image (if editing)
- **New Image Preview**: Shows the newly selected file before uploading

## Technical Details

### Upload Directory
```
stickersnepal.com/
  └── media/
      └── uploads/          ← Images saved here
          ├── product-1234567890-123456789.jpg
          ├── anime-figure-1234567891-987654321.png
          └── ...
```

### File Naming Convention
```
[sanitized-name]-[timestamp]-[random-number].[extension]

Example: 
"Naruto Figure.jpg" → "Naruto_Figure-1696234567890-123456789.jpg"
```

### Database Storage
Images are stored as paths in the `products.image` column:
```
/media/uploads/product-1234567890-123456789.jpg
```

## Configuration

### Current Settings (in `server.js`):
```javascript
- Max file size: 5MB
- Allowed types: jpeg, jpg, png, gif, webp
- Upload path: stickersnepal.com/media/uploads/
- Filename: [name]-[timestamp]-[random].[ext]
```

### To Change File Size Limit:
```javascript
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Change to 10MB
  // ...
});
```

### To Add More File Types:
```javascript
fileFilter: function (req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/; // Added svg
  // ...
}
```

## Deployment Considerations

### For Local Development:
✅ Current implementation works perfectly  
- Images saved to local disk
- Fast and simple

### For Production Hosting (Render, Railway, Heroku):
⚠️ Local storage is ephemeral (files deleted on restart)

**Solution**: Use Supabase Storage (see `SUPABASE_STORAGE_SETUP.md`)

## Testing Checklist

- [x] File input appears in product form
- [x] Image preview works when selecting file
- [x] File uploads successfully
- [x] Images appear in product listing
- [x] Images appear in product details
- [x] Edit existing product and upload new image
- [x] File size validation (try uploading >5MB file)
- [x] File type validation (try uploading .txt file)
- [x] URL input still works as alternative

## Next Steps (Optional Enhancements)

1. **Supabase Storage Integration** (for production)
   - See `SUPABASE_STORAGE_SETUP.md`
   - Provides persistent storage

2. **Image Optimization**
   - Compress images before saving
   - Generate thumbnails
   - Use Sharp or similar library

3. **Drag & Drop Upload**
   - Better UX with drag-and-drop interface
   - Multiple file uploads

4. **Delete Old Images**
   - When updating product image, delete old file
   - Prevent disk space waste

5. **Image Gallery**
   - Allow multiple images per product
   - Image carousel on product details

## Support

If you encounter any issues:

1. **Check uploads directory exists**: `stickersnepal.com/media/uploads/`
2. **Check file permissions**: Directory must be writable
3. **Check multer is installed**: `npm install multer`
4. **Check server logs**: Look for error messages
5. **Test with small image first**: Try a 100KB jpg file

## Summary

✅ **Upload feature is now fully functional!**

Users can now:
- Upload product images from their computer
- See preview before saving
- Use file upload OR URL input
- Edit products and update images

The system:
- Validates file types and sizes
- Prevents filename conflicts
- Stores images persistently (on local disk)
- Serves images through `/media/` route

For production deployment with cloud hosting, follow the Supabase Storage setup guide.
