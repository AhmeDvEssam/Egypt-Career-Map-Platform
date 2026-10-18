import React from 'react';

export function BarChart({ data }: { data: { name: string; count: number; pct?: number }[] }) {
  if (!data || data.length === 0) return <div className="text-gray-500 italic">No data available.</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="w-full flex flex-col gap-3">
      {data.map((item, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex justify-between text-sm text-gray-300">
            <span>{item.name}</span>
            <span className="font-mono text-gray-400">{item.count}</span>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ data }: { data: { name: string; count: number }[] }) {
  if (!data || data.length === 0) return <div className="text-gray-500 italic">No data available.</div>;
  const total = data.reduce((acc, d) => acc + d.count, 0) || 1;
  let currentAngle = 0;

  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32 rounded-full" style={{
        background: `conic-gradient(${data.map((d, i) => {
          const angle = (d.count / total) * 360;
          const start = currentAngle;
          currentAngle += angle;
          return `${colors[i % colors.length]} ${start}deg ${currentAngle}deg`;
        }).join(', ')})`
      }}>
        {/* Inner circle to make it a donut */}
        <div className="absolute inset-4 bg-gray-900 rounded-full" style={{ backgroundColor: '#111827' }} />
      </div>
      <div className="flex flex-col gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span>{d.name} <span className="text-gray-500 ml-1">({Math.round((d.count / total) * 100)}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
