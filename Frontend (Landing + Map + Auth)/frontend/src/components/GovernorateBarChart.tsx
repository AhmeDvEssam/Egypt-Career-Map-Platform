"use client";
import React, { useEffect, useState } from "react";

interface LocationData {
  location: string;
  count: number;
}

export default function GovernorateBarChart() {
  const [data, setData] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/map/distribution")
      .then((res) => res.json())
      .then((json: any) => {
        if (!Array.isArray(json)) {
          console.error("Expected array but got:", json);
          setData([]);
          setLoading(false);
          return;
        }
        // Sort by count descending and take top 7
        const sorted = json.sort((a: LocationData, b: LocationData) => b.count - a.count).slice(0, 7);
        setData(sorted);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching bar chart data:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-secondary text-3xl">sync</span>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="w-full flex flex-col gap-4 mt-2">
      {data.map((item, i) => {
        const percentage = (item.count / maxCount) * 100;
        
        // Colors from our theme: tertiary, secondary, primary
        let colorClass = "bg-primary";
        if (i === 0) colorClass = "bg-tertiary neon-emerald-glow";
        else if (i === 1 || i === 2) colorClass = "bg-secondary neon-glow-secondary";

        return (
          <div key={item.location} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="text-white font-medium">{item.location}</span>
              <span className="text-on-surface-variant font-label-sm">{item.count.toLocaleString()} jobs</span>
            </div>
            <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${colorClass} transition-all duration-1000 ease-out`} 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
