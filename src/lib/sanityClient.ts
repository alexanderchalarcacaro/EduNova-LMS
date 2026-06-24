import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID || 'upjd80sb',
  dataset: import.meta.env.VITE_SANITY_DATASET || 'production',
  useCdn: true, // `false` si quieres asegurar datos en tiempo real
  apiVersion: '2023-05-03', // usa la fecha actual para mantener consistencia
  token: import.meta.env.VITE_SANITY_API_TOKEN, // Solo si el dataset es privado o para mutaciones
});
