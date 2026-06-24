import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, User, GraduationCap, X, Check, Cloud, Sparkles, BookOpen, ExternalLink, ShieldCheck
} from 'lucide-react';
import { Plan } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  userPlan: Plan | null;
  setCurrentView: (view: 'DASHBOARD' | 'TOPIC_SELECTION' | 'LEARNING' | 'PRICING') => void;
  // Kept for backward compatibility but hidden from UI
  missingTables?: string[];
  supabaseSql?: string;
}

export function SettingsModal({
  isOpen, onClose, user, userPlan, setCurrentView
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'sanity'>('profile');
  const [defaultDifficulty, setDefaultDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load selected academic difficulty from simple storage if exists
  useEffect(() => {
    if (isOpen) {
      setActiveTab('profile');
      const saved = localStorage.getItem('edunova_default_difficulty');
      if (saved === 'Beginner' || saved === 'Intermediate' || saved === 'Advanced') {
        setDefaultDifficulty(saved);
      }
    }
  }, [isOpen]);

  const handleSaveDifficulty = (level: 'Beginner' | 'Intermediate' | 'Advanced') => {
    setDefaultDifficulty(level);
    localStorage.setItem('edunova_default_difficulty', level);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070f]/85 backdrop-blur-xl sm:p-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl bg-[#090c16] border border-white/10 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[85vh] md:h-[500px]"
        >
          
          {/* SIDEBAR NAVIGATION */}
          <div className="w-full md:w-56 bg-[#0c0f1d] border-b md:border-b-0 md:border-r border-white/5 flex flex-col shrink-0">
            <div className="p-6 md:pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-transparent border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Settings size={18} className="animate-[spin_4s_linear_infinite]" />
              </div>
              <div>
                <h3 className="text-white text-xs font-bold tracking-wider uppercase">Ajustes</h3>
                <span className="text-[10px] text-zinc-500 font-mono">Personalización</span>
              </div>
            </div>

            <div className="flex md:flex-col gap-1.5 p-4 md:pt-4 overflow-x-auto no-scrollbar md:flex-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'profile' 
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <User size={15} />
                Perfil Estudiantil
              </button>
              
              <button
                onClick={() => setActiveTab('academic')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'academic' 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <GraduationCap size={15} />
                Nivel Académico
              </button>

              <button
                onClick={() => setActiveTab('sanity')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === 'sanity' 
                    ? 'bg-[#98ca3f]/10 text-[#98ca3f] border border-[#98ca3f]/20 shadow-inner' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <Cloud size={15} />
                CMS Sanity Studio
              </button>
            </div>

            {/* Purely polished visual user indicator at the bottom */}
            <div className="hidden md:flex p-4 border-t border-white/5 items-center gap-3">
              <img 
                src={user?.imageUrl || `https://ui-avatars.com/api/?name=${user?.fullName || 'Estudiante'}&background=1e1b4b&color=fff`} 
                alt="Avatar" 
                className="w-7 h-7 rounded-full ring-2 ring-white/10"
              />
              <div className="overflow-hidden">
                <p className="text-xs text-white font-medium truncate">{user?.fullName || 'Estudiante'}</p>
                <p className="text-[9px] text-zinc-500 truncate">{user?.primaryEmailAddress?.emailAddress || 'Invitado'}</p>
              </div>
            </div>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#090b14] to-[#0c0e1a] relative p-6 md:p-8 scrollbar-thin">
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>

            <AnimatePresence mode="wait">
              {/* TAB 1: PROFILE / MEMBERSHIP */}
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-6"
                >
                  <header>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="text-blue-400" size={20} />
                      Tu Identidad Académica
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">Información de tu perfil y suscripciones verificadas en EduNova Campus.</p>
                  </header>

                  <div className="bg-gradient-to-br from-blue-950/30 to-indigo-950/20 border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-blue-400 font-bold block mb-1">Plan de Suscripción</span>
                        <h3 className="text-lg text-white font-bold flex items-center gap-2">
                          {userPlan?.name || 'Suscripción Gratuita'}
                          {userPlan?.id !== 'free_user' && (
                            <span className="px-2 py-0.5 bg-[#98ca3f] text-black text-[9px] font-black tracking-wider rounded-md">Pro</span>
                          )}
                        </h3>
                        <p className="text-xs text-zinc-300 mt-2 max-w-sm">
                          Accede libremente a materias premium recomendadas y mantén una conversación fluida con el Tutor Socrático personalizado.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          onClose();
                          setCurrentView('PRICING');
                        }}
                        className="shrink-0 px-4 py-2 bg-white hover:bg-zinc-100 text-[#090b14] font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                      >
                        Mejorar Plan
                      </button>
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">Nombre Completo</span>
                      <p className="text-xs text-white font-bold">{user?.fullName || 'Invitado del Campus'}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">Correo Electrónico</span>
                      <p className="text-xs text-zinc-300 truncate">{user?.primaryEmailAddress?.emailAddress || 'Sin correo asociado'}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: ACADEMIC EXIGENCY LEVEL */}
              {activeTab === 'academic' && (
                <motion.div
                  key="academic"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-6"
                >
                  <header>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <GraduationCap className="text-amber-400" size={20} />
                      Definir Nivel Formativo
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">Elige la dificultad metodológica de base que usará el Tutor Socrático para evaluarte y dialogar.</p>
                  </header>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleSaveDifficulty('Beginner')}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between ${
                        defaultDifficulty === 'Beginner' 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                          : 'bg-white/5 border-transparent text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <strong className="text-xs block font-bold mb-0.5">🟢 Nivel Inicial (Principiante Extra)</strong>
                        <p className="text-[11px] text-zinc-400 max-w-md">Interacciones más directas, explicaciones minuciosas y preguntas guiadas paso a paso.</p>
                      </div>
                      {defaultDifficulty === 'Beginner' && <Check size={16} className="text-emerald-400" />}
                    </button>

                    <button
                      onClick={() => handleSaveDifficulty('Intermediate')}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between ${
                        defaultDifficulty === 'Intermediate' 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                          : 'bg-white/5 border-transparent text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <strong className="text-xs block font-bold mb-0.5">🟡 Nivel Estándar (Deductivo Intermedio)</strong>
                        <p className="text-[11px] text-zinc-400 max-w-md">Ritmo educativo óptimo. El tutor fomentará el análisis crítico sin dar las respuestas de inmediato.</p>
                      </div>
                      {defaultDifficulty === 'Intermediate' && <Check size={16} className="text-amber-400" />}
                    </button>

                    <button
                      onClick={() => handleSaveDifficulty('Advanced')}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between ${
                        defaultDifficulty === 'Advanced' 
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' 
                          : 'bg-white/5 border-transparent text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <strong className="text-xs block font-bold mb-0.5">🔴 Nivel Superior (Inferencia Avanzada)</strong>
                        <p className="text-[11px] text-zinc-400 max-w-md">Desafíos de lógica de alto nivel, preguntas socráticas complejas y análisis de casos abstractos.</p>
                      </div>
                      {defaultDifficulty === 'Advanced' && <Check size={16} className="text-rose-400" />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {savedSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0 }}
                        className="text-right text-[11px] font-semibold text-[#98ca3f] flex items-center justify-end gap-1"
                      >
                        <Sparkles size={12} /> Exigencia calibrada exitosamente
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* TAB 3: SANITY CMS STUDIO CONTROLS */}
              {activeTab === 'sanity' && (
                <motion.div
                  key="sanity"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-6"
                >
                  <header>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Cloud className="text-[#98ca3f]" size={20} />
                      Administración de Contenido Headless CMS
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">Integra Sanity Studio de manera local para agregar cursos, lecciones, cambiar iconografías y subir vídeos.</p>
                  </header>

                  <div className="bg-[#98ca3f]/10 border border-[#98ca3f]/20 rounded-2xl p-5 relative overflow-hidden">
                    <Cloud className="absolute -bottom-6 -right-6 w-32 h-32 text-[#98ca3f]/10 blur-xl font-black" />
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-[#98ca3f] font-bold block mb-1">Campus Manager Studio</span>
                        <h3 className="text-base text-white font-bold">
                          Gestión Centralizada Sanity.io
                        </h3>
                        <p className="text-xs text-zinc-300 mt-2 max-w-sm">
                          Hemos integrado Sanity Studio directamente en el Campus SPA. Te recomendamos presionar el botón inferior para abrir el Studio en pantalla completa y habilitar la autenticación de Sanity cómoda de manera nativa.
                        </p>
                      </div>

                      <a
                        href="/studio"
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 px-4 py-2 bg-[#98ca3f] hover:bg-[#85b233] text-[#090b14] font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-[#98ca3f]/10 cursor-pointer"
                      >
                        <ExternalLink size={14} /> Abrir Panel
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <BookOpen size={14} className="text-[#98ca3f]" />
                        <strong className="text-zinc-200">Materias & Cursos</strong>
                      </div>
                      <p className="text-zinc-400 leading-normal text-[11px]">Cambia los nombres, descripciones de materias y reordena dinámicamente las lecciones de tus trayectos.</p>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles size={14} className="text-[#98ca3f]" />
                        <strong className="text-zinc-200">Personalización Lucide</strong>
                      </div>
                      <p className="text-zinc-400 leading-normal text-[11px]">Digita el nombre de cualquier icono de Lucide en PascalCase para que se actualice al instante en la interfaz del alumno.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
