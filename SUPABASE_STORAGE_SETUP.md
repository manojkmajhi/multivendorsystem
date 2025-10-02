# Supabase Storage Setup for Product Images

## Option 1: Local File Storage (Current Implementation)

The current implementation saves uploaded images to your local server in the `stickersnepal.com/media/uploads/` directory. This is already working and requires no additional setup.

**Pros:**
- Simple and works immediately
- No additional costs
- Fast for small-scale applications

**Cons:**
- Images are lost if server restarts (on services like Render, Railway)
- No CDN benefits
- Limited scalability

---

## Option 2: Supabase Storage (Recommended for Production)

For production, it's recommended to use Supabase Storage for persistent, scalable image hosting.

### Step 1: Create a Storage Bucket in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"Create a new bucket"**
5. Enter bucket details:
   - **Name**: `product-images`
   - **Public bucket**: ✅ Check this (so images are publicly accessible)
   - **File size limit**: 5MB (or adjust as needed)
6. Click **"Create bucket"**

### Step 2: Set Bucket Policies (Public Access)

By default, the bucket is private. To make images publicly accessible:

1. In Storage, click on your `product-images` bucket
2. Go to **Policies** tab
3. Click **"New Policy"**
4. Choose **"For full customization"**
5. Create a policy for **SELECT** (read):

```sql
CREATE POLICY "Public Access for Product Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );
```

6. Create a policy for **INSERT** (upload) - only for authenticated admin:

```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);
```

7. Create a policy for **DELETE** - only for authenticated admin:

```sql
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);
```

### Step 3: Update Your Server Code

Add this helper function to `server.js` (after the Supabase client initialization):

```javascript
// Helper function to upload image to Supabase Storage
async function uploadToSupabaseStorage(file) {
  if (!supabase) return null;
  
  const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const filePath = `products/${fileName}`;
  
  try {
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: publicData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    return publicData.publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}
```

### Step 4: Update Multer Configuration

Change the storage from disk to memory:

```javascript
const storage = multer.memoryStorage(); // Changed from diskStorage

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
      cb(new Error('Only image files are allowed'));
    }
  }
});
```

### Step 5: Update Product Routes

Modify the POST routes to use Supabase Storage:

```javascript
app.post('/admin/products/new', adminGuard, upload.single('imageFile'), async (req,res)=>{
  const { name, price, category, type, image } = req.body;
  let finalImage = image;
  
  // If a file was uploaded, upload to Supabase Storage
  if (req.file) {
    const uploadedUrl = await uploadToSupabaseStorage(req.file);
    if (uploadedUrl) {
      finalImage = uploadedUrl;
    } else {
      return res.status(500).render('simple-message', { 
        title: 'Error', 
        message: 'Failed to upload image to storage.' 
      });
    }
  }
  
  try {
    if (supabase) {
      const { error } = await supabase.from('products').insert({ 
        name, 
        price: parseFloat(price), 
        category, 
        type, 
        image: finalImage 
      });
      if (error) throw error;
    }
    res.redirect('/admin/products?msg=' + encodeURIComponent('Product created'));
  } catch (e) {
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to create product.' });
  }
});

// Similar changes for edit route
app.post('/admin/products/:id/edit', adminGuard, upload.single('imageFile'), async (req,res)=>{
  const id = req.params.id;
  const { name, price, category, type, image } = req.body;
  let finalImage = image;
  
  if (req.file) {
    const uploadedUrl = await uploadToSupabaseStorage(req.file);
    if (uploadedUrl) {
      finalImage = uploadedUrl;
    } else {
      return res.status(500).render('simple-message', { 
        title: 'Error', 
        message: 'Failed to upload image to storage.' 
      });
    }
  }
  
  try {
    if (supabase) {
      const { error } = await supabase.from('products').update({ 
        name, 
        price: parseFloat(price), 
        category, 
        type, 
        image: finalImage 
      }).eq('id', id);
      if(error) throw error;
    }
    res.redirect('/admin/products?msg=' + encodeURIComponent('Product updated'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to update product.' });
  }
});
```

---

## Current Implementation Summary

✅ **What's Already Working:**
- Upload form with file input
- Image preview before upload
- Local file storage in `/media/uploads/`
- Both file upload and URL input options
- File size limit (5MB)
- Image type validation (jpg, png, gif, webp)

📝 **Database Schema:**
Your existing `products` table already has an `image` column (text), which can store either:
- Local paths: `/media/uploads/filename.jpg`
- Supabase Storage URLs: `https://your-project.supabase.co/storage/v1/object/public/product-images/products/filename.jpg`
- External URLs: `https://example.com/image.jpg`

No database changes are needed!

---

## Testing the Upload Feature

1. Start your server: `npm start`
2. Go to admin panel: `http://localhost:3000/admin/`
3. Create or edit a product
4. Try uploading an image from your computer
5. The image should appear in preview
6. Save the product
7. Check that the image displays correctly on the product listing and details pages

---

## Benefits of Each Approach

### Local Storage (Current)
- ✅ Works immediately
- ✅ No additional setup
- ✅ Free
- ❌ Not persistent on cloud hosting
- ❌ No CDN

### Supabase Storage
- ✅ Persistent and reliable
- ✅ CDN-backed (fast global delivery)
- ✅ Automatic backups
- ✅ Scales with your app
- ✅ Free tier: 1GB storage
- ❌ Requires Supabase setup
- ❌ Small learning curve

---

## Troubleshooting

**Issue: "Cannot find module 'multer'"**
```bash
npm install multer
```

**Issue: "ENOENT: no such file or directory"**
- The server automatically creates the `uploads` directory
- Check that your `stickersnepal.com/media/` directory exists

**Issue: Images not displaying**
- Check the image path in the database
- Verify the `/media` route is correctly serving static files
- Check file permissions

**Issue: "File too large"**
- Current limit is 5MB
- To increase, change: `limits: { fileSize: 10 * 1024 * 1024 }` (for 10MB)

---

## Recommended Next Steps

1. ✅ Test the current local upload implementation
2. If deploying to production, set up Supabase Storage (Option 2)
3. Consider adding image optimization (compress images before upload)
4. Add ability to delete old images when updating products
5. Add drag-and-drop upload interface for better UX
