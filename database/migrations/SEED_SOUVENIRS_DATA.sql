-- =========================================================================
-- SEED DATA FOR SOUVENIRS AND HANDICRAFTS NICHE (WITH ONLINE WEB IMAGES)
-- =========================================================================
-- This script populates the database with premium, highly detailed local
-- Nepalese souvenirs and handicrafts. It includes:
-- 1. A premium seller profile (Himalayan Artisans Guild)
-- 2. Five beautifully curated souvenir categories
-- 3. Ten authentic products (some with variants, and some popular)
-- 4. Attributes, attribute values, and product variant linkages
-- Uses high-resolution online Unsplash image URLs to prevent broken images.
-- =========================================================================

BEGIN;

-- 1. Create a dedicated Souvenirs Seller (if not exists)
INSERT INTO public.sellers (
  id,
  email,
  full_name,
  phone,
  business_name,
  location,
  bio,
  profile_image,
  status,
  password_hash
) VALUES (
  'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
  'artisans@multivendor.com',
  'Himalayan Artisans Guild',
  '+977-9841223344',
  'Himalayan Artisans Guild',
  'Lalitpur (Patan), Nepal',
  'A cooperative of traditional woodcarvers, metal artisans, and weavers dedicated to preserving the fine arts of the Kathmandu Valley.',
  'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60',
  'approved',
  '$2a$10$wK4rEw0s.jB6D8l72P1h1Ou7n.X.Vp.fLqN3/e2hU55lO1w8c9iJq' -- hashed 'password123'
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  business_name = EXCLUDED.business_name,
  location = EXCLUDED.location,
  bio = EXCLUDED.bio,
  profile_image = EXCLUDED.profile_image,
  status = EXCLUDED.status;

-- 2. Insert Curated Categories
INSERT INTO public.categories (id, name, image_url) VALUES
  ('c16828df-2e21-482a-bc91-385d8be9201a', 'Singing Bowls', 'https://images.unsplash.com/photo-1599458252573-56ae36120de1?w=500&auto=format&fit=crop&q=60'),
  ('c29759d3-5b8d-4f10-bf9e-1bb354c03de9', 'Pashmina & Woolens', 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=500&auto=format&fit=crop&q=60'),
  ('c3cf1d08-d218-4e89-8d19-450f39384993', 'Teas & Spices', 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=500&auto=format&fit=crop&q=60'),
  ('c41f71a0-b530-4e58-9be2-72bf62cf5ef9', 'Thangka & Paper Crafts', 'https://images.unsplash.com/photo-1606744824163-985d376605aa?w=500&auto=format&fit=crop&q=60'),
  ('c5df1d74-c5b8-4c12-8e10-3847eb02e9cf', 'Jewelry & Hemp Bags', 'https://images.unsplash.com/photo-1524498250077-390f9e378fc0?w=500&auto=format&fit=crop&q=60'),
  ('c6df1d74-c5b8-4c12-8e10-3847eb02e9d0', 'Home Decor', 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500&auto=format&fit=crop&q=60'),
  ('c7df1d74-c5b8-4c12-8e10-3847eb02e9d1', 'Handcrafted', 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500&auto=format&fit=crop&q=60'),
  ('c8df1d74-c5b8-4c12-8e10-3847eb02e9d2', 'Art & Collectibles', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&auto=format&fit=crop&q=60'),
  ('c9df1d74-c5b8-4c12-8e10-3847eb02e9d3', 'Spiritual', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&auto=format&fit=crop&q=60'),
  ('cadf1d74-c5b8-4c12-8e10-3847eb02e9d4', 'Wearables & Accessories', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60')
ON CONFLICT (name) DO UPDATE SET
  image_url = EXCLUDED.image_url;

-- 3. Insert Premium Products in the Souvenirs Niche
-- Note: Reference the exact categories name (as categories table unique constraint is on name)
-- Reference the new seller 'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251'
INSERT INTO public.products (
  id,
  name,
  price,
  image,
  type,
  category,
  short_description,
  long_description,
  tags,
  active,
  seller_id,
  has_variants,
  base_sku,
  stock,
  is_popular
) VALUES
  (
    '9705f4ea-fdbb-43d9-a764-75464adcb8fa',
    'Hand-Beaten Seven-Metal Tibetan Singing Bowl',
    120.00,
    'https://images.unsplash.com/photo-1599458252573-56ae36120de1?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Singing Bowls',
    'A premium 6-inch Tibetan singing bowl, hand-beaten from seven sacred metals. Produces resonant, deep-vibrating tones perfect for meditation and sound healing.',
    'Immerse yourself in mindfulness with our authentic hand-beaten singing bowl, crafted by multi-generational artisans in Lalitpur, Nepal. Made from a traditional alloy of seven metals (representing the Sun, Moon, and five celestial bodies), each bowl has a completely unique frequency and harmonic overtones. Comes as a complete set including a leather-wrapped wooden mallet and a hand-sewn silk cushion. Ideal for yoga, mindfulness practice, sound therapy, and home décor.',
    ARRAY['handicraft', 'singing bowl', 'meditation', 'lalitpur', 'handmade', 'nepal'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    false,
    'SB-HB-01',
    25,
    true
  ),
  (
    'aa264a2f-1249-43c2-bf7f-1d8f51a44e54',
    'Engraved Om Mani Padme Hum Singing Bowl',
    65.00,
    'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Singing Bowls',
    'Elegant brass-finished singing bowl etched with the sacred Sanskrit compassion mantra and Tibetan auspicious symbols.',
    'This beautifully cast brass singing bowl is precision-machined and then hand-etched by skilled artists with the sacred Tibetan mantra ''Om Mani Padme Hum''. Inside the bowl features the Buddha''s eyes or the double Dorje symbol, representing spiritual stability and wisdom. It creates clear, high-resonance sounds that clear negative energies. The package includes a solid wood striker and a gorgeous decorative ring cushion.',
    ARRAY['singing bowl', 'mantra', 'brass', 'kathmandu', 'spirituality'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    false,
    'SB-EG-02',
    40,
    false
  ),
  (
    'c8430ea6-8b77-47b8-bde7-8e6c40a5a22d',
    'Handwoven Pure Pashmina Cashmere Shawl',
    185.00,
    'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Pashmina & Woolens',
    'Exquisite 100% pure Himalayan Chyangra Pashmina shawl, handwoven on traditional wooden looms in Kathmandu. Incredibly soft, warm, and lightweight.',
    'Wrap yourself in absolute luxury. This authentic Pashmina shawl is crafted from the finest undercoat fibers of the Chyangra mountain goats, grazing in the high-altitude trans-Himalayan region of Nepal. Each piece is hand-spun and handwoven by veteran weavers, using traditional techniques passed down for centuries. The signature soft fringe and delicate weave make it an elegant accessory for any season.',
    ARRAY['pashmina', 'cashmere', 'shawl', 'wool', 'handwoven', 'luxury'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    true, -- Has Variants!
    'PA-PS-01',
    60,
    true
  ),
  (
    'ddff1b23-2895-46f9-bb20-569d67964a30',
    'Handcrafted Himalayan Felt Ball Rug',
    95.00,
    'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Pashmina & Woolens',
    'A colorful, eco-friendly 100cm round rug handmade from 100% pure New Zealand wool felt balls. Durable and cozy.',
    'Add warmth and joy to your living space with this vibrant felt ball rug. Ethically handmade by a women''s cooperative in Kathmandu, this rug is comprised of thousands of individually hand-felted 2cm wool balls stitched together. Colored using non-toxic, eco-friendly dyes, it is naturally stain-resistant, flame-retardant, and extremely comfortable underfoot. Perfect for bedrooms, nursery, or living rooms.',
    ARRAY['rug', 'wool', 'felt', 'eco-friendly', 'colorful', 'women-coop'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    false,
    'WO-FR-02',
    8,
    false
  ),
  (
    'e20c6be1-b3b3-4691-888e-64d7e9742468',
    'Heritage Himalayan Orthodox Black Tea',
    18.50,
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Teas & Spices',
    'Premium loose-leaf orthodox black tea, hand-harvested from high-altitude organic gardens in Ilam, Nepal. Floral notes with a sweet honey finish.',
    'Harvested at altitudes over 6,000 feet in the misty hills of Ilam, near the foothills of Mount Kanchanjunga, this orthodox black tea is characterized by delicate tips and rolled leaves. Slow grown in mineral-rich soil, it offers a complex flavor profile featuring light floral aromatics, a nutty undertone, and a naturally sweet honey-like finish. Rich in antioxidants and beautifully packaged in a handmade Lokta paper container, making it a wonderful gift.',
    ARRAY['tea', 'orthodox', 'organic', 'ilam', 'beverage', 'gift'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    false,
    'TS-BT-01',
    100,
    true
  ),
  (
    'e52e42ef-0ef7-4780-87a1-d703bc89f925',
    'Organic Wild Sichuan Pepper (Himalayan Timur)',
    12.00,
    'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Teas & Spices',
    'Locally-sourced, handpicked wild Timur berries. Famous for its citrusy aroma and tongue-tingling numbing sensation.',
    'Timur (Zanthoxylum armatum) is a close relative of the Sichuan pepper, harvested wild in the remote mountain forests of Western Nepal. It features a unique, powerful grapefruit-citrus aroma followed by a delightful, tongue-tingling numbing effect. An essential spice in Nepalese cuisine, Timur is perfect for marinades, curries, dry rubs, and even craft cocktails or chocolates. Sourced directly from local farming communities to support sustainable forest harvesting.',
    ARRAY['spice', 'organic', 'timur', 'cooking', 'wild-harvested', 'gourmet'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    false,
    'TS-TP-02',
    150,
    false
  ),
  (
    'f3a61dfb-8d0c-4e80-8d2a-a9a3f2db7bb2',
    'Hand-Paint Wheel of Life Thangka',
    250.00,
    'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Thangka & Paper Crafts',
    'A stunning Tibetan Thangka painting of the Bhavachakra (Wheel of Life), meticulously hand-painted with natural mineral pigments and 24K gold accents.',
    'This sacred Buddhist Thangka is hand-painted on cotton canvas by master Thangka artists in the historic city of Bhaktapur, Nepal. Using ground mineral pigments (lapis lazuli, malachite, cinnabar) bound with organic hide glue, and highlights in genuine 24-karat gold leaf, this painting depicts the Bhavachakra, representing the cycle of existence (Samsara). The precision of the brushwork and the vibrant, everlasting colors make this not only a wonderful meditation aid but a spectacular masterpiece of sacred art.',
    ARRAY['thangka', 'art', 'painting', 'buddhism', 'gold', 'bhaktapur'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    false,
    'TC-TK-01',
    5,
    true
  ),
  (
    'b4c10702-53b4-4b5c-b17d-2b4756598c19',
    'Handmade Lokta Paper Journal & Ink Pen Set',
    22.00,
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Thangka & Paper Crafts',
    'Rustic, vintage journal hand-bound with acid-free Lokta paper made from native Himalayan Daphne bark. Includes a wooden dip pen.',
    'Experience the art of writing on timeless paper. Lokta paper is handmade in rural Nepal from the inner bark of the Daphne bush, which grows naturally above 6,000 feet. This bark regenerates fully in 5-7 years, making it incredibly eco-friendly. The paper is hand-harvested, boiled, beaten, and sun-dried on wooden frames. It is naturally resistant to tearing, moisture, and insects, ensuring your writing is preserved for centuries. Featuring a hand-pressed leaf cover and a leather strap closure.',
    ARRAY['stationery', 'journal', 'notebook', 'lokta', 'eco-friendly', 'handmade'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    true, -- Has Variants!
    'TC-LJ-02',
    80,
    false
  ),
  (
    'a5c0bda5-eebe-4d92-bf3d-24d14210cfef',
    'Handcrafted Sterling Silver Turquoise Mantra Ring',
    48.00,
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Jewelry & Hemp Bags',
    'Solid 925 sterling silver ring, hand-engraved with the ''Om'' symbol and inlaid with high-quality Tibetan Turquoise and Coral.',
    'Handcrafted in the heart of Patan, the city of fine arts, this ring is fashioned from solid 925 sterling silver. It features an exquisite inlay of genuine Tibetan Turquoise and red Coral, framing a hand-carved Sanskrit ''Om'' or ''Lotus'' emblem. Known as a stone of protection and healing, turquoise has been worn by Himalayan people for generations. A timeless accessory of spiritual significance.',
    ARRAY['ring', 'jewelry', 'silver', 'turquoise', 'spiritual', 'patan'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    true, -- Has Variants!
    'JW-TR-01',
    30,
    true
  ),
  (
    '6f8d07eb-11cf-4d93-b6d8-4f2a1b92bf98',
    'Eco-Friendly Wild Himalayan Hemp Backpack',
    39.90,
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Jewelry & Hemp Bags',
    'A rugged, stylish, and highly durable backpack handcrafted from 100% organic wild hemp and heavy-duty cotton.',
    'Our signature hemp backpack is ethically handmade in Pokhara, Nepal, from wild-growing Himalayan hemp. Known as one of the strongest natural fibers on Earth, hemp is highly resistant to wear, tear, and mildew, getting softer with every wash. It features a spacious main compartment, a padded 14-inch laptop sleeve, two side water bottle pockets, and a front zippered pocket. The earthy, multi-toned weave is naturally beautiful and aligns with sustainable, zero-waste living.',
    ARRAY['backpack', 'hemp', 'bag', 'eco-friendly', 'sustainable', 'pokhara'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    false,
    'JW-HB-02',
    50,
    true
  ),
  (
    'f4a61dfb-8d0c-4e80-8d2a-a9a3f2db7bb3',
    'Macrame Wall Decor',
    500.00,
    'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Home Decor',
    'Elegant handcrafted cotton macrame wall hanging, adding a warm bohemian accent to any room.',
    'Bring beauty and warmth to your home with this gorgeous Macrame Wall Decor. Hand-knotted using 100% natural, eco-friendly cotton cord on a sturdy wooden dowel, this piece features a vibrant rainbow pattern or classic cream designs. Crafted ethically by local weavers in Kathmandu, it adds a stunning bohemian texture and modern charm to your living room, bedroom, or entryway. Extremely lightweight and easy to hang.',
    ARRAY['decor', 'macrame', 'handmade', 'cotton', 'bohemian', 'home'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    false,
    'HD-MW-01',
    30,
    true
  ),
  (
    '152e42ef-0ef7-4780-87a1-d703bc89f926',
    'Hand-Carved Wooden Astamangala Plaque',
    1500.00,
    'https://images.unsplash.com/photo-1606744824163-985d376605aa?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Handcrafted',
    'Exquisite hand-carved wooden wall plaque depicting the eight auspicious symbols (Astamangala) of Himalayan Buddhism.',
    'This magnificent Astamangala plaque is entirely hand-carved from local wild walnut or rosewood by veteran master woodcarvers in Patan. It depicts the eight auspicious symbols of Tibetan Buddhism, representing good fortune, spiritual protection, and wisdom. Each symbol is carved with extreme detail, showcasing centuries-old Newari woodcarving techniques. Stained with organic lacquer to highlight the beautiful grain of the natural wood. Ready to mount on your wall as a protective heirloom.',
    ARRAY['woodcarving', 'handcrafted', 'astamangala', 'patan', 'handmade', 'heirloom'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    false,
    'HC-AP-02',
    10,
    false
  ),
  (
    '23a61dfb-8d0c-4e80-8d2a-a9a3f2db7bb4',
    'Vintage Nepalese Brass Butter Lamp',
    850.00,
    'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Art & Collectibles',
    'Traditional solid brass butter lamp, hand-beaten and engraved by veteran Newar metal artisans.',
    'A quintessential spiritual collectible. Butter lamps (Choemey) are lit daily in Himalayan households and Buddhist monasteries as a symbol of offering and clarity. Hand-beaten from premium solid brass by generational metalsmiths in Kathmandu, this vintage-finished lamp features hand-engraved scrollwork and details. Beautiful as an authentic spiritual focal point, candle holder, or historical display piece. Extremely durable and heavy.',
    ARRAY['brass', 'collectible', 'lamp', 'buddhism', 'vintage', 'kathmandu'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    false,
    'AC-BL-03',
    20,
    false
  ),
  (
    '34c10702-53b4-4b5c-b17d-2b4756598c1a',
    'Himalayan Buddhist Prayer Flags (Pack of 5)',
    250.00,
    'https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Spiritual',
    'Authentic five-color cotton prayer flags printed with sacred mantras, wind horses, and prayers for peace and compassion.',
    'Hang these traditional prayer flags to bring peace, strength, and compassion. Ethically printed on durable 100% cotton sheets in Kathmandu, this set of 5 rolls features the standard five elemental colors (blue, white, red, green, yellow). As the wind blows, it is believed the prayers and mantras are carried to all corners of the universe, spreading good fortune and clearing obstacles. Each sheet features the Lungta (Wind Horse) and classic Tibetan prayers.',
    ARRAY['prayer-flags', 'spiritual', 'cotton', 'mantra', 'peace', 'nepal'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    false,
    'SP-PF-04',
    200,
    true
  ),
  (
    '45c0bda5-eebe-4d92-bf3d-24d14210cfef',
    'Wild Hemp Crossbody Passport Bag',
    650.00,
    'https://images.unsplash.com/photo-1524498250077-390f9e378fc0?w=800&auto=format&fit=crop&q=80',
    'Product',
    'Wearables & Accessories',
    'Sleek, lightweight, and incredibly durable crossbody bag handmade from eco-friendly Himalayan wild hemp.',
    'Our wild hemp crossbody passport bag is the perfect travel companion. Handcrafted in Pokhara, it is designed to keep your passport, keys, phone, and cards secure and close by. Made from 100% natural, unbleached hemp fibers mixed with durable cotton linings. Features an adjustable shoulder strap, three zipped compartments, and unique earthy color block patterns. Extremely durable, eco-friendly, and machine washable.',
    ARRAY['bag', 'hemp', 'crossbody', 'wearable', 'pokhara', 'travel'],
    true,
    'd87e07a3-e4c1-4b1f-bc87-9bb3a67d0251',
    false,
    'WA-HB-05',
    80,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  image = EXCLUDED.image,
  category = EXCLUDED.category,
  short_description = EXCLUDED.short_description,
  long_description = EXCLUDED.long_description,
  tags = EXCLUDED.tags,
  active = EXCLUDED.active,
  seller_id = EXCLUDED.seller_id,
  has_variants = EXCLUDED.has_variants,
  base_sku = EXCLUDED.base_sku,
  stock = EXCLUDED.stock,
  is_popular = EXCLUDED.is_popular;

-- 4. Setup Variants, Attributes and Links in the database
-- We will link the products with has_variants = true to the corresponding global attributes.
DO $$
DECLARE
  color_attr_id UUID;
  size_attr_id UUID;
  shawl_id UUID := 'c8430ea6-8b77-47b8-bde7-8e6c40a5a22d';   -- Pashmina Shawl Product
  journal_id UUID := 'b4c10702-53b4-4b5c-b17d-2b4756598c19'; -- Lokta Journal Product
  ring_id UUID := 'a5c0bda5-eebe-4d92-bf3d-24d14210cfef';    -- Turquoise Ring Product
BEGIN
  -- Retrieve size and color attribute IDs (assumed already created in SUPABASE_VARIANT_SCHEMA.sql)
  -- If they don't exist, we insert them.
  INSERT INTO public.attributes (name, slug, type, display_order)
  VALUES 
    ('Size', 'size', 'select', 1),
    ('Color', 'color', 'color', 2)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO size_attr_id FROM public.attributes WHERE slug = 'size';
  SELECT id INTO color_attr_id FROM public.attributes WHERE slug = 'color';

  -- Add specific new attribute values (if they don't exist yet)
  -- Colors: Royal Blue, Emerald Green, Classic Charcoal
  INSERT INTO public.attribute_values (attribute_id, value, display_order)
  VALUES
    (color_attr_id, 'Royal Blue', 5),
    (color_attr_id, 'Emerald Green', 6),
    (color_attr_id, 'Classic Charcoal', 7)
  ON CONFLICT DO NOTHING;

  -- Sizes: A5 (Classic), A6 (Pocket) for Journals
  INSERT INTO public.attribute_values (attribute_id, value, display_order)
  VALUES
    (size_attr_id, 'A5 (Classic)', 5),
    (size_attr_id, 'A6 (Pocket)', 6)
  ON CONFLICT DO NOTHING;

  -- Sizes: Ring sizes 7, 8, 9 for Ring
  INSERT INTO public.attribute_values (attribute_id, value, display_order)
  VALUES
    (size_attr_id, 'Size 7', 7),
    (size_attr_id, 'Size 8', 8),
    (size_attr_id, 'Size 9', 9)
  ON CONFLICT DO NOTHING;

  -- Link Products to their Attributes
  INSERT INTO public.product_attributes (product_id, attribute_id)
  VALUES 
    (shawl_id, color_attr_id),
    (journal_id, size_attr_id),
    (ring_id, size_attr_id)
  ON CONFLICT (product_id, attribute_id) DO NOTHING;

  -- Insert specific Variants for Pashmina Shawl (Color options)
  INSERT INTO public.variants (id, product_id, sku, price_adjustment, stock, image, attribute_combination)
  VALUES
    (
      '011cf8d2-7fb2-4a11-b85b-cf42d72f10ee', 
      shawl_id, 
      'PA-PS-01-BLUE', 
      0.00, 
      20, 
      'https://images.unsplash.com/photo-1524498250077-390f9e378fc0?w=800&auto=format&fit=crop&q=80', 
      '{"color": "Royal Blue"}'::jsonb
    ),
    (
      '022cf8d2-7fb2-4a11-b85b-cf42d72f10ef', 
      shawl_id, 
      'PA-PS-01-GREEN', 
      0.00, 
      25, 
      'https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&auto=format&fit=crop&q=80', 
      '{"color": "Emerald Green"}'::jsonb
    ),
    (
      '033cf8d2-7fb2-4a11-b85b-cf42d72f10f0', 
      shawl_id, 
      'PA-PS-01-CHAR', 
      10.00, -- Charcoal is a special limited collection, slightly higher price
      15, 
      'https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=800&auto=format&fit=crop&q=80', 
      '{"color": "Classic Charcoal"}'::jsonb
    )
  ON CONFLICT (sku) DO UPDATE SET
    price_adjustment = EXCLUDED.price_adjustment,
    stock = EXCLUDED.stock,
    image = EXCLUDED.image,
    attribute_combination = EXCLUDED.attribute_combination;

  -- Insert specific Variants for Lokta Journal (Size options)
  INSERT INTO public.variants (id, product_id, sku, price_adjustment, stock, image, attribute_combination)
  VALUES
    (
      '044cf8d2-7fb2-4a11-b85b-cf42d72f10f1', 
      journal_id, 
      'TC-LJ-02-A5', 
      0.00, 
      50, 
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80', 
      '{"size": "A5 (Classic)"}'::jsonb
    ),
    (
      '055cf8d2-7fb2-4a11-b85b-cf42d72f10f2', 
      journal_id, 
      'TC-LJ-02-A6', 
      -5.00, -- Smaller pocket size is slightly cheaper
      30, 
      'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?w=800&auto=format&fit=crop&q=80', 
      '{"size": "A6 (Pocket)"}'::jsonb
    )
  ON CONFLICT (sku) DO UPDATE SET
    price_adjustment = EXCLUDED.price_adjustment,
    stock = EXCLUDED.stock,
    image = EXCLUDED.image,
    attribute_combination = EXCLUDED.attribute_combination;

  -- Insert specific Variants for Turquoise Mantra Ring (Size options)
  INSERT INTO public.variants (id, product_id, sku, price_adjustment, stock, image, attribute_combination)
  VALUES
    (
      '066cf8d2-7fb2-4a11-b85b-cf42d72f10f3', 
      ring_id, 
      'JW-TR-01-SZ7', 
      0.00, 
      10, 
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80', 
      '{"size": "Size 7"}'::jsonb
    ),
    (
      '077cf8d2-7fb2-4a11-b85b-cf42d72f10f4', 
      ring_id, 
      'JW-TR-01-SZ8', 
      0.00, 
      12, 
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80', 
      '{"size": "Size 8"}'::jsonb
    ),
    (
      '088cf8d2-7fb2-4a11-b85b-cf42d72f10f5', 
      ring_id, 
      'JW-TR-01-SZ9', 
      0.00, 
      8, 
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80', 
      '{"size": "Size 9"}'::jsonb
    )
  ON CONFLICT (sku) DO UPDATE SET
    price_adjustment = EXCLUDED.price_adjustment,
    stock = EXCLUDED.stock,
    image = EXCLUDED.image,
    attribute_combination = EXCLUDED.attribute_combination;

END $$;

COMMIT;
