require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkFarmer() {
  try {
    const { data, error } = await supabase.from('sellers').select('*').eq('full_name', 'Haldiram').single();
    if (error) {
      console.log("Error:", error);
    } else {
      console.log("Farmer Profile:", {
        id: data.id,
        full_name: data.full_name,
        profile_image: data.profile_image,
        cover_image: data.cover_image
      });
    }
  } catch (e) {
    console.log("Exception:", e.message);
  }
}

checkFarmer();
