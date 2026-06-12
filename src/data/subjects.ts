import { Subject } from '../types';

export const SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'Matemáticas',
    icon: 'Calculator',
    color: 'bg-blue-500',
    topics: [
      { id: 'm1', name: 'Álgebra Básica', description: 'Fundamentos de expresiones y ecuaciones.', difficulty: 'Basic' },
      { id: 'm2', name: 'Cálculo Diferencial', description: 'Estudio de las tasas de cambio y derivadas.', difficulty: 'Intermediate' },
      { id: 'm3', name: 'Geometría Analítica', description: 'Unión del álgebra y la geometría en el plano.', difficulty: 'Intermediate' },
      { id: 'm4', name: 'Estadística Descriptiva', description: 'Análisis y organización de conjuntos de datos.', difficulty: 'Basic' },
      { id: 'm5', name: 'Ecuaciones Diferenciales', description: 'Modelado de sistemas dinámicos complejos.', difficulty: 'Advanced' }
    ]
  },
  {
    id: 'physics',
    name: 'Física',
    icon: 'Zap',
    color: 'bg-purple-500',
    topics: [
      { id: 'p1', name: 'Mecánica Clásica', description: 'Leyes del movimiento de Newton.', difficulty: 'Basic' },
      { id: 'p2', name: 'Termodinámica', description: 'Calor, energía y entropía.', difficulty: 'Intermediate' },
      { id: 'p3', name: 'Electromagnetismo', description: 'Campos eléctricos y magnéticos.', difficulty: 'Intermediate' },
      { id: 'p4', name: 'Física Cuántica', description: 'El comportamiento de la materia a escala atómica.', difficulty: 'Advanced' }
    ]
  },
  {
    id: 'history',
    name: 'Historia',
    icon: 'BookOpen',
    color: 'bg-amber-500',
    topics: [
      { id: 'h1', name: 'Revolución Industrial', description: 'Transformación económica y social del siglo XVIII.', difficulty: 'Basic' },
      { id: 'h2', name: 'Guerras Mundiales', description: 'Análisis de los conflictos globales del siglo XX.', difficulty: 'Intermediate' },
      { id: 'h3', name: 'Civilizaciones Antiguas', description: 'Egipto, Mesopotamia y el valle del Indo.', difficulty: 'Basic' }
    ]
  },
  {
    id: 'biology',
    name: 'Biología',
    icon: 'Dna',
    color: 'bg-green-500',
    topics: [
      { id: 'b1', name: 'Genética', description: 'ADN y la herencia de rasgos.', difficulty: 'Intermediate' },
      { id: 'b2', name: 'Evolución', description: 'Selección natural y origen de especies.', difficulty: 'Basic' },
      { id: 'b3', name: 'Biología Celular', description: 'Estructura y función de la célula.', difficulty: 'Basic' }
    ]
  }
];
