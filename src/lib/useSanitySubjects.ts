import { useState, useEffect } from 'react';
import { SUBJECTS as INITIAL_SUBJECTS } from '../data/subjects';
import { Subject } from '../types';

export function useSanitySubjects() {
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const response = await fetch('/api/subjects');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        
        if (data.subjects && data.subjects.length > 0) {
          setSubjects(data.subjects);
        }
      } catch (error) {
        // Fallback silently to offline subjects
      } finally {
        setLoading(false);
      }
    }

    loadSubjects();
  }, []);

  return { subjects, loading };
}
