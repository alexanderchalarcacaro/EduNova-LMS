import { defineField, defineType } from 'sanity'

export const itineraryType = defineType({
  name: 'itinerary',
  title: 'Itinerario de Usuario',
  type: 'document',
  fields: [
    defineField({
      name: 'userId',
      title: 'Clerk User ID',
      type: 'string',
      validation: (rule) => rule.required(),
      description: 'El ID de Clerk del usuario dueño del itinerario.',
    }),
    defineField({
      name: 'subject',
      title: 'Materia (Subject Reference)',
      type: 'reference',
      to: [{ type: 'subject' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'topics',
      title: 'Temas Seleccionados',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'topic' }] }],
    }),
    defineField({
      name: 'updatedAt',
      title: 'Última Modificación',
      type: 'datetime',
    }),
  ],
})
