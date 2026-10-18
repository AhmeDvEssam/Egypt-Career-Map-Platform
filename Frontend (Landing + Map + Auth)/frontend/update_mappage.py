import re

file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\app\map\page.tsx'
clean_content = """"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import InteractiveMap from "@/components/InteractiveMap";
import JobFeed from "@/components/JobFeed";

export default function MapPage() {
  const [highlightedLocation, setHighlightedLocation] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const currentQuery = searchParams.get("q") || "";

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("q", val);
    } else {
      params.delete("q");
    }
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="bg-background text-on-background font-body-md flex flex-col antialiased overflow-x-hidden h-screen">
      
      {/* Main Content Split */}
      <main className="flex-1 flex mt-[72px] h-[calc(100vh-72px)] w-full overflow-hidden px-4 md:px-8 py-4 md:py-6 gap-6">
        {/* LEFT SIDE: Job Feed */}
        <section className="w-full lg:w-[45%] xl:w-[40%] flex-shrink-0 h-full flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden z-10">
          
          {/* Search Header */}
          <div className="p-5 border-b border-outline-variant/20 bg-surface/90 backdrop-blur-md z-20 flex flex-col gap-4">
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input 
                  className="w-full bg-surface-container border border-outline-variant/50 rounded-xl py-2.5 pl-12 pr-4 text-on-surface font-body-md placeholder:text-outline focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" 
                  placeholder="Smart search (job title, skills, description, company)..." 
                  type="text"
                  defaultValue={currentQuery}
                  onChange={(e) => {
                    // Simple debounce
                    clearTimeout((window as any).searchTimeout);
                    (window as any).searchTimeout = setTimeout(() => handleSearch(e), 500);
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Job Cards List */}
          <JobFeed 
            onJobHover={setHighlightedLocation} 
            onJobClick={setHighlightedLocation} 
          />
        </section>
        
        {/* RIGHT SIDE: Interactive Map */}
        <section className="hidden lg:block flex-1 h-full relative rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/30">
          <InteractiveMap mode="jobs" highlightLocation={highlightedLocation} searchQuery={currentQuery} />
        </section>
      </main>

    </div>
  );
}
"""

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(clean_content)

print("MapPage rewritten")
