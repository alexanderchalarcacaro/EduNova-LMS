import { supabase, isSupabaseConfigured } from './supabase';
import { Message } from '../types';

// Fallback en memoria, no almacena datos de forma persistente (100% seguro contra XSS local)
const memoryCache: Record<string, any> = {};

// Registra la ausencia de tablas
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
  if (!isSupabaseConfigured) {
    memoryCache[`plan_${userId}`] = planId;
    return null;
  }

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
  return null;
}

// Obtiene el perfil del estudiante (incluye su plan)
export async function getUserProfile(userId: string) {
  if (!isSupabaseConfigured) {
    const memPlan = memoryCache[`plan_${userId}`];
    return memPlan ? { user_id: userId, plan_id: memPlan } : null;
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code && error.code.includes('PGRST205')) {
      registerMissingTable('user_profiles');
    } else if (data) {
      return data;
    }
  } catch (e) {
    console.error("Failed to load user profile from Cloud:", e);
  }
  return null;
}

// Guarda el itinerario seleccionado (materia + temas)
export async function saveUserItinerary(userId: string, subjectId: string, topicIds: string[]) {
  const itineraryData = {
    user_id: userId,
    subject_id: subjectId,
    topic_ids: topicIds,
    updated_at: new Date().toISOString()
  };

  // Sync to Sanity (Fire-and-forget sync)
  try {
    fetch('/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subjectId, topicIds })
    }).catch(() => {});
  } catch (e) {
    console.error("Error triggering sanity sync:", e);
  }

  if (!isSupabaseConfigured) {
    memoryCache[`itinerary_${userId}`] = itineraryData;
    return null;
  }

  try {
    const { error } = await supabase
      .from('user_itineraries')
      .upsert({
        user_id: userId,
        subject_id: subjectId,
        topic_ids: topicIds,
        updated_at: itineraryData.updated_at
      });
    if (error) {
      if (error.code && error.code.includes('PGRST205')) {
        registerMissingTable('user_itineraries');
      } else {
        console.error("Supabase Error saving user itinerary:", error);
      }
    }
  } catch (e) {
    console.error("Failed to save user itinerary to Cloud:", e);
  }

  return null;
}

// Obtiene el itinerario del estudiante
export async function getUserItinerary(userId: string) {
  if (!isSupabaseConfigured) {
    return memoryCache[`itinerary_${userId}`] || null;
  }

  try {
    const { data, error } = await supabase
      .from('user_itineraries')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code && error.code.includes('PGRST205')) {
      registerMissingTable('user_itineraries');
    } else if (data) {
      return data;
    }
  } catch (e) {
    console.error("Failed to load user itinerary from Cloud:", e);
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

  if (!isSupabaseConfigured) {
    memoryCache[`chat_${userId}_${topicId}`] = chatData;
    let index = memoryCache[`chat_index_${userId}`] || [];
    if (!index.some((item: any) => item.topic_id === topicId)) {
      index.push({
        subject_id: subjectId,
        topic_id: topicId,
        topic_name: topicName,
        updated_at: chatData.updated_at
      });
    } else {
      const item = index.find((i: any) => i.topic_id === topicId);
      if (item) item.updated_at = chatData.updated_at;
    }
    memoryCache[`chat_index_${userId}`] = index;
    return null;
  }

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
  if (!isSupabaseConfigured) {
    return memoryCache[`chat_${userId}_${topicId}`] || null;
  }

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
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

// Obtiene todos los chats del usuario para ver el historial general en pantalla
export async function getUserAllChats(userId: string) {
  if (!isSupabaseConfigured) {
    const index = memoryCache[`chat_index_${userId}`] || [];
    return index.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

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
      return [];
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
    return [];
  }
}

export async function deleteUserChat(userId: string, topicId: string) {
  if (!isSupabaseConfigured) {
    delete memoryCache[`chat_${userId}_${topicId}`];
    let index = memoryCache[`chat_index_${userId}`] || [];
    memoryCache[`chat_index_${userId}`] = index.filter((i: any) => i.topic_id !== topicId);
    return null;
  }

  try {
    const { error } = await supabase
      .from('user_chats')
      .delete()
      .eq('user_id', userId)
      .eq('topic_id', topicId);
    
    if (error) {
      console.error("Error al eliminar el chat:", error);
    }
  } catch (err) {
    console.error("Fallo al eliminar el chat:", err);
  }
}

// Guarda un tema como completado por el estudiante
export async function saveCompletedTopic(userId: string, subjectId: string, topicId: string) {
  const activeUserId = userId || 'guest';
  
  // Guardado local (LocalStorage)
  try {
    const saved = localStorage.getItem(`edunova_completed_topics_${activeUserId}`);
    let completed = saved ? JSON.parse(saved) : [];
    if (!completed.includes(topicId)) {
      completed.push(topicId);
      localStorage.setItem(`edunova_completed_topics_${activeUserId}`, JSON.stringify(completed));
    }
  } catch (e) {
    console.error("Error saving completed topic locally:", e);
  }

  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { error } = await supabase
      .from('user_completed_topics')
      .upsert({
        user_id: activeUserId,
        subject_id: subjectId,
        topic_id: topicId,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,topic_id' });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        registerMissingTable('user_completed_topics');
      } else {
        console.error("Error saving completed topic to Supabase:", error);
      }
    }
  } catch (e) {
    console.error("Failed to save completed topic to Supabase:", e);
  }
  return null;
}

