import React from 'react';
import { AnalysisComponentProps } from './AnalysisRegistry';

export default function UnknownAnalysis({ intent }: AnalysisComponentProps) {
  return (
    <div className="glass-panel p-8 rounded-2xl border border-error/50 bg-error/10 text-center">
      <span className="material-symbols-outlined text-4xl text-error mb-4">error</span>
      <h3 className="font-headline-md text-xl text-white font-bold mb-2">Unknown Analysis</h3>
      <p className="text-on-surface-variant">We couldn't map this request to a known visual layout.</p>
      <pre className="text-left bg-background/50 p-4 rounded mt-4 text-sm text-outline-variant overflow-x-auto">
        {JSON.stringify(intent, null, 2)}
      </pre>
    </div>
  );
}
