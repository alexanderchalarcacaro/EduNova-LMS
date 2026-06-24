import { Studio } from 'sanity';
import { sanityConfig } from '../sanity.config';
import React from 'react';

export default function SanityStudio() {
  return (
    <div className="h-screen w-full">
      <Studio config={sanityConfig} />
    </div>
  );
}