// Obtiene todos los temas completados del estudiante
export async function getCompletedTopics(userId: string, subjectId?: string): Promise<string[]> {
  const activeUserId = userId || 'guest';
  
  // Fallback LocalStorage
  let localCompleted: string[] = [];
  try {
    const saved = localStorage.getItem(`edunova_completed_topics_${activeUserId}`);
    localCompleted = saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error("Error reading completed topics locally:", e);
  }

  if (!isSupabaseConfigured || !supabase) {
    return localCompleted;
  }

  try {
    let query = supabase
      .from('user_completed_topics')
      .select('topic_id')
      .eq('user_id', activeUserId);
      
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = query ? await query : { data: null, error: null };
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        registerMissingTable('user_completed_topics');
      }
      return localCompleted;
    }
    
    if (data && data.length > 0) {
      return data.map((d: any) => d.topic_id);
    }
  } catch (e) {
    console.error("Failed to fetch completed topics from Supabase:", e);
  }
  
  return localCompleted;
}

// Guarda el último tema estudiado (lección en curso) para una materia
export async function saveLastStudiedTopic(userId: string, subjectId: string, topicId: string, topicName: string, subjectName: string) {
  const activeUserId = userId || 'guest';
  const timestamp = new Date().toISOString();

  // Guardado local (LocalStorage)
  try {
    localStorage.setItem(`edunova_last_studied_sub_${activeUserId}_${subjectId}`, topicId);
    const payload = {
      subjectId,
      topicId,
      topicName,
      subjectName,
      timestamp
    };
    localStorage.setItem(`edunova_last_studied_global_${activeUserId}`, JSON.stringify(payload));
  } catch (e) {
    console.error("Error saving last studied topic locally:", e);
  }

  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { error } = await supabase
      .from('user_course_progress')
      .upsert({
        user_id: activeUserId,
        subject_id: subjectId,
        last_topic_id: topicId,
        last_topic_name: topicName,
        subject_name: subjectName,
        updated_at: timestamp
      }, { onConflict: 'user_id,subject_id' });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        registerMissingTable('user_course_progress');
      } else {
        console.error("Error saving course progress to Supabase:", error);
      }
    }
  } catch (e) {
    console.error("Failed to save course progress to Supabase:", e);
  }
  return null;
}

// Obtiene el progreso de los cursos del usuario (todas las materias en curso, su última lección, etc.)
export async function getUserCoursesProgress(userId: string): Promise<any[]> {
  const activeUserId = userId || 'guest';
  
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('user_course_progress')
      .select('*')
      .eq('user_id', activeUserId);
      
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        registerMissingTable('user_course_progress');
      }
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("Failed to fetch user course progress from Supabase:", e);
    return [];
  }
}


