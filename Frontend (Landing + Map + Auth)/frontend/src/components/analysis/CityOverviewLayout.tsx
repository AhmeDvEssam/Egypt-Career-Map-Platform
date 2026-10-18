import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, DonutChart } from './Charts';

export default function CityOverviewLayout({ children, intent }: { children: React.ReactNode; intent?: any }) {
  const data = intent?.data;
  const city = intent?.parameters?.city;

  const topRoles = data?.top_roles || [];
  const topCompanies = data?.top_companies || [];
  const count = data?.count || 0;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-center items-center">
      
      {/* Center KPI Map Marker Style */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="pointer-events-auto absolute top-[15%] left-10 flex flex-col items-center"
      >
        <div className="backdrop-blur-xl bg-background/50 border border-secondary/30 p-6 rounded-3xl shadow-[0_0_40px_rgba(93,230,255,0.2)] text-center w-64 max-w-[90vw]">
          <h3 className="text-secondary text-sm uppercase tracking-wider mb-2 font-bold flex items-center justify-center gap-2 w-full">
            <span className="material-symbols-outlined shrink-0">location_on</span>
            <span className="truncate">{city || "City Overview"}</span>
          </h3>
          <p className="text-5xl font-bold text-white text-glow mb-1">{count}</p>
          <p className="text-outline-variant text-sm uppercase">Total Jobs</p>
        </div>
        {/* Pointer tip to look like a map marker */}
        <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[20px] border-t-secondary/50 mt-1 shadow-2xl backdrop-blur-xl" />
      </motion.div>

      {/* Floating BarChart for Top Roles at the bottom */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
        className="pointer-events-auto fixed bottom-4 md:bottom-10 left-1/2 -translate-x-1/2 backdrop-blur-xl bg-background/60 border border-outline-variant/40 p-4 md:p-6 rounded-2xl shadow-2xl w-[95%] md:w-[90%] max-w-2xl"
      >
        <h3 className="text-primary text-sm uppercase tracking-wider mb-4 font-bold flex items-center gap-2">
          <span className="material-symbols-outlined">trending_up</span> Top Roles in <span className="truncate">{city}</span>
        </h3>
        {topRoles.length > 0 ? (
          <div className="h-48">
             <BarChart data={topRoles} />
          </div>
        ) : (
          <p className="text-white">No data available for top roles.</p>
        )}
      </motion.div>

      {/* Floating DonutChart for Top Companies on the right */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
        className="pointer-events-auto fixed top-1/2 right-10 -translate-y-1/2 backdrop-blur-xl bg-background/60 border border-outline-variant/40 p-6 rounded-2xl shadow-2xl w-80 hidden lg:block"
      >
        <h3 className="text-tertiary text-sm uppercase tracking-wider mb-4 font-bold flex items-center gap-2">
          <span className="material-symbols-outlined">business</span> Top Hiring Companies
        </h3>
        {topCompanies.length > 0 ? (
          <div className="h-64 flex justify-center items-center">
             <DonutChart data={topCompanies} />
          </div>
        ) : (
          <p className="text-white text-center">No data available.</p>
        )}
      </motion.div>

      {/* Hidden container for children if any */}
      <div className="hidden">
        {children}
      </div>

    </div>
  );
}
