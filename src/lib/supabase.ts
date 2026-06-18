import { createClient } from '@supabase/supabase-js';

let rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
if (rawUrl.startsWith('//')) {
  rawUrl = 'https:' + rawUrl;
} else if (rawUrl && !rawUrl.startsWith('http')) {
  rawUrl = 'https://' + rawUrl;
}
const supabaseUrl = rawUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'placeholder';

export const isSupabaseConfigured = 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseAnonKey !== 'placeholder' &&
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
