import { defineType, defineField, defineArrayMember } from 'sanity'
import { BookIcon, StarIcon, ActivityIcon, LockIcon } from '@sanity/icons'

export const subjectType = defineType({
  name: 'subject',
  title: 'Materia / Curso de Estudio',
  type: 'document',
  // @ts-ignore
  icon: BookIcon,
  groups: [
    { name: 'details', title: 'Detalles Generales', icon: BookIcon, default: true },
    { name: 'styling', title: 'Diseño e Iconografía', icon: StarIcon },
    { name: 'access', title: 'Control de Acceso / Planes', icon: LockIcon },
    { name: 'topics', title: 'Unidades y Temas', icon: ActivityIcon },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Nombre de la Materia / Curso',
      type: 'string',
      group: 'details',
      validation: (Rule) => [
        Rule.required().error('El nombre de la materia es requerido para su correcto renderizado'),
        Rule.max(100).warning('Intenta mantener nombres compactos para favorecer la armonía visual'),
      ],
    }),
    defineField({
      name: 'slug',
      title: 'Slug identificador (URL)',
      type: 'slug',
      group: 'details',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule) => [
        Rule.required().error('El slug es necesario para resolver rutas únicas de estudio'),
      ],
    }),
    defineField({
      name: 'description',
      title: 'Descripción de la Materia',
      type: 'text',
      group: 'details',
      description: 'Breve párrafo detallando los conocimientos que el estudiante adquirirá en este itinerario.',
      validation: (Rule) => [
        Rule.required().error('La descripción ayuda a que el alumno encuentre la materia adecuada'),
        Rule.min(10).warning('Intenta escribir al menos 10 caracteres explicativos'),
        Rule.max(1000).warning('Mantén la descripción sintetizada por debajo de los 1000 caracteres'),
      ],
    }),
    defineField({
      name: 'image',
      title: 'Imagen de Portada (Opcional)',
      type: 'image',
      group: 'details',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'icon',
      title: 'Icono del Curso (Lucide pascalCase)',
      type: 'string',
      group: 'styling',
      description: 'Nombre exacto del icono de Lucide en PascalCase (ej: Calculator, Compass, BookOpen, Terminal, Brain, Shield, Globe, Heart, Atom, Trophy, Sparkles, Code, Orbit, Compass, Landmark). Ver biblioteca de Lucide React.',
      options: {
        list: [
          { title: 'Calculadora (Matemáticas)', value: 'Calculator' },
          { title: 'Libro Abierto (Humanidades/Sociales)', value: 'BookOpen' },
          { title: 'Brújula (Geografía/Exploración)', value: 'Compass' },
          { title: 'Cerebro (Psicología/Filosofía)', value: 'Brain' },
          { title: 'Terminal/Código (Sistemas)', value: 'Terminal' },
          { title: 'Globo Terráqueo (Idiomas/Negocios)', value: 'Globe' },
          { title: 'Escudo (Derecho/Civismo)', value: 'Shield' },
          { title: 'Átomo/Física (Orbit)', value: 'Orbit' },
          { title: 'Trofeo (Esfuerzo/General)', value: 'Trophy' },
          { title: 'Chispas (Creativo/Mixto)', value: 'Sparkles' },
          { title: 'Código puro (Code)', value: 'Code' },
          { title: 'Banco/Historia (Landmark)', value: 'Landmark' },
        ],
      },
      initialValue: 'BookOpen',
      validation: (Rule) => Rule.required().error('Elige un icono de Lucide para visualizar en las tarjetas del campus'),
    }),
    defineField({
      name: 'color',
      title: 'Color de Fondo de la Tarjeta (Tailwind class)',
      type: 'string',
      group: 'styling',
      description: 'Clase CSS de Tailwind para pintar la tarjeta de esta materia.',
      options: {
        list: [
          { title: 'Azul Platzi/Moderno', value: 'bg-[#2563eb]' },
          { title: 'Verde Platzi/Esmeralda', value: 'bg-emerald-600' },
          { title: 'Púrpura Profundo', value: 'bg-indigo-600' },
          { title: 'Carmesí Informativo', value: 'bg-rose-600' },
          { title: 'Naranja Académico', value: 'bg-amber-600' },
          { title: 'Violeta Tecnológico', value: 'bg-violet-600' },
          { title: 'Gris Neutro', value: 'bg-zinc-700' },
        ],
      },
      initialValue: 'bg-[#2563eb]',
      validation: (Rule) => Rule.required().error('Elige una paleta cromática para la distinción de la materia'),
    }),
    defineField({
      name: 'tier',
      title: 'Nivel / Plan de Suscripción requerido',
      type: 'string',
      group: 'access',
      description: 'Define qué nivel de suscripción de Clerk Billing necesita el alumno para acceder a este curso.',
      options: {
        list: [
          { title: 'Gratis (Free)', value: 'free' },
          { title: 'Académico Activo (Pro)', value: 'scholastic' },
          { title: 'Sabio Ultra (Ultra Premium)', value: 'ultra' },
        ],
        layout: 'radio',
      },
      initialValue: 'free',
      validation: (Rule) => Rule.required().error('Debes seleccionar un nivel de suscripción para control de acceso'),
    }),
    defineField({
      name: 'featured',
      title: 'Materia Destacada',
      type: 'boolean',
      group: 'access',
      description: 'Destacar curso prioritario en el inicio de la plataforma.',
      initialValue: false,
    }),
    defineField({
      name: 'topics',
      title: 'Temas / Lecciones',
      type: 'array',
      group: 'topics',
      description: 'Establece y ordena secuencialmente los temas que pertenecerán a este itinerario de aprendizaje.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'topic' }],
        }),
      ],
      validation: (Rule) => [
        Rule.unique().error('No puedes duplicar el mismo tema de estudio en un solo curso'),
        Rule.min(1).warning('Añade al menos un tema antes de publicar la materia en el campus'),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'name',
      icon: 'icon',
      tier: 'tier',
      featured: 'featured',
      topics: 'topics',
    },
    prepare({ title, icon, tier, featured, topics }) {
      const topicCount = topics?.length ?? 0;
      const tierEmojis: Record<string, string> = {
        free: '🆓',
        scholastic: '⭐',
        ultra: '💎',
      };
      const badge = (tier && tierEmojis[tier]) || '🆓';
      const isFeaturedLabel = featured ? ' • 🌟 Destacada' : '';
      return {
        title: `${badge} ${title || 'Curso sin nombre'}`,
        subtitle: `${topicCount} tema${topicCount === 1 ? '' : 's'} asignado${topicCount === 1 ? '' : 's'} • Tipo Lucide: ${icon || 'Ninguno'}${isFeaturedLabel}`,
      };
    },
  },
})
