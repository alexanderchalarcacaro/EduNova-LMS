import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Message } from '../types';

// Registry of missing database tables (PGRST205 schema cache errors)
const missingTables = new Set<string>();
type TableStatusListener = (missing: string[]) => void;
const listeners = new Set<TableStatusListener>();

export function getMissingTables(): string[] {
  return Array.from(missingTables);
}

export function onTableStatusChange(listener: TableStatusListener) {
  listeners.add(listener);
  listener(Array.from(missingTables));
  return () => {
    listeners.delete(listener);
  };
}

function registerMissingTable(tableName: string) {
  if (!missingTables.has(tableName)) {
    missingTables.add(tableName);
    if (isSupabaseConfigured) {
      console.warn(`[Supabase Status] Detectada tabla faltante: "${tableName}". Por favor ejecuta supabase-setup.sql en tu consola de Supabase.`);
    }
    listeners.forEach(l => {
      try { l(Array.from(missingTables)); } catch (e) {}
    });
  }
}

// Guarda o actualiza el plan del estudiante
export async function saveUserPlan(userId: string, planId: string) {
  try {
    localStorage.setItem(`edunova_plan_${userId}`, planId);
  } catch (e) {}

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          plan_id: planId
        });
      if (error) {
        if (error.code && error.code.includes('PGRST205')) {
          registerMissingTable('user_profiles');
        } else {
          console.error("Supabase Error saving user plan:", error);
        }
      }
    } catch (e) {
      console.error("Failed to save user plan to Cloud:", e);
    }
  }

  return null;
}

// Obtiene el perfil del estudiante (incluye su plan)
export async function getUserProfile(userId: string) {
  let profile = null;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code && error.code.includes('PGRST205')) {
        registerMissingTable('user_profiles');
      } else if (data) {
        profile = data;
        // Sync local
        try { localStorage.setItem(`edunova_plan_${userId}`, data.plan_id); } catch(e) {}
      }
    } catch (e) {
      console.error("Failed to load user profile from Cloud:", e);
    }
  }

  // Fallback a local
  if (!profile) {
    const localPlan = localStorage.getItem(`edunova_plan_${userId}`);
    if (localPlan) {
      profile = { user_id: userId, plan_id: localPlan };
    }
  }

  return profile;
}

// Guarda el itinerario seleccionado (materia + temas)
export async function saveUserItinerary(userId: string, subjectId: string, topicIds: string[]) {
  const itineraryData = {
    user_id: userId,
    subject_id: subjectId,
    topic_ids: topicIds,
    updated_at: new Date().toISOString()
  };
  try {
    localStorage.setItem(`edunova_itinerary_${userId}`, JSON.stringify(itineraryData));
  } catch (e) {}
  return null;
}

// Obtiene el itinerario del estudiante
export async function getUserItinerary(userId: string) {
  const localItineraryStr = localStorage.getItem(`edunova_itinerary_${userId}`);
  if (localItineraryStr) {
    try { return JSON.parse(localItineraryStr); } catch (e) { return null; }
  }
  return null;
}

// Guarda o actualiza el historial de un chat para una materia y tema específico
export async function saveUserChat(userId: string, subjectId: string, topicId: string, topicName: string, messages: Message[]) {
  const chatData = {
    user_id: userId,
    subject_id: subjectId,
    topic_id: topicId,
    topic_name: topicName,
    messages: messages,
    updated_at: new Date().toISOString()
  };

  // Guardar en localStorage para disponibilidad local instantánea
  try {
    localStorage.setItem(`edunova_chat_${userId}_${topicId}`, JSON.stringify(chatData));
    const existingIndexStr = localStorage.getItem(`edunova_chat_index_${userId}`) || '[]';
    const existingIndex = JSON.parse(existingIndexStr);
    if (!existingIndex.some((item: any) => item.topic_id === topicId)) {
      existingIndex.push({
        subject_id: subjectId,
        topic_id: topicId,
        topic_name: topicName,
        updated_at: chatData.updated_at
      });
      localStorage.setItem(`edunova_chat_index_${userId}`, JSON.stringify(existingIndex));
    } else {
      const item = existingIndex.find((i: any) => i.topic_id === topicId);
      if (item) {
        item.updated_at = chatData.updated_at;
        localStorage.setItem(`edunova_chat_index_${userId}`, JSON.stringify(existingIndex));
      }
    }
  } catch (e) {}

  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('user_chats')
      .upsert(chatData, { onConflict: 'user_id,topic_id' });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        registerMissingTable('user_chats');
      }
    }
    return data;
  } catch (e) {
    return null;
  }
}

// Obtiene el historial de un chat para un tema específico
export async function getUserChat(userId: string, topicId: string) {
  const getLocal = () => {
    const localChatStr = localStorage.getItem(`edunova_chat_${userId}_${topicId}`);
    if (localChatStr) {
      try { return JSON.parse(localChatStr); } catch (e) { return null; }
    }
    return null;
  };

  if (!isSupabaseConfigured) return getLocal();

  try {
    const { data, error } = await supabase
      .from('user_chats')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          registerMissingTable('user_chats');
        }
      }
      return getLocal();
    }
    return data;
  } catch (e) {
    return getLocal();
  }
}

// Obtiene todos los chats del usuario para ver el historial general en pantalla
export async function getUserAllChats(userId: string) {
  if (!isSupabaseConfigured) return getLocalAllChats(userId);

  try {
    const { data, error } = await supabase
      .from('user_chats')
      .select('subject_id, topic_id, topic_name, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        registerMissingTable('user_chats');
      }
      return getLocalAllChats(userId);
    }

    const chatsList = data || [];
    const uniqueChatsMap = new Map();
    chatsList.forEach((chat: any) => {
      if (chat && chat.topic_id && !uniqueChatsMap.has(chat.topic_id)) {
        uniqueChatsMap.set(chat.topic_id, chat);
      }
    });
    return Array.from(uniqueChatsMap.values());
  } catch (e) {
    return getLocalAllChats(userId);
  }
}

function getLocalAllChats(userId: string) {
  try {
    const indexStr = localStorage.getItem(`edunova_chat_index_${userId}`) || '[]';
    const index = JSON.parse(indexStr);

    // Deduplicate index list by topic_id
    const uniqueIndexMap = new Map();
    index.forEach((item: any) => {
      if (item && item.topic_id && !uniqueIndexMap.has(item.topic_id)) {
        uniqueIndexMap.set(item.topic_id, item);
      }
    });

    const uniqueIndex = Array.from(uniqueIndexMap.values());
    // Ordenar de más reciente a más viejo
    return uniqueIndex.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } catch (e) {
    return [];
  }
}

