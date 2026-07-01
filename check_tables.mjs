import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://ddgcgolflbwdqzktovkq.supabase.co';
const supabaseKey = 'sb_publishable_VNW0owjNTrSFoTJqVRGvsQ_DA2ipvjn';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: cacheData, error: cacheErr } = await supabase.from('semantic_cache').select('*').limit(1);
  console.log('semantic_cache:', cacheData, cacheErr);

  const { data: chatsData, error: chatsErr } = await supabase.from('user_chats').select('*').limit(1);
  console.log('user_chats:', chatsData, chatsErr);

  const { data: itinData, error: itinErr } = await supabase.from('user_itineraries').select('*').limit(1);
  console.log('user_itineraries:', itinData, itinErr);
}

main();
