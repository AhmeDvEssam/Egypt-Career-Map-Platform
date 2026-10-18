import React from 'react';
import { AnalysisComponentProps, resolveAnalysisComponent } from './AnalysisRegistry';

// This is the main container that will receive an intent and render the appropriate UI
export default function AnalysisRenderer({ intent, dispatchIntent }: AnalysisComponentProps) {
  // Resolve the mapped component from the registry
  const Component = resolveAnalysisComponent(intent.intentId);

  return (
    <div className="w-full flex flex-col gap-6 animate-in slide-in-from-bottom-4 fade-in duration-700 ease-out">
      <Component intent={intent} dispatchIntent={dispatchIntent} />
    </div>
  );
}
