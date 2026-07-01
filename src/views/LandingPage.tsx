import React from 'react';
import { Sparkles, BookOpen, Brain, Target, ArrowRight } from 'lucide-react';
import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import PricingModal from '../components/PricingModal';
import { EdunovaLogo } from '../components/EdunovaLogo';
import { AntigravityObjects } from '../components/AntigravityObjects';

interface LandingPageProps {
  guestMode?: boolean;
  onMockLogin?: (user: any) => void;
  clerkUser?: any;
  clerkOpenSignIn?: () => void;
  onUpgrade?: (planId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  guestMode = false, 
  onMockLogin,
  clerkUser = null,
  clerkOpenSignIn,
  onUpgrade
}) => {
  const triggerMockSession = () => {
    if (onMockLogin) {
      onMockLogin({
        id: 'mock_std_88',
        fullName: 'Estudiante Demo EduNova',
        username: 'estudiante_demo',
        primaryEmailAddress: { emailAddress: 'estudiante@edunova.com' },
        imageUrl: ''
      });
    }
  };
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111827] relative flex flex-col justify-between overflow-x-hidden font-sans">
      {/* 1. Immersive Google Antigravity-style Interactive Parallax objects */}
      <AntigravityObjects />

      {/* Header */}
      <header className="h-20 bg-white/70 backdrop-blur-md border-b border-[#D1D5DB] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 relative z-10">
            <EdunovaLogo size={36} showText={true} textColorClass="text-[#1A2B5E] text-2xl font-display font-bold" />
          </div>
          <div className="flex items-center gap-5 relative z-10">
            <a 
              href="#about" 
              className="text-xs font-bold uppercase tracking-wider text-[#6B7280] hover:text-[#2563EB] transition-colors hidden md:block"
            >
              Nuestra Filosofía
            </a>
            <a 
              href="#pricing" 
              className="text-xs font-bold uppercase tracking-wider text-[#6B7280] hover:text-[#2563EB] transition-colors hidden md:block"
            >
              Planes de Estudio
            </a>
            {guestMode ? (
              <button 
                onClick={triggerMockSession}
                className="bg-[#1A2B5E] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.98]"
              >
                Acceso Demo Rápido
              </button>
            ) : (
              <SignInButton mode="modal" fallbackRedirectUrl="/">
                <button className="bg-[#1A2B5E] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.98]">
                  Iniciar Sesión
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center space-y-8 relative z-10 flex-grow">
        {/* Slogan pill matching brand manual: "Aprendizaje inteligente, futuro sin límites." */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#F3F4F6] border border-[#D1D5DB] text-[#2563EB] text-[10px] uppercase font-mono font-bold tracking-widest rounded-full shadow-sm">
          <Sparkles size={11} className="text-[#10B981] animate-pulse" /> 
          Aprendizaje inteligente, futuro sin límites.
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-[#1A2B5E] tracking-tight max-w-4xl mx-auto leading-tight">
          La revolución educativa de <br />
          <span className="bg-gradient-to-r from-[#2563EB] to-[#10B981] bg-clip-text text-transparent">
            EduNova Socrática
          </span>
        </h1>

        <p className="text-[#6B7280] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-sans">
          No te proporcionamos respuestas directas. Te guiamos mediante el cuestionamiento crítico 
          para que tú mismo descubras el conocimiento estructurado de forma duradera y autónoma.
        </p>

        <div className="pt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
          {guestMode ? (
            <button 
              onClick={triggerMockSession}
              className="bg-gradient-to-tr from-[#2563EB] to-[#10B981] text-white px-9 py-4.5 rounded-full font-bold text-sm uppercase tracking-wider hover:shadow-xl hover:shadow-emerald-500/10 hover:translate-y-[-1px] transition-all active:scale-95 border border-emerald-300/20"
            >
              Comenzar Itinerario Gratis (Demo)
            </button>
          ) : (
            <SignUpButton mode="modal" fallbackRedirectUrl="/">
              <button className="bg-gradient-to-tr from-[#2563EB] to-[#10B981] text-white px-9 py-4.5 rounded-full font-bold text-sm uppercase tracking-wider hover:shadow-xl hover:shadow-emerald-500/10 hover:translate-y-[-1px] transition-all active:scale-95 border border-emerald-300/20">
                Comenzar Itinerario Gratis
              </button>
            </SignUpButton>
          )}
          
          <a
            href="#about"
            className="px-6 py-4.5 text-xs text-[#1A2B5E] hover:text-[#2563EB] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors group"
          >
            Saber Más del Método
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>

      {/* About / Philosophy Section following brand layout specs */}
      <section id="about" className="py-24 bg-[#F3F4F6] border-y border-[#D1D5DB] relative z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-[#1A2B5E] tracking-tight">
              Filosofía &amp; Personalidad EduNova
            </h2>
            <div className="w-16 h-1 bg-gradient-to-r from-[#2563EB] to-[#10B981] mx-auto rounded-full" />
            <p className="text-[#6B7280] max-w-xl mx-auto text-sm leading-relaxed">
              EduNova es una marca moderna, cercana y visionaria. Es inteligente sin ser distante, e innovadora sin resultar fría. 
              Nuestros pilares transforman tu potencial cognitivo.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Box 1 */}
            <div className="p-8 rounded-3xl bg-white border border-[#D1D5DB]/30 shadow-sm space-y-4 hover:translate-y-[-2px] transition-transform">
              <div className="w-12 h-12 bg-[#2563EB]/10 text-[#2563EB] rounded-2xl flex items-center justify-center font-bold">
                <Brain size={22} />
              </div>
              <h3 className="text-lg font-bold text-[#1A2B5E] uppercase tracking-wide">Aprendizaje Socrático</h3>
              <p className="text-[#6B7280] text-xs leading-relaxed font-sans">
                Estimula el razonamiento puro. La IA te hace preguntas guiadas adaptadas a tus fallas para robustecer tu pensamiento crítico en lugar de forzar memorización pasiva.
              </p>
            </div>

            {/* Box 2 */}
            <div className="p-8 rounded-3xl bg-white border border-[#D1D5DB]/30 shadow-sm space-y-4 hover:translate-y-[-2px] transition-transform">
              <div className="w-12 h-12 bg-[#10B981]/10 text-[#10B981] rounded-2xl flex items-center justify-center font-bold">
                <Target size={22} />
              </div>
              <h3 className="text-lg font-bold text-[#1A2B5E] uppercase tracking-wide">Itinerarios Personalizados</h3>
              <p className="text-[#6B7280] text-xs leading-relaxed font-sans">
                Trazamos rutas de aprendizaje basadas en fortalezas reales. Elige tus temas y avanza a tu propio paso con el respaldo autónomo de la tutoría adaptativa.
              </p>
            </div>

            {/* Box 3 */}
            <div className="p-8 rounded-3xl bg-white border border-[#D1D5DB]/30 shadow-sm space-y-4 hover:translate-y-[-2px] transition-transform">
              <div className="w-12 h-12 bg-indigo-50 text-[#1A2B5E] rounded-2xl flex items-center justify-center font-bold">
                <BookOpen size={22} />
              </div>
              <h3 className="text-lg font-bold text-[#1A2B5E] uppercase tracking-wide">Viabilidad Sostenible</h3>
              <p className="text-[#6B7280] text-xs leading-relaxed font-sans">
                Gracias a nuestro Caché Semántico Vectorial en la nube, garantizamos que las dudas factuales y teóricas se resuelvan en milisegundos con costo cero de créditos de IA.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section with clean spacing */}
      <section id="pricing" className="py-24 max-w-5xl mx-auto px-6 relative z-10 w-full">
        <div className="text-center mb-12 space-y-4">
          <span className="text-[#6B7280] text-[10px] uppercase font-bold tracking-widest block font-mono">Elige tu Nivel de Acceso</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-[#1A2B5E] tracking-tight">Acceso Flexible a tu Tutoría</h2>
          <div className="w-12 h-0.5 bg-zinc-300 mx-auto" />
        </div>
        <div className="w-full">
          <PricingModal 
            currentPlan="free" 
            onUpgrade={onUpgrade} 
            clerkUser={clerkUser}
            clerkOpenSignIn={clerkOpenSignIn}
            guestMode={guestMode}
            onMockLogin={onMockLogin}
          />
        </div>
      </section>

      {/* Footer conforming to Arial regular, color Gris Neutro #6B7280 */}
      <footer className="py-10 bg-white border-t border-[#D1D5DB] relative z-10 text-center space-y-2">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#6B7280] text-[11px] uppercase tracking-wider font-semibold">
            &copy; {new Date().getFullYear()} EduNova. Todos los derechos reservados.
          </p>
          <div className="text-[#6B7280] text-[10px] uppercase tracking-wider font-mono font-medium flex gap-4">
            <span className="text-zinc-400">INNOVACIÓN &bull; TRANSFORMACIÓN EDUCATIVA &bull; TECNOLOGÍA</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
