import { ChatMessage } from '../types';
import { createClient } from '@supabase/supabase-js';

// Detect if Supabase is properly configured with a valid HTTP/HTTPS URL
let rawSupabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
if (rawSupabaseUrl.startsWith('//')) {
  rawSupabaseUrl = 'https:' + rawSupabaseUrl;
}
const supabaseUrl = rawSupabaseUrl;
const supabaseKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseKey && 
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('YOUR_');

// Initialize real Supabase client if configured, otherwise null
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function getUserAllChats(userId: string): Promise<any[]> {
  const finalUserId = userId || 'anonymous_user';
  
  // 1. Try server-side proxy API first (reliable, secure, works in all runtime environments)
  try {
    const response = await fetch(`/api/chats?userId=${encodeURIComponent(finalUserId)}`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (e) {
    console.warn('Server-side getUserAllChats failed, attempting client-side fallback:', e);
  }

  // 2. Client-side direct Supabase fallback
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('user_chats')
      .select('subject_id, topic_id, topic_name, updated_at, messages')
      .eq('user_id', finalUserId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching chats from Supabase:', error);
      return [];
    }
    
    return (data || []).map(chat => {
      const messages = chat.messages as ChatMessage[];
      const lastMsgContent = messages.length > 0 ? messages[messages.length - 1].content : '';
      return {
        user_id: finalUserId,
        subject_id: chat.subject_id,
        topic_id: chat.topic_id,
        topic_name: chat.topic_name,
        last_message: lastMsgContent.substring(0, 100),
        updated_at: chat.updated_at
      };
    });
  } catch (e) {
    console.error('Error loading chats from Supabase:', e);
  }
  return [];
}

export async function getChatHistory(userId: string, subjectId: string, topicId: string): Promise<ChatMessage[]> {
  const finalUserId = userId || 'anonymous_user';

  // 1. Try server-side proxy API first (reliable, secure, works in all runtime environments)
  try {
    const response = await fetch(`/api/chats/history?userId=${encodeURIComponent(finalUserId)}&topicId=${encodeURIComponent(topicId)}`);
    if (response.ok) {
      const data = await response.json();
      return data as ChatMessage[];
    }
  } catch (e) {
    console.warn('Server-side getChatHistory failed, attempting client-side fallback:', e);
  }

  // 2. Client-side direct Supabase fallback
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('user_chats')
      .select('messages')
      .eq('user_id', finalUserId)
      .eq('topic_id', topicId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means zero rows
      console.error('Error loading chat history from Supabase:', error);
      return [];
    }
    
    if (data && data.messages) {
      return data.messages as ChatMessage[];
    }
  } catch (e) {
    console.error('Error loading chat history:', e);
  }
  return [];
}

export async function saveChatMessage(
  userId: string,
  subjectId: string,
  topicId: string,
  topicName: string,
  messages: ChatMessage[]
): Promise<void> {
  const finalUserId = userId || 'anonymous_user';

  // 1. Try server-side proxy API first (reliable, secure, works in all runtime environments)
  try {
    const response = await fetch('/api/chats/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: finalUserId,
        subjectId,
        topicId,
        topicName,
        messages
      })
    });
    if (response.ok) {
      return;
    }
  } catch (e) {
    console.warn('Server-side saveChatMessage failed, attempting client-side fallback:', e);
  }

  // 2. Client-side direct Supabase fallback
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('user_chats')
      .upsert({
        user_id: finalUserId,
        subject_id: subjectId,
        topic_id: topicId,
        topic_name: topicName,
        messages: messages,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, topic_id' });

    if (error) {
      console.error('Failed to save chat message in Supabase:', error);
    }
  } catch (e) {
    console.error('Failed to save chat message:', e);
  }
}

export async function deleteChatMessage(userId: string, subjectId: string, topicId: string): Promise<void> {
  const finalUserId = userId || 'anonymous_user';

  // 1. Try server-side proxy API first (reliable, secure, works in all runtime environments)
  try {
    const response = await fetch(`/api/chats?userId=${encodeURIComponent(finalUserId)}&topicId=${encodeURIComponent(topicId)}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      return;
    }
  } catch (e) {
    console.warn('Server-side deleteChatMessage failed, attempting client-side fallback:', e);
  }

  // 2. Client-side direct Supabase fallback
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('user_chats')
      .delete()
      .eq('user_id', finalUserId)
      .eq('topic_id', topicId);
      
    if (error) {
      console.error('Failed to delete chat in Supabase:', error);
    }
  } catch (e) {
    console.error('Failed to delete chat:', e);
  }
}

export async function saveUserItinerary(userId: string, subjectId: string, topicIds: string[]): Promise<void> {
  const finalUserId = userId || 'anonymous_user';
  
  // 1. Call full-stack endpoint for Clerk authentication validation & server-side database registration
  try {
    console.log(`[Itinerary Sync] Requesting server-side validation & registration for ${finalUserId}...`);
    const response = await fetch('/api/itinerary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: finalUserId,
        subjectId,
        topicIds
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[Itinerary Sync] Server successfully validated and registered itinerary:`, data);
      return;
    } else {
      const errData = await response.json().catch(() => ({}));
      console.warn(`[Itinerary Sync] Server validation returned error:`, errData.error || response.statusText);
    }
  } catch (e) {
    console.warn(`[Itinerary Sync] Server-side registration failed. Falling back to direct client-side Supabase query.`, e);
  }

  // 2. High-fidelity client-side fallback write to Supabase if the backend endpoint is unreachable or fails
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('user_itineraries')
      .upsert({
        user_id: finalUserId,
        subject_id: subjectId,
        topic_ids: topicIds,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to upsert itinerary in Supabase (client-side fallback):', error);
    } else {
      console.log('[Itinerary Sync] Client-side fallback registration completed successfully.');
    }
  } catch (e) {
    console.error('Failed to save itinerary on client-side fallback:', e);
  }
}
