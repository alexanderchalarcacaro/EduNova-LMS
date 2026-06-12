import { Sparkles, BookOpen, Brain, Target } from 'lucide-react';
import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { PricingModal } from './PricingModal';
import { Plan } from '../types';
import { EdunovaLogo } from './EdunovaLogo';

interface LandingPageProps {
  onPlanSelect?: (plan: Plan) => void;
}

export const LandingPage = ({ onPlanSelect }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EdunovaLogo size={36} showText={true} textColorClass="text-slate-900 text-2xl font-display font-bold" />
          </div>
          <div className="flex items-center gap-4">
            <a href="#about" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden md:block">Nuestra Misión</a>
            <a href="#pricing" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden md:block">Planes</a>
            <SignInButton mode="modal">
              <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:scale-105 transition-transform shadow-md">
                Iniciar Sesión
              </button>
            </SignInButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 text-[10px] uppercase font-bold tracking-widest rounded-full">
          <Sparkles size={12} /> La Educación del Futuro
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-bold text-slate-900 tracking-tight max-w-4xl mx-auto">
          Descubre tu potencial con <br className="hidden md:block" /> IA Socrática
        </h1>
        <p className="text-slate-500 text-xl max-w-2xl mx-auto">
          EduNova transforma la forma en que aprendes. No te damos las respuestas, te guiamos 
          para que tú mismo descubras el conocimiento profundo y duradero.
        </p>
        <div className="pt-4">
            <SignUpButton mode="modal">
              <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-slate-900/20">
                Comenzar ahora gratis
              </button>
            </SignUpButton>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900">¿Por qué EduNova?</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Desarrollado por educadores e ingenieros, nuestra plataforma utiliza IA avanzada para simular a los mejores tutores del mundo.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-slate-50 space-y-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                <Brain size={24} />
              </div>
              <h3 className="text-xl font-bold">Aprendizaje Activo</h3>
              <p className="text-slate-500 text-sm">El método socrático fomenta el pensamiento crítico en lugar de la memorización pasiva.</p>
            </div>
            <div className="p-6 rounded-3xl bg-slate-50 space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-bold">Itinerarios a Medida</h3>
              <p className="text-slate-500 text-sm">Creamos tu plan de estudios basándonos en tus fortalezas y debilidades identificadas por la IA.</p>
            </div>
            <div className="p-6 rounded-3xl bg-slate-50 space-y-4">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                <BookOpen size={24} />
              </div>
              <h3 className="text-xl font-bold">Respaldo Persistente</h3>
              <p className="text-slate-500 text-sm">Todo tu progreso se guarda en la nube para que retomes tus estudios desde cualquier dispositivo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 max-w-5xl mx-auto px-6">
        <PricingModal />
      </section>

      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-200">
        <p>&copy; 2026 EduNova Inc. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};
