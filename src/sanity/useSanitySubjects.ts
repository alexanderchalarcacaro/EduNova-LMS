import { useState, useEffect } from 'react';
import { Subject } from '../types';
import { getSubjectsUseCase } from '../core/HexagonalFactory';
import { sanityClient } from './client';

export const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: 'matematicas',
    name: 'Matemáticas',
    icon: 'Calculator',
    color: 'bg-[#2563eb]',
    topics: [
      { id: 'mates-1', name: 'Álgebra Básica', description: 'Fundamentos de álgebra, resolución de ecuaciones de primer y segundo grado.', difficulty: 'Beginner' },
      { id: 'mates-2', name: 'Geometría Euclídea', description: 'Estudio de figuras geométricas, áreas, perímetros y el teorema de Pitágoras.', difficulty: 'Intermediate' },
      { id: 'mates-3', name: 'Límites y Continuidad', description: 'Análisis de funciones, comportamiento asintótico y definición formal de límites.', difficulty: 'Advanced' }
    ]
  },
  {
    id: 'ciencias-sociales',
    name: 'Ciencias sociales',
    icon: 'BookOpen',
    color: 'bg-emerald-600',
    topics: [
      { id: 'sociales-1', name: 'Historia Antigua', description: 'Las grandes civilizaciones de la antigüedad como Mesopotamia, Egipto, Grecia y Roma.', difficulty: 'Beginner' },
      { id: 'sociales-2', name: 'Geografía Humana', description: 'Distribución de la población mundial, migraciones y dinámicas urbanas.', difficulty: 'Intermediate' },
      { id: 'sociales-3', name: 'Sistemas Políticos', description: 'Evolución de las formas de gobierno, democracia, ciudadanía y derechos fundamentales.', difficulty: 'Advanced' }
    ]
  }
];

export function useSanitySubjects(userId: string = 'guest') {
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(true);
  const [activeSubjectIds, setActiveSubjectIds] = useState<string[]>([]);
  const [itinerariesLoading, setItinerariesLoading] = useState(false);

  // Fetch all available subjects
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const data = await getSubjectsUseCase.execute();
        if (data && data.length > 0) {
          setSubjects(data);
        } else {
          setSubjects(DEFAULT_SUBJECTS);
        }
      } catch (error) {
        setSubjects(DEFAULT_SUBJECTS);
      } finally {
        setLoading(false);
      }
    }

    fetchSubjects();
  }, []);

  // Fetch the user's active course itineraries from Sanity
  useEffect(() => {
    async function fetchUserItineraries() {
      if (!userId || userId === 'guest') {
        // Fallback to locally tracked courses or empty lists for guest
        const guestSaved = localStorage.getItem('edunova_itineraries_guest');
        if (guestSaved) {
          try {
            setActiveSubjectIds(JSON.parse(guestSaved));
          } catch {
            setActiveSubjectIds([]);
          }
        } else {
          setActiveSubjectIds([]);
        }
        return;
      }
      setItinerariesLoading(true);
      try {
        // GROQ query to retrieve subject IDs the student has mapped to their itinerary schema
        const query = `*[_type == "itinerary" && userId == $userId] {
          "subjectId": subject->_id
        }`;
        const data = await sanityClient.fetch(query, { userId });
        if (data && Array.isArray(data)) {
          const ids = data
            .map((item: any) => item.subjectId)
            .filter((id): id is string => typeof id === 'string');
          setActiveSubjectIds(ids);
          // Sync to localStorage as backup
          localStorage.setItem(`edunova_itineraries_${userId}`, JSON.stringify(ids));
        } else {
          // If no data returned from Sanity, check localStorage fallback
          const backup = localStorage.getItem(`edunova_itineraries_${userId}`);
          if (backup) {
            setActiveSubjectIds(JSON.parse(backup));
          }
        }
      } catch (error) {
        console.warn('Sanity unreachable; loading local user itineraries backup:', error);
        const backup = localStorage.getItem(`edunova_itineraries_${userId}`);
        if (backup) {
          try {
            setActiveSubjectIds(JSON.parse(backup));
          } catch {
            setActiveSubjectIds([]);
          }
        }
      } finally {
        setItinerariesLoading(false);
      }
    }

    fetchUserItineraries();
  }, [userId]);

  // Command function to enroll a student or mark a course in progress in Sanity
  const registerItineraryInSanity = async (subjectId: string) => {
    // Determine the backup key based on userId
    const key = userId && userId !== 'guest' ? `edunova_itineraries_${userId}` : 'edunova_itineraries_guest';
    let currentIds: string[] = [];
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        currentIds = JSON.parse(saved);
      }
    } catch {}
    if (!currentIds.includes(subjectId)) {
      currentIds.push(subjectId);
      localStorage.setItem(key, JSON.stringify(currentIds));
      setActiveSubjectIds(currentIds);
    }

    if (!userId || userId === 'guest') {
      return;
    }

    try {
      // Check if it already exists to avoid duplication
      const checkQuery = `*[_type == "itinerary" && userId == $userId && subject._ref == $subjectId][0]`;
      const existing = await sanityClient.fetch(checkQuery, { userId, subjectId });

      if (!existing) {
        // Create transactional itinerary on Sanity
        // Note: For client-side mutations without configured write token, we add local state fallback
        const doc = {
          _type: 'itinerary',
          userId,
          subject: {
            _type: 'reference',
            _ref: subjectId
          },
          topics: [],
          updatedAt: new Date().toISOString()
        };

        // If Sanity token is configured for writes, execute, otherwise update locally
        if (sanityClient.config().token) {
          await sanityClient.create(doc);
        }
      }
    } catch (e) {
      console.warn('Sanity write ignored/simulated locally:', e);
    }
  };

  return { 
    subjects, 
    loading, 
    activeSubjectIds, 
    itinerariesLoading,
    registerItineraryInSanity 
  };
}
