import React from 'react';
import { useUser, useClerk, PricingTable } from '@clerk/clerk-react';

export const PricingModal: React.FC = () => {
  const { isSignedIn } = useUser();
  const clerk = useClerk();

  return (
    <div className="w-full max-w-5xl mx-auto flex justify-center">
      <div 
        className="w-full flex justify-center"
        onClickCapture={(e) => {
          if (!isSignedIn) {
            e.preventDefault();
            e.stopPropagation();
            clerk.openSignIn();
          }
        }}
      >
        <PricingTable 
          for="user"
          newSubscriptionRedirectUrl={typeof window !== 'undefined' ? window.location.origin : undefined}
          ctaPosition="bottom"
        />
      </div>
    </div>
  );
};

