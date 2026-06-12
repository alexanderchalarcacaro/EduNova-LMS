import { Plan } from '../types';

export const PLANS: Plan[] = [
  {
    id: 'free_user',
    name: 'Free',
    price: '$0',
    color: 'bg-slate-100 border-slate-200',
    features: ['Acceso a 2 materias', 'Límite de 5 consultas/día', 'Comunidad básica']
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19.99/mes',
    color: 'bg-slate-900 border-slate-800 text-white',
    features: ['Materias ilimitadas', 'IA Socrática avanzada', 'Soporte prioritario', 'Certificados']
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: '$69.99/mes',
    color: 'bg-indigo-50 border-indigo-100',
    features: ['Todo lo de Pro', 'Tutorías en vivo', 'Plan personalizado RAG', 'Acceso para familias']
  }
];
