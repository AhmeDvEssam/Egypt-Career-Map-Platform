"use client";

import React, { useState, useEffect } from "react";
import IntelligenceTopNav from "@/components/intelligence/IntelligenceTopNav";
import IntelligenceMiniDock from "@/components/intelligence/IntelligenceMiniDock";
import LiveJobsFeed, { JobItem } from "@/components/intelligence/LiveJobsFeed";
import EgyptNeonMap from "@/components/intelligence/EgyptNeonMap";
import LaborMarketSidebar from "@/components/intelligence/LaborMarketSidebar";
import V2AnalyticsView from "@/components/intelligence/V2AnalyticsView";
import V2AICopilotView from "@/components/intelligence/V2AICopilotView";
import V2ProfileVaultView from "@/components/intelligence/V2ProfileVaultView";
import IntelligenceFilterDrawer, { FilterState } from "@/components/intelligence/IntelligenceFilterDrawer";

const INITIAL_FILTERS: FilterState = {
  categories: [],
  skillTypes: [],
  workTypes: [],
  careerLevels: [],
  sources: [],
  salaryMin: null,
};

export default function IntelligencePage() {
  const [activeTab, setActiveTab] = useState<string>("map");
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>("Egypt");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isFullScreenMap, setIsFullScreenMap] = useState<boolean>(false);
  const [, setSelectedJob] = useState<JobItem | null>(null);
  const [hoveredJob, setHoveredJob] = useState<JobItem | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name?: string | null; image?: string | null } | null>(null);

  // Fetch current candidate profile for Navbar Avatar
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Advanced Filters State
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>(INITIAL_FILTERS);

  const activeFilterCount =
    activeFilters.categories.length +
    activeFilters.skillTypes.length +
    activeFilters.workTypes.length +
    activeFilters.careerLevels.length +
    activeFilters.sources.length +
    (activeFilters.salaryMin ? 1 : 0);

  const handleGovSelect = (gov: string) => {
    setSelectedGovernorate(gov);
  };

  const handleToggleFullScreen = () => {
    setIsFullScreenMap((prev) => !prev);
  };

  return (
    <div className="w-full h-screen bg-[#050c17] text-slate-100 flex flex-col overflow-hidden font-sans select-none antialiased">
      {/* 1. Slim Top Navigation Bar with Dynamic Profile Avatar, Filter & Expand buttons */}
      <IntelligenceTopNav
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          if (isFullScreenMap) setIsFullScreenMap(false);
        }}
        userImage={currentUser?.image}
        userName={currentUser?.name}
        activeTab={activeTab}
        onOpenFilters={() => setIsFilterDrawerOpen(true)}
        activeFilterCount={activeFilterCount}
        isFullScreenMap={isFullScreenMap}
        onToggleFullScreen={handleToggleFullScreen}
      />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Leftmost Mini Dock (View Switcher) */}
        <IntelligenceMiniDock
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (isFullScreenMap) setIsFullScreenMap(false);
          }}
        />

        {/* Dynamic View Router */}
        {activeTab === "map" && (
          <div className="flex-1 flex overflow-hidden w-full relative">
            {/* Left: Live Jobs Feed (Collapses in Full-Screen Map mode) */}
            {!isFullScreenMap && (
              <LiveJobsFeed
                selectedLocation={selectedGovernorate}
                onJobSelect={(job) => setSelectedJob(job)}
                onJobHover={setHoveredJob}
                hoveredJobId={hoveredJob?.id}
                searchQuery={searchQuery}
                filters={activeFilters}
              />
            )}

            {/* Center: Real MapLibre GL Neon Map */}
            <EgyptNeonMap
              selectedGov={selectedGovernorate}
              onGovSelect={handleGovSelect}
              isFullScreen={isFullScreenMap}
              onToggleFullScreen={handleToggleFullScreen}
              onOpenFilters={() => setIsFilterDrawerOpen(true)}
              activeFilterCount={activeFilterCount}
              filters={activeFilters}
              hoveredJob={hoveredJob}
            />

            {/* Right: Labor Market Sidebar (Collapses in Full-Screen Map mode) */}
            {!isFullScreenMap && (
              <LaborMarketSidebar
                selectedLocation={selectedGovernorate}
                filters={activeFilters}
              />
            )}
          </div>
        )}

        {/* View 2: Labor Market Analytics Dashboard */}
        {activeTab === "analytics" && <V2AnalyticsView />}

        {/* View 3: AI Career Copilot Assistant */}
        {activeTab === "ai" && <V2AICopilotView />}

        {/* View 4: Candidate Profile & Application Vault & Mirror */}
        {activeTab === "profile" && <V2ProfileVaultView />}
      </div>

      {/* Advanced Filters Drawer */}
      <IntelligenceFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={activeFilters}
        onApply={(newFilters) => setActiveFilters(newFilters)}
        onReset={() => setActiveFilters(INITIAL_FILTERS)}
      />
    </div>
  );
}
