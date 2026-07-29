import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_URL) ||
  process.env.SUPABASE_URL ||
  'https://dsyxiowlipttwjuhoqio.supabase.co';

// On server / build time, prefer secret key to bypass RLS restrictions safely
const supabaseKey =
  (typeof import.meta !== 'undefined' && (import.meta.env?.SUPABASE_SECRET_KEY || import.meta.env?.SUPABASE_PUBLISHABLE_KEY)) ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  '';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
