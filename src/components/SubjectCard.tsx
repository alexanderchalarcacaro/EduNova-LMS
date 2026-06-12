import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { Subject } from '../types';

interface SubjectCardProps {
  key?: string | number;
  subject: Subject;
  onClick: (subject: Subject) => void;
}

export const SubjectCard = ({ subject, onClick }: SubjectCardProps) => {
  const IconComponent = (Icons as any)[subject.icon] || Icons.Book;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(subject)}
      className="relative overflow-hidden group p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all text-left w-full h-full"
    >
      <div className={`w-12 h-12 rounded-2xl ${subject.color} flex items-center justify-center text-white mb-4`}>
        <IconComponent size={24} />
      </div>
      <h3 className="text-xl font-display font-semibold mb-1">{subject.name}</h3>
      <p className="text-slate-500 text-sm">{subject.topics.length} temas disponibles</p>
      
      <div className="absolute top-4 right-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
        <Icons.ArrowRight size={20} />
      </div>
    </motion.button>
  );
};
