import { motion } from 'motion/react';
import { Check, Info } from 'lucide-react';
import { Topic } from '../types';

interface TopicListItemProps {
  key?: string | number;
  topic: Topic;
  isSelected: boolean;
  onToggle: (topic: Topic) => void;
}

export const TopicListItem = ({ topic, isSelected, onToggle }: TopicListItemProps) => {
  const difficultyColor = {
    Basic: 'text-green-600 bg-green-50',
    Intermediate: 'text-amber-600 bg-amber-50',
    Advanced: 'text-rose-600 bg-rose-50'
  }[topic.difficulty];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
        isSelected ? 'bg-white border-slate-900 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'
      }`}
      onClick={() => onToggle(topic)}
    >
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
        isSelected ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'
      }`}>
        {isSelected && <Check size={14} strokeWidth={3} />}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className={`font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
            {topic.name}
          </h4>
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${difficultyColor}`}>
            {topic.difficulty}
          </span>
        </div>
        <p className="text-xs text-slate-500 line-clamp-1">{topic.description}</p>
      </div>
      
      <button className="text-slate-400 hover:text-slate-600 p-1">
        <Info size={16} />
      </button>
    </motion.div>
  );
};
