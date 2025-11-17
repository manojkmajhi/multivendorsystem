const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkImagePaths() {
  try {
    // Check farmer profile images
    const { data: farmers, error: farmerError } = await supabase
      .from('farmers')
      .select('id, full_name, profile_image, cover_image')
      .not('profile_image', 'is', null);
    
    if (farmerError) {
      console.error('Error fetching farmers:', farmerError);
      return;
    }

    console.log('Farmers with images:');
    farmers.forEach(farmer => {
      console.log(`- ${farmer.full_name}:`);
      if (farmer.profile_image) console.log(`  Profile: ${farmer.profile_image}`);
      if (farmer.cover_image) console.log(`  Cover: ${farmer.cover_image}`);
    });

    // Check farmer posts
    const { data: posts, error: postError } = await supabase
      .from('farmer_posts')
      .select('id, content, media_url, media_type')
      .not('media_url', 'is', null);
    
    if (postError) {
      console.error('Error fetching posts:', postError);
      return;
    }

    console.log('\nFarmer posts with media:');
    posts.forEach(post => {
      console.log(`- Post ${post.id}: ${post.media_url} (${post.media_type})`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkImagePaths();