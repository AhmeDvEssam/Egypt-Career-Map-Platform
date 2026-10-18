export type IntentData = {
  intentId: string;
  parameters: Record<string, any>;
  data?: any;
};

export type AnalysisComponentProps = {
  intent: IntentData;
  dispatchIntent?: (intent: IntentData) => void;
};

import JobCountAnalysis from './JobCountAnalysis';
import TopSkillsAnalysis from './TopSkillsAnalysis';
import UnknownAnalysis from './UnknownAnalysis';

// The centralized map of intent IDs to React Components
export const AnalysisRegistry: Record<string, React.FC<AnalysisComponentProps>> = {
  'job_count': JobCountAnalysis,
  'top_skills': TopSkillsAnalysis,
};

// A helper function to safely resolve a component
export function resolveAnalysisComponent(intentId: string): React.FC<AnalysisComponentProps> {
  return AnalysisRegistry[intentId] || UnknownAnalysis;
}
