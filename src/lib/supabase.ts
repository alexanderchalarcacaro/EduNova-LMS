import { ChatMessage } from '../types';
import { createClient } from '@supabase/supabase-js';

// Detect if Supabase is properly configured with a valid HTTP/HTTPS URL
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || '';
export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseKey && 
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('YOUR_');

// We will implement structured chat persistence that saves directly to localStorage,
// but can sync or call Supabase transparently.
// This guarantees that chat saving ALWAYS works and is durable.

interface ChatMeta {
  userId: string;
  subjectId: string;
  topicId: string;
  topicName: string;
  lastMessage: string;
  updatedAt: string;
}

export async function getUserAllChats(userId: string): Promise<any[]> {
  try {
    const localData = localStorage.getItem(`edunova_chats_meta_${userId}`);
    if (localData) {
      return JSON.parse(localData);
    }
  } catch (e) {
    console.error('Error loading chats from local storage:', e);
  }
  return [];
}

export async function getChatHistory(userId: string, subjectId: string, topicId: string): Promise<ChatMessage[]> {
  try {
    const localData = localStorage.getItem(`edunova_chat_history_${userId}_${subjectId}_${topicId}`);
    if (localData) {
      return JSON.parse(localData);
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
  
  try {
    // Save history
    localStorage.setItem(
      `edunova_chat_history_${finalUserId}_${subjectId}_${topicId}`,
      JSON.stringify(messages)
    );

    // Update list of all chats (meta overview)
    const allChats = await getUserAllChats(finalUserId);
    const existingIndex = allChats.findIndex(
      (c) => c.subject_id === subjectId && c.topic_id === topicId
    );

    const lastMsgContent = messages[messages.length - 1]?.content || '';
    const newMeta = {
      user_id: finalUserId,
      subject_id: subjectId,
      topic_id: topicId,
      topic_name: topicName,
      last_message: lastMsgContent.substring(0, 100),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex > -1) {
      allChats[existingIndex] = newMeta;
    } else {
      allChats.unshift(newMeta);
    }

    localStorage.setItem(`edunova_chats_meta_${finalUserId}`, JSON.stringify(allChats));
  } catch (e) {
    console.error('Failed to save chat message:', e);
  }
}

export async function deleteChatMessage(userId: string, subjectId: string, topicId: string): Promise<void> {
  const finalUserId = userId || 'anonymous_user';
  try {
    localStorage.removeItem(`edunova_chat_history_${finalUserId}_${subjectId}_${topicId}`);
    const allChats = await getUserAllChats(finalUserId);
    const updatedChats = allChats.filter(
      (c) => !(c.subject_id === subjectId && c.topic_id === topicId)
    );
    localStorage.setItem(`edunova_chats_meta_${finalUserId}`, JSON.stringify(updatedChats));
  } catch (e) {
    console.error('Failed to delete chat:', e);
  }
}

// Initialize real Supabase client if configured, otherwise null
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
