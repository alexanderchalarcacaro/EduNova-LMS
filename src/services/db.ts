import { supabase } from '../lib/supabase';
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
    console.warn(`[Supabase Status] Detectada tabla faltante: "${tableName}". Por favor ejecuta supabase-setup.sql en tu consola de Supabase.`);
    listeners.forEach(l => {
      try { l(Array.from(missingTables)); } catch (e) {}
    });
  }
}

// Guarda o actualiza el plan del estudiante
export async function saveUserPlan(userId: string, planId: string) {
  // Guardar en localStorage como respaldo local inmediato
  try {
    localStorage.setItem(`edunova_plan_${userId}`, planId);
  } catch (e) {}

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, plan_id: planId }, { onConflict: 'user_id' });
    
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        registerMissingTable('user_profiles');
        console.warn('[Supabase] Tabla user_profiles no encontrada. Usando respaldo de LocalStorage.');
      } else {
        console.error('Error saving plan to Supabase:', error.message);
      }
    }
    return data;
  } catch (e) {
    console.warn('[Supabase] Falla al intentar guardar en user_profiles, usando fallback local.');
    return null;
  }
}

// Obtiene el perfil del estudiante (incluye su plan)
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      if (error.code !== 'PGRST116') { 
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          registerMissingTable('user_profiles');
          console.warn('[Supabase] Tabla user_profiles no detectada en Supabase. Leyendo de LocalStorage.');
        } else {
          console.warn('Error fetching user profile from Supabase, pulling from LocalStorage fallback:', error.message);
        }
      }
      
      // Intentar fallback
      const localPlan = localStorage.getItem(`edunova_plan_${userId}`);
      if (localPlan) {
        return { user_id: userId, plan_id: localPlan };
      }
      return null;
    }
    return data;
  } catch (e) {
    const localPlan = localStorage.getItem(`edunova_plan_${userId}`);
    if (localPlan) {
      return { user_id: userId, plan_id: localPlan };
    }
    return null;
  }
}

// Guarda el itinerario seleccionado (materia + temas)
export async function saveUserItinerary(userId: string, subjectId: string, topicIds: string[]) {
  const itineraryData = {
    user_id: userId,
    subject_id: subjectId,
    topic_ids: topicIds,
    updated_at: new Date().toISOString()
  };

  // Guardar preventivamente en LocalStorage para garantizar consistencia local inmediata
  try {
    localStorage.setItem(`edunova_itinerary_${userId}`, JSON.stringify(itineraryData));
  } catch (e) {}

  try {
    const { data, error } = await supabase
      .from('user_itineraries')
      .upsert(itineraryData, { onConflict: 'user_id' });
      
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        registerMissingTable('user_itineraries');
        console.warn('[Supabase] Tabla user_itineraries no encontrada en Supabase. Usando LocalStorage.');
      } else {
        console.error('Error saving itinerary to Supabase:', error.message);
      }
    }
    return data;
  } catch (e) {
    console.warn('[Supabase] Error conectando a Supabase para itinerario, usando fallback local.');
    return null;
  }
}

// Obtiene el itinerario del estudiante
export async function getUserItinerary(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_itineraries')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      if (error.code !== 'PGRST116') {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          registerMissingTable('user_itineraries');
          console.warn('[Supabase] Tabla user_itineraries no encontrada en Supabase. Recuperando de LocalStorage.');
        } else {
          console.warn('Error fetching itinerary from Supabase, pulling from LocalStorage:', error.message);
        }
      }
      
      // Intentar fallback local
      const localItineraryStr = localStorage.getItem(`edunova_itinerary_${userId}`);
      if (localItineraryStr) {
        try {
          return JSON.parse(localItineraryStr);
        } catch (parseErr) {
          return null;
        }
      }
      return null;
    }
    return data;
  } catch (e) {
    const localItineraryStr = localStorage.getItem(`edunova_itinerary_${userId}`);
    if (localItineraryStr) {
      try {
        return JSON.parse(localItineraryStr);
      } catch (parseErr) {
        return null;
      }
    }
    return null;
  }
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
    
    // También guardar una lista indexada de los temas que tienen chat para listarlos fácilmente en el panel si falla Supabase
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
      // Actualizar la fecha de modificación
      const item = existingIndex.find((i: any) => i.topic_id === topicId);
      if (item) {
        item.updated_at = chatData.updated_at;
        localStorage.setItem(`edunova_chat_index_${userId}`, JSON.stringify(existingIndex));
      }
    }
  } catch (e) {
    console.error('Error guardando chat localmente:', e);
  }

  try {
    const { data, error } = await supabase
      .from('user_chats')
      .upsert(chatData, { onConflict: 'user_id,topic_id' });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        registerMissingTable('user_chats');
        console.warn('[Supabase] Tabla user_chats no encontrada. Usando respaldo de LocalStorage.');
      } else {
        console.error('Error saving chat to Supabase:', error.message);
      }
    }
    return data;
  } catch (e) {
    console.warn('[Supabase] No se pudo guardar el chat en la nube. Respaldo local activo.');
    return null;
  }
}

// Obtiene el historial de un chat para un tema específico
export async function getUserChat(userId: string, topicId: string) {
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
          console.warn('[Supabase] Tabla user_chats no encontrada. Usando LocalStorage.');
        } else {
          console.warn('Error fetching chat from Supabase, pulling from LocalStorage:', error.message);
        }
      }
      
      const localChatStr = localStorage.getItem(`edunova_chat_${userId}_${topicId}`);
      if (localChatStr) {
        const parsed = JSON.parse(localChatStr);
        return parsed;
      }
      return null;
    }
    return data;
  } catch (e) {
    const localChatStr = localStorage.getItem(`edunova_chat_${userId}_${topicId}`);
    if (localChatStr) {
      try {
        return JSON.parse(localChatStr);
      } catch (parseErr) {
        return null;
      }
    }
    return null;
  }
}

// Obtiene todos los chats del usuario para ver el historial general en pantalla
export async function getUserAllChats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_chats')
      .select('subject_id, topic_id, topic_name, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        registerMissingTable('user_chats');
        console.warn('[Supabase] Tabla user_chats no encontrada en Supabase. Listando chats guardados localmente.');
      } else {
        console.warn('Error fetching all chats from Supabase:', error.message);
      }
      
      return getLocalAllChats(userId);
    }

    const chatsList = data || [];
    // Deduplicate chats by topic_id
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

