import { defineType, defineField } from 'sanity'
import { PlayIcon, DocumentIcon, CogIcon } from '@sanity/icons'

export const topicType = defineType({
  name: 'topic',
  title: 'Tema de la Materia / Lecciones',
  type: 'document',
  // @ts-ignore
  icon: DocumentIcon,
  groups: [
    { name: 'details', title: 'Información Básica', icon: DocumentIcon, default: true },
    { name: 'media', title: 'Vídeo y Multimedia', icon: PlayIcon },
    { name: 'settings', title: 'Configuración de Nivel', icon: CogIcon },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Título del Tema de Estudio',
      type: 'string',
      group: 'details',
      validation: (Rule) => [
        Rule.required().error('El título de la lección es obligatorio'),
        Rule.max(100).warning('Intenta mantener títulos concretos para su visualización en pantallas móviles'),
      ],
    }),
    defineField({
      name: 'slug',
      title: 'Slug identificatorio de la lección',
      type: 'slug',
      group: 'details',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => [
        Rule.required().error('El slug es necesario para crear referencias unívocas de estudio'),
      ],
    }),
    defineField({
      name: 'description',
      title: 'Resumen o Sinopsis',
      type: 'text',
      group: 'details',
      description: 'Breve explicación introductoria sobre este tema que aparecerá en la card de selección de la materia.',
      validation: (Rule) => [
        Rule.required().error('La descripción ayuda a que el alumno comprenda de qué trata este tema'),
        Rule.max(400).warning('La sinopsis debe ser resumida, máximo 400 caracteres'),
      ],
    }),
    defineField({
      name: 'subject',
      title: 'Materia Madre / Curso Asociado',
      type: 'reference',
      to: [{ type: 'subject' }],
      group: 'settings',
      description: 'Enlaza este tema a su materia correspondiente para relacionarlo automáticamente.',
      validation: (Rule) => Rule.required().error('Debes asociar obligatoriamente este tema a alguna Materia'),
    }),
    defineField({
      name: 'videoUrl',
      title: 'Enlace de Vídeo Externo (e.g. YouTube, Vimeo)',
      type: 'url',
      group: 'media',
      description: 'Escribe la URL del vídeo si deseas ilustrar el tema con contenido externo.',
    }),
    defineField({
      name: 'videoFile',
      title: 'Carga de Video Profesional (Mux Player)',
      type: 'mux.video',
      group: 'media',
      description: 'Sube un vídeo nativo directamente y reprodúcelo de forma adaptativa y veloz con Mux.',
    }),
    defineField({
      name: 'content',
      title: 'Contenido Teórico / Material didáctico',
      type: 'array',
      group: 'media',
      description: 'Añade textos formativos, enlaces o imágenes ilustrativas que el Tutor Socrático AI usará para guiar la conversación.',
      of: [
        { type: 'block' },
        { 
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'caption',
              type: 'string',
              title: 'Pie de foto',
            },
            {
              name: 'alt',
              type: 'string',
              title: 'Texto alternativo para lectores de pantalla',
            }
          ]
        }
      ],
    }),
    defineField({
      name: 'difficulty',
      title: 'Nivel Socrático de Dificultad',
      type: 'string',
      group: 'settings',
      description: 'Ajustará el tono deductivo y de exigencia formulado por el tutor de inteligencia artificial durante el diálogo.',
      options: {
        list: [
          { title: '🟢 Principiante / Básico', value: 'Beginner' },
          { title: '🟡 Intermedio (Estándar)', value: 'Intermediate' },
          { title: '🔴 Avanzado / Complejo', value: 'Advanced' }
        ],
        layout: 'radio',
      },
      initialValue: 'Intermediate',
      validation: (Rule) => Rule.required().error('Selecciona una dificultad docente para calibrar el Socratic Tutor'),
    })
  ],
  preview: {
    select: {
      title: 'title',
      subjectName: 'subject.name',
      difficulty: 'difficulty',
    },
    prepare({ title, subjectName, difficulty }) {
      const labelMap: Record<string, string> = {
        Beginner: '🟢 Principiante',
        Intermediate: '🟡 Intermedio',
        Advanced: '🔴 Avanzado',
      };
      const formattedDiff = (difficulty && labelMap[difficulty]) || '🟡 Intermedio';
      return {
        title: title || 'Sin nombre',
        subtitle: `${subjectName ? `Materia: ${subjectName}` : 'Materia sin enlazar'} • ${formattedDiff}`,
      };
    },
  },
})
