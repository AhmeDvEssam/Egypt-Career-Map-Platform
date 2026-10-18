"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createPortal } from "react-dom";

export default function FilterPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Local state for the drawer before applying
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>([]);
  const [selectedExperienceLevels, setSelectedExperienceLevels] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedEducationLevels, setSelectedEducationLevels] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState<number | null>(null);

  // Initialize from URL when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedLocations(searchParams.get("locations")?.split(",") || []);
      setSelectedWorkTypes(searchParams.get("workTypes")?.split(",") || []);
      setSelectedExperienceLevels(searchParams.get("experienceLevels")?.split(",") || []);
      setSelectedJobTypes(searchParams.get("jobTypes")?.split(",") || []);
      setSelectedSources(searchParams.get("sources")?.split(",") || []);
      setSelectedEducationLevels(searchParams.get("educationLevels")?.split(",") || []);
      
      const sMin = searchParams.get("salaryMin");
      setSalaryMin(sMin ? parseInt(sMin, 10) : null);
    }
  }, [isOpen, searchParams]);

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (selectedLocations.length > 0) params.set("locations", selectedLocations.join(","));
    else params.delete("locations");

    if (selectedWorkTypes.length > 0) params.set("workTypes", selectedWorkTypes.join(","));
    else params.delete("workTypes");

    if (selectedExperienceLevels.length > 0) params.set("experienceLevels", selectedExperienceLevels.join(","));
    else params.delete("experienceLevels");

    if (selectedJobTypes.length > 0) params.set("jobTypes", selectedJobTypes.join(","));
    else params.delete("jobTypes");

    if (selectedSources.length > 0) params.set("sources", selectedSources.join(","));
    else params.delete("sources");

    if (selectedEducationLevels.length > 0) params.set("educationLevels", selectedEducationLevels.join(","));
    else params.delete("educationLevels");

    if (salaryMin !== null && salaryMin > 0) params.set("salaryMin", salaryMin.toString());
    else params.delete("salaryMin");

    const targetPath = pathname === "/" ? "/map" : pathname;
    router.push(`${targetPath}?${params.toString()}`);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    setSelectedLocations([]);
    setSelectedWorkTypes([]);
    setSelectedExperienceLevels([]);
    setSelectedJobTypes([]);
    setSelectedSources([]);
    setSelectedEducationLevels([]);
    setSalaryMin(null);
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete("locations");
    params.delete("workTypes");
    params.delete("experienceLevels");
    params.delete("jobTypes");
    params.delete("sources");
    params.delete("educationLevels");
    params.delete("salaryMin");
    
    const targetPath = pathname === "/" ? "/map" : pathname;
    router.push(`${targetPath}?${params.toString()}`);
    setIsOpen(false);
  };

  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<string[]>>, val: string, checked: boolean) => {
    if (checked) setter(prev => [...prev, val]);
    else setter(prev => prev.filter(v => v !== val));
  };

  const CheckboxGroup = ({ title, options, selected, setter }: { title: string, options: string[], selected: string[], setter: any }) => (
    <div>
      <h4 className="text-on-surface text-sm font-bold mb-3 uppercase tracking-wider">{title}</h4>
      <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input 
                type="checkbox" 
                className="peer appearance-none w-5 h-5 rounded border-2 border-outline-variant/60 bg-surface-container checked:bg-secondary checked:border-secondary transition-all cursor-pointer" 
                checked={selected.includes(opt)}
                onChange={(e) => toggleFilter(setter, opt, e.target.checked)}
              />
              <span className="material-symbols-outlined absolute text-[14px] text-on-secondary opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                check
              </span>
            </div>
            <span className="text-on-surface-variant text-sm group-hover:text-primary transition-colors select-none">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const drawerContent = (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={() => setIsOpen(false)} 
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-[420px] h-full bg-surface border-l border-outline-variant/30 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 ease-out">
        
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">filter_list</span>
            </div>
            <h2 className="text-xl font-bold text-on-surface">Data Slicers</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-surface">
          
          <CheckboxGroup 
            title="Location" 
            options={["Cairo", "Alexandria", "Giza", "Remote", "Sharqia", "Monufia", "Dakahlia"]}
            selected={selectedLocations}
            setter={setSelectedLocations}
          />

          <CheckboxGroup 
            title="Work Type" 
            options={["Remote", "Hybrid", "On-site", "Company Site"]}
            selected={selectedWorkTypes}
            setter={setSelectedWorkTypes}
          />

          <CheckboxGroup 
            title="Job Type" 
            options={["Full Time", "Part Time", "Freelance", "Contract", "Internship", "Shift Based"]}
            selected={selectedJobTypes}
            setter={setSelectedJobTypes}
          />

          <CheckboxGroup 
            title="Career Level" 
            options={["Student", "Entry Level", "Mid Level", "Senior Level", "Manager", "Director", "Executive"]}
            selected={selectedExperienceLevels}
            setter={setSelectedExperienceLevels}
          />

          <CheckboxGroup 
            title="Education Level" 
            options={["Bachelor's Degree", "Master's Degree", "PhD", "High School", "Diploma", "Not Specified"]}
            selected={selectedEducationLevels}
            setter={setSelectedEducationLevels}
          />

          <CheckboxGroup 
            title="Source" 
            options={["LinkedIn", "Wuzzuf", "Bayt", "Forasna"]}
            selected={selectedSources}
            setter={setSelectedSources}
          />

          {/* Salary Slicer */}
          <div>
            <h4 className="text-on-surface text-sm font-bold mb-3 uppercase tracking-wider">Minimum Salary (EGP)</h4>
            <div className="flex flex-col gap-2">
              <input 
                type="range" 
                min="0" max="100000" step="5000"
                value={salaryMin || 0}
                onChange={(e) => setSalaryMin(Number(e.target.value))}
                className="w-full accent-secondary"
              />
              <div className="text-right text-primary font-bold">
                {salaryMin ? `+${salaryMin.toLocaleString()} EGP` : "Any"}
              </div>
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-outline-variant/20 bg-surface-container-lowest flex gap-4 shrink-0">
          <button 
            onClick={handleClearAll}
            className="flex-1 py-3 rounded-xl border border-outline-variant/50 text-on-surface font-bold hover:bg-surface-variant transition-colors"
          >
            Clear All
          </button>
          <button 
            onClick={handleApply}
            className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            Apply 
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--color-outline-variant);
          border-radius: 20px;
        }
      `}} />
    </div>
  );

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/50 bg-surface-container-high text-on-surface hover:text-primary hover:border-primary/50 hover:bg-surface-variant transition-all shrink-0 shadow-lg"
      >
        <span className="material-symbols-outlined text-[18px]">tune</span>
        <span className="text-sm font-bold tracking-wide">Filters</span>
      </button>

      {/* Render via Portal so it breaks out of Navbar stacking context */}
      {isOpen && mounted && createPortal(drawerContent, document.body)}
    </>
  );
}
