import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Flame, Award, Zap, ShieldCheck, Database, CreditCard } from 'lucide-react';
import { Plan } from '../types';

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Estudiante Básico',
    price: 'Gratis',
    color: 'border-zinc-800 text-zinc-300 bg-zinc-900/40',
    features: [
      'Acceso a todos los temas socráticos',
      'Tutoría de IA estándar',
      'Hasta 15 consultas por día',
      'Sincronización local de historial'
    ]
  },
  {
    id: 'scholastic',
    name: 'Académico Activo',
    price: '$9.99 / mes',
    color: 'border-platzi-green/40 text-emerald-100 bg-platzi-dark/30 shadow-lg shadow-platzi-green/5 pulsy',
    features: [
      'Todo lo de Básico',
      'Consultas ilimitadas de tutoría',
      'Tiempos de respuesta de IA prioritarios',
      'Retroalimentación socrática detallada',
      'Soporte premium'
    ]
  },
  {
    id: 'ultra',
    name: 'Sabio Ultra (AI Guru)',
    price: '$19.99 / mes',
    color: 'border-platzi-blue/40 text-blue-100 bg-platzi-darkest/40 shadow-lg shadow-platzi-blue/5 pulsy',
    features: [
      'Todo lo de Académico Activo',
      'Modos socráticos personalizados (Sarcástico, Sabio, Alentador)',
      'Exportación completa de chats en PDF',
      'Generación personalizada de itinerarios de estudio',
      'Acceso exclusivo a temas avanzados de investigación'
    ]
  }
];

interface PricingModalProps {
  currentPlan?: string;
  onUpgrade?: (planId: string) => void;
}

export default function PricingModal({ currentPlan = 'free', onUpgrade }: PricingModalProps) {
  const [dynamicPlans, setDynamicPlans] = useState<Plan[]>(PLANS);
  const [sourceInfo, setSourceInfo] = useState<string>("Sincronización de Clerk");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchClerkSaaSPlans = async () => {
      try {
        const res = await fetch('/api/clerk-billing/plans');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.plans) {
            setDynamicPlans(data.plans);
            setSourceInfo(data.source || "Clerk SaaS Registry");
          }
        }
      } catch (error) {
        console.error("Failed to load dynamic Clerk SaaS plans:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClerkSaaSPlans();
  }, []);

  const handleSelectPlan = (planId: string) => {
    if (onUpgrade) {
      onUpgrade(planId);
    } else {
      alert(`¡Gracias por elegir la suscripción! EduNova procesará este pago a través del Checkout de Clerk Billing.`);
    }
  };

  return (
    <div className="space-y-8 py-4">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-[10px] font-mono tracking-widest uppercase px-3 py-1 rounded-full">
          <ShieldCheck size={11} className="text-indigo-400" />
          Clerk Billing Subscription SaaS Active
        </div>
        <h2 className="text-3xl font-sans font-bold tracking-tight text-white sm:text-4xl">
          Potencia tu aprendizaje activo
        </h2>
        <p className="text-sm font-sans text-zinc-400 max-w-xl mx-auto">
          Gestionado directamente con suscripciones seguras de <span className="font-bold text-white">Clerk Billing SaaS</span> con Stripe. Sincronización automática de tus privilegios y estados de estudio.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
          <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-indigo-500 animate-spin" />
          <span className="text-xs text-zinc-400 font-mono">Cargando planes de Clerk Subscription SaaS...</span>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-8">
          {dynamicPlans.map((plan, index) => {
            const isActive = currentPlan === plan.id;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`flex flex-col border rounded-3xl p-6 relative backdrop-blur-md transition-all duration-300 hover:border-zinc-500 shadow-sm hover:shadow-[0_12px_40px_rgba(99,102,241,0.04)] ${plan.color}`}
              >
                {plan.source === "Clerk Billing API" && (
                  <span className="absolute -top-3.5 left-6 bg-platzi-blue/90 border border-blue-400 text-white text-[8px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                    <Database size={8} /> LIVE SAAS
                  </span>
                )}
                
                {plan.id === 'scholastic' && (
                  <span className="absolute -top-3.5 right-6 bg-gradient-to-r from-platzi-green to-emerald-500 border border-emerald-400 text-[#0c1424] text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-platzi-green/20 animate-pulse">
                    <Flame size={10} /> Recomendado
                  </span>
                )}
                {plan.id === 'ultra' && (
                  <span className="absolute -top-3.5 right-6 bg-gradient-to-r from-platzi-blue to-indigo-600 border border-blue-400 text-white text-[9px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-blue-500/20">
                    <Award size={10} /> Máximo Poder
                  </span>
                )}

                <div className="mb-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-sans font-extrabold text-white capitalize tracking-tight">{plan.name}</h3>
                    <div className="text-[10px] text-indigo-400 font-mono tracking-tighter uppercase flex items-center gap-1 opacity-70">
                      <CreditCard size={10} /> Clerk SaaS
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-mono font-black text-white">{plan.price}</span>
                  </div>
                </div>

                <ul className="space-y-3.5 flex-1 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                      <Check size={14} className="text-platzi-green shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isActive}
                  className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md ${
                    isActive
                      ? 'bg-zinc-800/80 text-zinc-500 cursor-default shadow-none border border-zinc-800'
                      : plan.id === 'free'
                      ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:scale-[1.01] active:scale-[0.99]'
                      : plan.id === 'scholastic'
                      ? 'bg-platzi-green text-[#0c1424] hover:bg-emerald-400 hover:scale-[1.01] active:scale-[0.99] hover:shadow-platzi-green/20'
                      : 'bg-platzi-blue text-white hover:bg-blue-600 hover:scale-[1.01] active:scale-[0.99] hover:shadow-blue-500/20'
                  }`}
                >
                  {isActive ? 'Plan Activo' : 'Elegir Plan'}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="text-center text-[10px] text-zinc-500 font-mono">
        Sincronizado vía: <span className="text-zinc-400">{sourceInfo}</span> • Checkout encriptado SSL por Stripe & Clerk Inc.
      </div>
    </div>
  );
}
