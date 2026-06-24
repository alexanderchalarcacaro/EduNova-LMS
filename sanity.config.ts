import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './src/sanity/schemaTypes'
import { muxInput } from 'sanity-plugin-mux-input'

// Intentamos obtener las variables de entorno para que funcione tanto en Vite como en Node
const projectId = (typeof process !== 'undefined' ? process.env.VITE_SANITY_PROJECT_ID : (import.meta as any).env?.VITE_SANITY_PROJECT_ID) || 'upjd80sb';
const dataset = (typeof process !== 'undefined' ? process.env.VITE_SANITY_DATASET : (import.meta as any).env?.VITE_SANITY_DATASET) || 'production';

const sanityConfig = defineConfig({
  name: 'default',
  title: 'Edunova CMS',

  projectId,
  dataset,
  
  basePath: '/studio',

  plugins: [
    structureTool(),
    muxInput(),
  ],

  schema: {
    types: schemaTypes,
  },
})

export { sanityConfig }
export default sanityConfig
