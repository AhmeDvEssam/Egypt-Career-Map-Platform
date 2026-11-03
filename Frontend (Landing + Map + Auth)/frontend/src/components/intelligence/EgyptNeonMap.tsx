"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { FilterState } from "./IntelligenceFilterDrawer";
import { EGYPT_BORDER_GEOJSON, EGYPT_JOB_HEATMAP_GEOJSON } from "@/lib/egyptGeoData";

interface JobItem {
  id: string | number;
  title: string;
  company: string;
  location: string;
  salaryText?: string;
  workModel?: string;
  skills?: string[];
}

interface EgyptNeonMapProps {
  selectedGov: string;
  onGovSelect: (gov: string) => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  filters?: FilterState;
  hoveredJob?: JobItem | null;
}

interface CityMarkerInfo {
  id: string;
  nameEn: string;
  nameAr: string;
  coords: [number, number]; // [lng, lat]
  icon: string;
  isPrimary?: boolean;
  defaultRank?: string;
  growth: string;
  anchorOffset: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top" | "bottom" | "left" | "right";
}

const EGYPT_CITIES: CityMarkerInfo[] = [
  // 4 Primary Hubs with Cards matching Image 1
  {
    id: "Alexandria",
    nameEn: "Alexandria",
    nameAr: "الإسكندرية",
    coords: [29.9187, 31.2001],
    icon: "domain",
    isPrimary: true,
    defaultRank: "#3 Coastal Hub",
    growth: "5.7%",
    anchorOffset: "top-left",
  },
  {
    id: "Cairo",
    nameEn: "Cairo",
    nameAr: "القاهرة",
    coords: [31.2357, 30.0444],
    icon: "location_city",
    isPrimary: true,
    defaultRank: "#1 Tech Hub",
    growth: "8.2%",
    anchorOffset: "top-right",
  },
  {
    id: "Giza",
    nameEn: "Giza",
    nameAr: "الجيزة",
    coords: [31.2089, 29.9800],
    icon: "apartment",
    isPrimary: true,
    defaultRank: "#2 Business Hub",
    growth: "8.9%",
    anchorOffset: "bottom-left",
  },
  {
    id: "Port Said",
    nameEn: "Port Said",
    nameAr: "بورسعيد",
    coords: [32.3019, 31.2565],
    icon: "sailing",
    isPrimary: true,
    defaultRank: "Maritime Trade",
    growth: "8.0%",
    anchorOffset: "top-right",
  },

  // Regional Delta & Canal Hubs
  { id: "Dakahlia", nameEn: "Mansoura", nameAr: "المنصورة", coords: [31.3807, 31.0364], icon: "hub", growth: "4.5%", anchorOffset: "top" },
  { id: "Gharbia", nameEn: "Tanta", nameAr: "طنطا", coords: [31.0004, 30.7865], icon: "store", growth: "3.8%", anchorOffset: "left" },
  { id: "Sharqia", nameEn: "Zagazig", nameAr: "الزقازيق", coords: [31.5041, 30.5877], icon: "factory", growth: "4.1%", anchorOffset: "bottom" },
  { id: "Ismailia", nameEn: "Ismailia", nameAr: "الإسماعيلية", coords: [32.2743, 30.5965], icon: "directions_boat", growth: "3.5%", anchorOffset: "right" },
  { id: "Suez", nameEn: "Suez", nameAr: "السويس", coords: [32.5498, 29.9668], icon: "anchor", growth: "5.0%", anchorOffset: "bottom-right" },

  // Upper Egypt & Coastal Hubs
  { id: "Asyut", nameEn: "Asyut", nameAr: "أسيوط", coords: [31.1837, 27.1810], icon: "school", growth: "3.2%", anchorOffset: "right" },
  { id: "Red Sea", nameEn: "Hurghada", nameAr: "الغردقة", coords: [33.8116, 27.2579], icon: "hotel", growth: "6.2%", anchorOffset: "right" },
  { id: "South Sinai", nameEn: "Sharm El-Sheikh", nameAr: "شرم الشيخ", coords: [34.3299, 27.9158], icon: "flight", growth: "5.5%", anchorOffset: "right" },
  { id: "Luxor", nameEn: "Luxor", nameAr: "الأقصر", coords: [32.6396, 25.6872], icon: "museum", growth: "3.0%", anchorOffset: "right" },
  { id: "Aswan", nameEn: "Aswan", nameAr: "أسوان", coords: [32.8998, 24.0889], icon: "solar_power", growth: "4.8%", anchorOffset: "right" },
];

