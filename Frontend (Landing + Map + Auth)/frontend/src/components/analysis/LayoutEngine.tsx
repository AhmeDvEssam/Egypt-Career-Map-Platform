import React from 'react';
import { AnalysisComponentProps, resolveAnalysisComponent } from './AnalysisRegistry';
import { BarChart, DonutChart } from './Charts';
import CityOverviewLayout from './CityOverviewLayout';

function GeographicLayout({ children, intent }: { children: React.ReactNode; intent?: any }) {
  return (
    <div className="w-full min-h-[70vh] p-8 bg-blue-900/10 border border-blue-500/20 rounded-2xl flex flex-col items-center">
      <h2 className="text-2xl text-blue-300 mb-8 flex items-center gap-2 self-start">
        <span className="material-symbols-outlined text-3xl">map</span> Geographic Insights
      </h2>
      <div className="flex-grow w-full flex flex-col justify-center">{children}</div>
    </div>
  );
}

function RoleDeepDiveLayout({ children, intent }: { children: React.ReactNode; intent?: any }) {
  const data = intent?.data;
  const role = intent?.parameters?.role;

  return (
    <div className="w-full min-h-[70vh] p-8 bg-purple-900/10 border border-purple-500/20 rounded-2xl flex flex-col items-center">
      <h2 className="text-2xl text-purple-300 mb-8 flex items-center gap-2 self-start">
        <span className="material-symbols-outlined text-3xl">work</span> Role Analysis{role ? `: ${role}` : ''}
      </h2>
      
      {data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full flex-grow">
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 flex flex-col justify-center items-center">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Total Vacancies</h3>
            <p className="text-5xl font-bold text-white">{data.count ?? 0}</p>
          </div>
          
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 flex flex-col justify-center items-center">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Average Salary</h3>
            <p className="text-4xl font-bold text-green-400">
              {data.avgSalaryMin || data.avgSalaryMax ? (
                <>
                  {data.avgSalaryMin ? `${data.avgSalaryMin.toLocaleString()}` : ''} 
                  {data.avgSalaryMin && data.avgSalaryMax ? ' - ' : ''}
                  {data.avgSalaryMax ? `${data.avgSalaryMax.toLocaleString()}` : ''}
                </>
              ) : (
                'N/A'
              )}
            </p>
          </div>

          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-4">Top Skills</h3>
            <BarChart data={data.top_skills || []} />
          </div>

          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-4">Work Models</h3>
            <DonutChart data={data.work_models || []} />
          </div>
        </div>
      ) : (
        <div className="flex-grow w-full flex flex-col justify-center">{children}</div>
      )}
    </div>
  );
}

function DefaultLayout({ children, intent }: { children: React.ReactNode; intent?: any }) {
  return <div className="w-full min-h-[70vh] flex flex-col justify-center gap-6">{children}</div>;
}

export default function LayoutEngine({ intent, dispatchIntent }: AnalysisComponentProps) {
  if (!intent) return null;
  const Component = resolveAnalysisComponent(intent.intentId);
  const { city, role } = intent.parameters || {};

  let Wrapper = DefaultLayout;
  if (city && !role) Wrapper = CityOverviewLayout;
  else if (role) Wrapper = RoleDeepDiveLayout;

  return (
    <Wrapper intent={intent}>
      <div className="animate-in slide-in-from-bottom-4 fade-in duration-700 ease-out w-full flex flex-col gap-6 relative z-10 pointer-events-auto">
        <Component intent={intent} dispatchIntent={dispatchIntent} />
      </div>
    </Wrapper>
  );
}
