const { createClient } = require('@supabase/supabase-js');

let supabase = null;

const initializeDatabase = () => {
  if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    supabase = createClient(process.env.SUPABASE_URL, key, {
      auth: { persistSession: false },
      db: { schema: 'public' },
      global: { headers: { 'x-connection-pool': 'enabled' } }
    });
    console.log('✓ Supabase client initialized');
  } else {
    console.warn('Supabase not configured');
  }
  return supabase;
};

const getDatabase = () => supabase || initializeDatabase();

module.exports = { initializeDatabase, getDatabase };