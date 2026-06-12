import React, { useState, useEffect } from 'react';
import { useUser, useClerk, PricingTable } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  CreditCard, 
  ExternalLink, 
  ShieldCheck, 
  RefreshCw, 
  HelpCircle,
  Award,
  FlaskConical,
  Check
} from 'lucide-react';

// Stable internal component to avoid Stripe Elements re-initialization warnings
const StablePricingTable = React.memo(() => {
  return (
    <PricingTable 
      for="user"
      newSubscriptionRedirectUrl={typeof window !== 'undefined' ? window.location.origin : undefined}
      ctaPosition="bottom"
    />
  );
});

export const PricingModal: React.FC = () => {
  const { user, isSignedIn } = useUser();
  const clerk = useClerk();
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [clerkMode, setClerkMode] = useState<'test' | 'production'>('test');
  const [fetchingPlans, setFetchingPlans] = useState<boolean>(false);
  const [upgradingSandbox, setUpgradingSandbox] = useState<string | null>(null);

  // Read current active plan ID if logged in
  const activePlanId = isSignedIn ? ((user?.unsafeMetadata?.plan as string) || 'free_user') : null;

  // Retrieve billing mode information from server
  useEffect(() => {
    async function checkBillingMode() {
      setFetchingPlans(true);
      try {
        const res = await fetch('/api/clerk-plans');
        if (res.ok) {
          const body = await res.json();
          if (body.mode) {
            setClerkMode(body.mode);
          }
        }
      } catch (err) {
        console.error("Error loaded billing mode:", err);
      } finally {
        setFetchingPlans(false);
      }
    }
    checkBillingMode();
  }, []);

  const handleOpenBillingPortal = () => {
    try {
      clerk.openUserProfile();
    } catch (err) {
      console.error('Error opening Clerk billing portal:', err);
    }
  };

  const handleActivateTestPlan = async (planId: string) => {
    if (!isSignedIn || !user) return;
    setUpgradingSandbox(planId);
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          plan: planId
        }
      });
      setSuccessMsg(`¡Plan activado con éxito! Tu cuenta ha sido configurada temporalmente con el nivel "${planId === 'pro' ? 'Pro Socrático' : 'Ultra Educador'}" en el Sandbox local.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error simulating plan upgrade:', err);
      alert('Error al simular la actualización del plan: ' + err.message);
    } finally {
      setUpgradingSandbox(null);
    }
  };

  const getPlanDisplayName = (planId: string | null) => {
    if (!planId || planId === 'free_user') return 'Plan Gratuito';
    if (planId === 'ultra') return 'Educador Èlite Ultra';
    if (planId === 'pro') return 'Pro Socrático AI';
    return planId.charAt(0).toUpperCase() + planId.slice(1);
  };

  return (
    <div id="pricing-modal-container" className="space-y-12 py-8 w-full max-w-5xl mx-auto px-6 font-sans text-zinc-100 animate-in fade-in duration-700">
      
      {/* Absolute Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[120px] -z-10 rounded-full" />

      {/* Modern Minimalist Header */}
      <header className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em]">
            <Sparkles size={12} className="text-blue-500" />
            Acceso Premium Limitado
          </div>
        </div>
        <h2 className="text-4xl md:text-5xl font-display font-medium text-white tracking-tight">
          Elige tu camino hacia la maestría
        </h2>
        <p className="text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Libera todo el potencial de la tutoría socrática impulsada por IA. Desde sesiones ilimitadas hasta análisis profundo de materias avanzadas.
        </p>
      </header>

      {/* Dynamic Success Notification */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-center"
          >
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-medium shadow-lg backdrop-blur-sm">
              <Check size={16} />
              {successMsg}
              <button onClick={() => setSuccessMsg(null)} className="ml-2 hover:text-white transition-colors">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Grid: Sidebar Info + Global Pricing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Sidebar Status (4 columns on LG) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Active Status Card */}
          {isSignedIn && (
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 shadow-2xl backdrop-blur-xl space-y-6 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl -z-10 group-hover:bg-blue-600/10 transition-all duration-700" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Suscripción actual</span>
                  <div className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-display font-medium text-white">
                    {getPlanDisplayName(activePlanId)}
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-1">Sincronizado vía Clerk Billing</p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <button
                  onClick={handleOpenBillingPortal}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <CreditCard size={14} className="text-blue-500" />
                    Facturación
                  </span>
                  <ExternalLink size={12} className="text-zinc-600" />
                </button>
              </div>

              <div className="text-[10px] text-zinc-500 leading-relaxed px-1">
                Gestiona tus métodos de pago, descarga facturas y ajusta tu plan desde tu portal de seguridad corporativa.
              </div>
            </div>
          )}

          {/* Connection Status & Security */}
          <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 space-y-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-xl text-zinc-500">
                <ShieldCheck size={18} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-zinc-200">Pago 100% Seguro</p>
                <p className="text-[10px] text-zinc-500">Encriptación SSL de 256 bits via Stripe</p>
              </div>
            </div>
          </div>

          {/* FAQ Minimalist links */}
          <div className="px-4 space-y-4">
            <h5 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest pl-2">Información útil</h5>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-[11px] text-zinc-400 group cursor-help">
                <HelpCircle size={14} className="mt-0.5 group-hover:text-blue-500 transition-colors" />
                <span>¿Cómo cancelar? En tu portal de facturación con un solo clic.</span>
              </li>
              <li className="flex items-start gap-2 text-[11px] text-zinc-400 group cursor-help">
                <HelpCircle size={14} className="mt-0.5 group-hover:text-blue-500 transition-colors" />
                <span>¿Hay reembolsos? Consulta nuestras políticas de satisfacción Clerk.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Pricing Table (8 columns on LG) */}
        <div className="lg:col-span-8 flex flex-col space-y-8">
          
          {clerkMode === 'test' && (
            <div className="p-6 rounded-3xl bg-amber-500/[0.02] border border-amber-500/10 space-y-5 animate-in slide-in-from-top-4 duration-500 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <FlaskConical size={18} className="text-amber-500 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-amber-500">Modo Sandbox Activo</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Ideal para probar la experiencia de suscripción sin cargos reales. Usa los simuladores rápidos:
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleActivateTestPlan('pro')}
                  disabled={upgradingSandbox !== null}
                  className="px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-bold uppercase rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {upgradingSandbox === 'pro' ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} className="text-amber-500" />}
                  Simular Pro
                </button>
                <button
                  onClick={() => handleActivateTestPlan('ultra')}
                  disabled={upgradingSandbox !== null}
                  className="px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-bold uppercase rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {upgradingSandbox === 'ultra' ? <RefreshCw size={12} className="animate-spin" /> : <Award size={12} className="text-amber-500" />}
                  Simular Ultra
                </button>
                <button
                  onClick={() => handleActivateTestPlan('free_user')}
                  disabled={upgradingSandbox !== null}
                  className="px-3 py-2 text-zinc-500 hover:text-zinc-300 text-[10px] transition-all"
                >
                  Resetear
                </button>
              </div>
            </div>
          )}

          {/* The Clerk Table */}
          <div className="bg-white/[0.01] border border-white/5 rounded-[40px] p-2 md:p-8 shadow-2xl backdrop-blur-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
            <StablePricingTable />
          </div>

          <footer className="text-center">
            <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-[.25em]">
              Potenciado por infraestructura de seguridad Stripe + Clerk Enterprise
            </p>
          </footer>
        </div>

      </div>

    </div>
  );
};