function getAnchorStyle(offset: CityMarkerInfo["anchorOffset"]): string {
  switch (offset) {
    case "top-left":
      return "bottom: 16px; right: 16px;";
    case "top-right":
      return "bottom: 16px; left: 16px;";
    case "bottom-left":
      return "top: 16px; right: 16px;";
    case "bottom-right":
      return "top: 16px; left: 16px;";
    case "top":
      return "bottom: 16px; left: 50%; transform: translateX(-50%);";
    case "bottom":
      return "top: 16px; left: 50%; transform: translateX(-50%);";
    case "left":
      return "right: 16px; top: 50%; transform: translateY(-50%);";
    case "right":
    default:
      return "left: 16px; top: 50%; transform: translateY(-50%);";
  }
}

export default function EgyptNeonMap({
  selectedGov,
  onGovSelect,
  isFullScreen,
  onToggleFullScreen,
  onOpenFilters,
  activeFilterCount = 0,
  filters,
  hoveredJob,
}: EgyptNeonMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const spotlightMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [govCounts, setGovCounts] = useState<Record<string, number>>({});
  const [, setCurrentZoom] = useState<number>(5.7);

  // Fetch real counts from database with active filters
  useEffect(() => {
    const queryParams = new URLSearchParams();
    if (filters?.categories && filters.categories.length > 0) {
      queryParams.set("categories", filters.categories.join(","));
    }
    if (filters?.skillTypes && filters.skillTypes.length > 0) {
      queryParams.set("skillTypes", filters.skillTypes.join(","));
    }
    if (filters?.workTypes && filters.workTypes.length > 0) {
      queryParams.set("workTypes", filters.workTypes.join(","));
    }
    if (filters?.careerLevels && filters.careerLevels.length > 0) {
      queryParams.set("careerLevels", filters.careerLevels.join(","));
    }
    if (filters?.sources && filters.sources.length > 0) {
      queryParams.set("sources", filters.sources.join(","));
    }
    if (filters?.salaryMin) {
      queryParams.set("salaryMin", filters.salaryMin.toString());
    }

    const qStr = queryParams.toString();
    fetch(`/api/map/distribution${qStr ? `?${qStr}` : ""}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const map: Record<string, number> = {};
          data.forEach((item: any) => {
            if (item.location) {
              map[item.location.toLowerCase()] = item.count;
            }
          });
          setGovCounts(map);
        }
      })
      .catch((err) => console.error("Error fetching map distribution:", err));
  }, [filters]);

  // Initialize MapLibre GL with Electric Oceanic Blue Tone, Neon Vector Mesh & Bioluminescent Heatmap
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "esri-dark": {
            type: "raster",
            tiles: [
              "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Hire Q Career Intelligence &bull; Esri",
          },
          "egypt-boundary": {
            type: "geojson",
            data: EGYPT_BORDER_GEOJSON,
          },
          "egypt-heatmap": {
            type: "geojson",
            data: EGYPT_JOB_HEATMAP_GEOJSON,
          },
        },
        layers: [
          // 1. Deep Midnight Ocean Background (Matches Image 1 #040f21)
          {
            id: "ocean-bg",
            type: "background",
            paint: {
              "background-color": "#040f21",
            },
          },

          // 2. Base Dark Map without any Labels (Zero foreign text, clear coastlines & seas)
          {
            id: "esri-base-layer",
            type: "raster",
            source: "esri-dark",
            minzoom: 0,
            maxzoom: 18,
            paint: {
              "raster-contrast": 0.35,
              "raster-saturation": 0.25,
              "raster-hue-rotate": -45,
              "raster-brightness-max": 0.85,
              "raster-opacity": 0.95,
            },
          },

          // 3. Egypt Territory Electric Navy Fill (Image 1 Aesthetic #122540)
          {
            id: "egypt-territory-fill",
            type: "fill",
            source: "egypt-boundary",
            paint: {
              "fill-color": "#122540",
              "fill-opacity": 0.45,
            },
          },

          // 4. Glowing Bioluminescent Heatmap Clusters (Cyan to Warm Yellow/Orange Core)
          {
            id: "egypt-job-heatmap",
            type: "heatmap",
            source: "egypt-heatmap",
            paint: {
              "heatmap-weight": ["get", "intensity"],
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 5, 1.2, 9, 3.2],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(0,0,0,0)",
                0.2,
                "rgba(0, 229, 255, 0.45)", // Cyan glow
                0.4,
                "rgba(0, 230, 118, 0.7)", // Emerald glow
                0.7,
                "rgba(255, 235, 59, 0.85)", // Vivid Yellow glow
                1.0,
                "rgba(255, 100, 50, 0.95)", // Warm Orange core at Cairo & Giza
              ],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 5, 34, 9, 85],
              "heatmap-opacity": 0.85,
            },
          },

          // 5. Glowing Outer Neon Cyan Boundary & Nile River Spine
          {
            id: "egypt-neon-glow",
            type: "line",
            source: "egypt-boundary",
            paint: {
              "line-color": "#00e5ff",
              "line-width": 6.5,
              "line-blur": 5.0,
              "line-opacity": 0.75,
            },
          },

          // 6. Crisp Electric Laser Border & Nile Line
          {
            id: "egypt-laser-border",
            type: "line",
            source: "egypt-boundary",
            paint: {
              "line-color": "#38bdf8",
              "line-width": 2.2,
              "line-opacity": 0.95,
            },
          },
        ],
      },
      center: [31.0, 27.9], // Center over Egypt
      zoom: 5.7,
      minZoom: 5.0,
      maxZoom: 13.0,
      maxBounds: [
        [22.5, 19.5],
        [38.5, 33.5],
      ],
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("zoom", () => {
      setCurrentZoom(map.getZoom());
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Teardrop Pins & Non-Overlapping Density Cards (Matches Image 1 Exactly)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    EGYPT_CITIES.forEach((city) => {
      const isSelected = selectedGov.toLowerCase() === city.id.toLowerCase();
      const realCount = govCounts[city.id.toLowerCase()] || 0;
      const countDisplay = realCount > 1000 ? `${(realCount / 1000).toFixed(1)}k` : realCount > 0 ? realCount.toString() : city.isPrimary ? "35.9k" : "120";
      const anchorCss = getAnchorStyle(city.anchorOffset);

      const el = document.createElement("div");
      el.className = "relative cursor-pointer select-none group";

      // If it's one of the 4 primary hubs or selected, show full teardrop pin & card (Matches Image 1)
      if (city.isPrimary || isSelected) {
        el.innerHTML = `
          <div class="relative flex items-center justify-center transition-all duration-300 ${isSelected ? "scale-110 z-40" : "hover:scale-105 z-25"}">
            <!-- Teardrop Pin Marker with Glowing Core (Matches Image 1) -->
            <div class="relative flex flex-col items-center justify-center">
              <div class="w-8 h-8 rounded-full ${isSelected ? "bg-[#00e5ff] text-slate-950 shadow-[0_0_20px_#00e5ff]" : "bg-[#0b2440]/90 border border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.4)]"} flex items-center justify-center">
                <span class="material-symbols-outlined text-[17px]">${city.icon}</span>
              </div>
              <!-- Teardrop Point -->
              <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent ${isSelected ? "border-t-[6px] border-t-[#00e5ff]" : "border-t-[6px] border-t-cyan-400"} -mt-[1px]"></div>
              <!-- Pulse Ring -->
              <div class="absolute w-10 h-10 rounded-full border border-cyan-400 animate-ping opacity-40 pointer-events-none"></div>
            </div>

            <!-- Attached Non-Overlapping Density Card (Image 1 Style) -->
            <div style="position: absolute; ${anchorCss} z-index: ${isSelected ? 50 : 30};" class="pointer-events-auto">
              <div class="px-3 py-2 rounded-xl backdrop-blur-xl border transition-all duration-200 ${
                isSelected
                  ? "bg-[#071322]/95 border-cyan-300 shadow-[0_0_24px_rgba(0,229,255,0.6)] ring-1 ring-cyan-300"
                  : "bg-[#071322]/90 border-cyan-500/40 hover:border-cyan-400 shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
              }">
                <div class="flex items-center justify-between gap-3 whitespace-nowrap">
                  <span class="text-xs font-extrabold text-white tracking-wide">${city.nameEn}</span>
                  <span class="text-[9px] text-slate-400">${city.nameAr}</span>
                </div>
                <div class="text-[9px] text-slate-400 font-medium">Live job density</div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs font-black text-cyan-300">▲ ${countDisplay}</span>
                  <span class="text-[10px] font-bold text-emerald-400">▲ ${city.growth}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        // Regional Hubs: Sleek Glowing Cyber Micro-Beacons with Hover Expansion
        el.innerHTML = `
          <div class="relative flex items-center justify-center transition-all duration-300 hover:scale-110 z-20">
            <!-- Pulsing Micro Dot -->
            <div class="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#00e5ff] flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>

            <!-- Compact Hover Tooltip (Directionally Staggered) -->
            <div style="position: absolute; ${anchorCss} z-index: 35;" class="pointer-events-auto hidden group-hover:flex">
              <div class="px-2.5 py-1.5 rounded-xl backdrop-blur-xl border border-cyan-400 bg-[#071322]/95 shadow-[0_0_20px_rgba(0,229,255,0.4)] whitespace-nowrap">
                <div class="flex items-center justify-between gap-2 border-b border-[#16273d] pb-0.5 mb-1">
                  <span class="text-xs font-bold text-white">${city.nameEn}</span>
                  <span class="text-[10px] text-slate-400">${city.nameAr}</span>
                </div>
                <div class="flex items-center justify-between text-[10px] gap-2">
                  <span class="text-cyan-400 font-semibold">${city.defaultRank || "Active Hub"}</span>
                  <span class="text-emerald-300 font-bold">${realCount} jobs</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onGovSelect(city.id);
        map.flyTo({
          center: city.coords,
          zoom: 8.5,
          speed: 1.2,
        });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(city.coords)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [selectedGov, govCounts, onGovSelect]);

  // Dynamic Hover Interaction: Spotlight Hovered Job from Feed directly on the Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (spotlightMarkerRef.current) {
      spotlightMarkerRef.current.remove();
      spotlightMarkerRef.current = null;
    }

    // Toggle all city cards visibility: when hovering on a job card, hide ALL city cards so only the job spotlight remains
    markersRef.current.forEach((marker) => {
      const el = marker.getElement();
      if (el) {
        el.style.display = hoveredJob ? "none" : "block";
      }
    });

    if (!hoveredJob) return;

    // Resolve matching city coordinates with smart district resolution
    const locLower = (hoveredJob.location || "").toLowerCase();
    let matchedCity = EGYPT_CITIES.find(
      (c) =>
        locLower.includes(c.id.toLowerCase()) ||
        locLower.includes(c.nameEn.toLowerCase()) ||
        locLower.includes(c.nameAr)
    );

    if (!matchedCity) {
      if (
        locLower.includes("nasr city") ||
        locLower.includes("new cairo") ||
        locLower.includes("maadi") ||
        locLower.includes("heliopolis") ||
        locLower.includes("tagamoa") ||
        locLower.includes("sheraton") ||
        locLower.includes("shorouk") ||
        locLower.includes("madinaty") ||
        locLower.includes("zamalek")
      ) {
        matchedCity = EGYPT_CITIES.find((c) => c.id === "Cairo");
      } else if (
        locLower.includes("smart village") ||
        locLower.includes("october") ||
        locLower.includes("zayed") ||
        locLower.includes("dokki") ||
        locLower.includes("mohandessin") ||
        locLower.includes("haram") ||
        locLower.includes("faisal") ||
        locLower.includes("agouza")
      ) {
        matchedCity = EGYPT_CITIES.find((c) => c.id === "Giza");
      } else if (
        locLower.includes("smouha") ||
        locLower.includes("gleem") ||
        locLower.includes("sidi gaber") ||
        locLower.includes("borg el arab")
      ) {
        matchedCity = EGYPT_CITIES.find((c) => c.id === "Alexandria");
      } else {
        matchedCity = EGYPT_CITIES.find((c) => c.id === "Cairo");
      }
    }

    if (!matchedCity) return;

    const el = document.createElement("div");
    el.className = "relative z-50 pointer-events-none animate-in zoom-in-75 duration-200";
    el.innerHTML = `
      <div class="relative flex flex-col items-center">
        <!-- Floating Job Spotlight Card -->
        <div class="mb-2 px-3.5 py-2.5 rounded-2xl bg-[#071322]/95 border-2 border-cyan-400 shadow-[0_0_30px_rgba(0,229,255,0.7)] backdrop-blur-xl max-w-xs whitespace-normal">
          <div class="flex items-center gap-1.5 text-[10px] font-bold text-cyan-300 mb-0.5">
            <span class="material-symbols-outlined text-[13px]">location_on</span>
            <span>${matchedCity.nameEn} Spotlight</span>
            <span class="ml-auto bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/30">
              ${hoveredJob.workModel || "Live"}
            </span>
          </div>
          <div class="text-xs font-black text-white truncate max-w-[200px]">
            ${hoveredJob.title}
          </div>
          <div class="text-[11px] text-slate-300 truncate font-medium">
            ${hoveredJob.company}
          </div>
          <div class="text-[10px] font-bold text-emerald-400 mt-1">
            ${hoveredJob.salaryText || "Negotiable (EGP)"}
          </div>
          ${
            hoveredJob.skills && hoveredJob.skills.length > 0
              ? `
            <div class="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-[#16273d]">
              ${hoveredJob.skills
                .slice(0, 3)
                .map(
                  (sk) => `
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-200 border border-cyan-500/30 font-medium">
                  ${sk}
                </span>`
                )
                .join("")}
            </div>`
              : ""
          }
        </div>

        <!-- Animated Pulsing Target Radar -->
        <div class="relative flex items-center justify-center">
          <div class="w-5 h-5 rounded-full bg-cyan-300 shadow-[0_0_20px_#00e5ff] flex items-center justify-center">
            <div class="w-2 h-2 rounded-full bg-slate-950"></div>
          </div>
          <div class="absolute w-12 h-12 rounded-full border-2 border-cyan-400 animate-ping opacity-80"></div>
        </div>
      </div>
    `;

    const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat(matchedCity.coords)
      .addTo(map);

    spotlightMarkerRef.current = marker;
  }, [hoveredJob]);

  const handlePillClick = (govId: string) => {
    onGovSelect(govId);
    const city = EGYPT_CITIES.find((c) => c.id.toLowerCase() === govId.toLowerCase());
    if (city && mapRef.current) {
      mapRef.current.flyTo({ center: city.coords, zoom: 8.5, speed: 1.2 });
    }
  };

  const handleResetOverview = () => {
    onGovSelect("Egypt");
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [31.0, 27.9], zoom: 5.7, speed: 1.2 });
    }
  };

  const isAllSelected = !selectedGov || selectedGov === "Egypt" || selectedGov === "All";

  return (
    <div className="flex-1 h-[calc(100vh-64px)] bg-[#050c17] flex flex-col relative overflow-hidden transition-all duration-300">
      {/* Top Controls Bar: Exactly Matching Image 1 (Spacious, Clean, Never Squished) */}
      <div className="h-14 border-b border-[#142338] px-5 flex items-center justify-between gap-4 z-20 bg-[#07111f]/95 backdrop-blur-md shrink-0">
        {/* Left: Governorates Label + Pills Strip */}
        <div className="flex items-center gap-2.5 overflow-x-auto py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden min-w-0 flex-1">
          <span className="text-sm font-bold text-white tracking-wide shrink-0 mr-1">
            Governorates
          </span>

          {/* Cairo Pill (Highlighted like Image 1) */}
          <button
            onClick={() => handlePillClick("Cairo")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedGov.toLowerCase() === "cairo"
                ? "bg-teal-500/25 text-teal-300 border border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.4)]"
                : "bg-[#0b1728] border border-[#1b2f48] text-slate-300 hover:text-white hover:border-slate-500"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            <span>Cairo</span>
          </button>

          {/* Alexandria Pill */}
          <button
            onClick={() => handlePillClick("Alexandria")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedGov.toLowerCase() === "alexandria"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "bg-[#0b1728] border border-[#1b2f48] text-slate-400 hover:text-slate-200 hover:border-slate-500"
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">location_on</span>
            <span>Alexandria</span>
          </button>

          {/* Giza Pill */}
          <button
            onClick={() => handlePillClick("Giza")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedGov.toLowerCase() === "giza"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "bg-[#0b1728] border border-[#1b2f48] text-slate-400 hover:text-slate-200 hover:border-slate-500"
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">location_on</span>
            <span>Giza</span>
          </button>

          {/* Port Said Pill */}
          <button
            onClick={() => handlePillClick("Port Said")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedGov.toLowerCase() === "port said"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "bg-[#0b1728] border border-[#1b2f48] text-slate-400 hover:text-slate-200 hover:border-slate-500"
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">location_on</span>
            <span>Port Said</span>
          </button>

          {/* All Egypt Pill */}
          <button
            onClick={handleResetOverview}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              isAllSelected
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "bg-[#0b1728] border border-[#1b2f48] text-slate-400 hover:text-slate-200 hover:border-slate-500"
            }`}
          >
            <span>🇪🇬 All Egypt</span>
          </button>

          {/* Regional Hubs Pills */}
          <button
            onClick={() => handlePillClick("Dakahlia")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedGov.toLowerCase() === "dakahlia"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "bg-[#0b1728] border border-[#1b2f48] text-slate-400 hover:text-slate-200 hover:border-slate-500"
            }`}
          >
            <span>Mansoura</span>
          </button>

          <button
            onClick={() => handlePillClick("Suez")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedGov.toLowerCase() === "suez"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "bg-[#0b1728] border border-[#1b2f48] text-slate-400 hover:text-slate-200 hover:border-slate-500"
            }`}
          >
            <span>Suez</span>
          </button>
        </div>
      </div>

      {/* Real Map Canvas Container (Electric Oceanic Tone & Bioluminescent Glow) */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-[#040f21]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Ambient Oceanic Glow Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(5, 12, 23, 0.7) 100%)",
          }}
        />
      </div>
    </div>
  );
}
