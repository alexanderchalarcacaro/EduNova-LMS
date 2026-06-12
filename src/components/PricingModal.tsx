import { PricingTable } from '@clerk/clerk-react';

export const PricingModal = () => {
  return (
    <div className="space-y-10 py-10 w-full">
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-5xl font-display font-bold text-slate-900">
          Elige tu camino al dominio
        </h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          Selecciona el plan que mejor se adapte a tus objetivos de aprendizaje. 
          Puedes cambiarlo en cualquier momento desde tu panel de usuario.
        </p>
      </div>

      <div className="w-full mx-auto bg-white rounded-3xl p-4 md:p-8 shadow-sm border border-slate-100 flex items-center justify-center min-h-[500px]">
        <PricingTable />
      </div>
    </div>
  );
};
