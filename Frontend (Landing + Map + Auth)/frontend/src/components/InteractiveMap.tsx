"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface LocationData {
  location: string;
  count: number;
}

// Egypt governorates approximate centers
const GOVERNORATE_COORDS: Record<string, [number, number]> = {
  Cairo: [31.2357, 30.0444],
  Giza: [31.2089, 30.0131],
  Alexandria: [29.9187, 31.2001],
  Dakahlia: [31.3807, 31.0364],
  Gharbia: [31.0335, 30.8754],
  "Red Sea": [33.8116, 27.2579],
  Aswan: [32.8998, 24.0889],
  Luxor: [32.6396, 25.6872],
  "Port Said": [32.3019, 31.2565],
  Suez: [32.5498, 29.9668],
  Ismailia: [32.2613, 30.5965],
  Sharqia: [31.6020, 30.5877],
  Qalyubia: [31.2428, 30.3292],
  Monufia: [30.9876, 30.5972],
  Beheira: [30.4133, 31.0343],
  Faiyum: [30.8418, 29.3084],
  "Beni Suef": [31.0843, 29.0661],
  Minya: [30.7503, 28.1099],
  Asyut: [31.1837, 27.1810],
  Sohag: [31.6948, 26.5591],
  Qena: [32.7167, 26.1551],
  Kafr: [31.1129, 31.0862],
  Matruh: [27.2453, 31.3543],
  "New Valley": [28.9717, 25.4410],
  "North Sinai": [33.6174, 31.1325],
  "South Sinai": [33.9189, 28.2358],
  Damietta: [31.8133, 31.4175],
  "6Th Of October": [30.9188, 29.9285],
  "Nasr City": [31.3450, 30.0626],
  Heliopolis: [31.3387, 30.0871],
  Maadi: [31.2598, 29.9602],
  "New Cairo": [31.4913, 30.0300],
  "Sheikh Zayed": [30.9418, 30.0191],
  Egypt: [30.8025, 26.8206], // Fallback
};

interface InteractiveMapProps {
  mode?: "explore" | "jobs";
  highlightLocation?: string | null;
  searchQuery?: string;
  onLocationClick?: (location: string) => void;
}

export default function InteractiveMap({
  mode = "explore",
  highlightLocation = null,
  searchQuery = "",
  onLocationClick,
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [data, setData] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Fetch distribution data
  useEffect(() => {
    // Only fetch distribution if we are in jobs mode
    if (mode !== "jobs") {
      setLoading(false);
      return;
    }

    const url = searchQuery ? `/api/map/distribution?q=${encodeURIComponent(searchQuery)}` : "/api/map/distribution";

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (!Array.isArray(json)) {
          console.error("Expected array but got:", json);
          setData([]);
        } else {
          setData(json);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Map data fetch error:", err);
        setLoading(false);
      });
  }, [mode, searchQuery]);

  // Initialize map
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
              "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            ],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.esri.com/">Esri</a>'
          }
        },
        layers: [
                      {
              id: "esri-dark-layer",
              type: "raster",
              source: "esri-dark",
              minzoom: 0,
              maxzoom: 19,
              paint: {
                "raster-contrast": 0.4,
                "raster-brightness-max": 0.6,
                "raster-hue-rotate": -45
              }
            },
        ],
      },
      center: [30.8, 26.8],
      zoom: 5.5,
      maxBounds: [
        [22, 20],
        [38, 33],
      ],
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render data markers
  useEffect(() => {
    if (!mapRef.current || !Array.isArray(data) || data.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const maxCount = Math.max(...data.map((d) => d.count));

    data.forEach((item) => {
      const coords = GOVERNORATE_COORDS[item.location];
      if (!coords) return;

      const ratio = item.count / maxCount;
      const radius = Math.max(12, Math.min(50, ratio * 50));
      const opacity = 0.3 + ratio * 0.5;
      const isHighlighted = highlightLocation === item.location;
      if (highlightLocation && !isHighlighted) return;

      // Create container for marker and label
      const markerContainer = document.createElement("div");
      markerContainer.style.display = "flex";
      markerContainer.style.flexDirection = "column";
      markerContainer.style.alignItems = "center";
      markerContainer.style.gap = "4px";

      // Create glowing circle element
      const el = document.createElement("div");
      el.style.width = `${radius}px`;
      el.style.height = `${radius}px`;
      el.style.borderRadius = "50%";
      el.style.background = isHighlighted
        ? "rgba(255, 42, 122, 0.8)"
        : `rgba(0, 229, 255, ${opacity})`;
      el.style.border = isHighlighted
        ? "2px solid #ff2a7a"
        : "1px solid rgba(0, 229, 255, 0.6)";
      el.style.boxShadow = isHighlighted
        ? "0 0 30px rgba(255, 42, 122, 0.5), 0 0 60px rgba(255, 42, 122, 0.2)"
        : `0 0 ${ratio * 30}px rgba(0, 229, 255, ${ratio * 0.4})`;
      el.style.cursor = "pointer";
      el.style.transition = "all 0.3s ease";
        markerContainer.appendChild(el);

      

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.2)";
        el.style.boxShadow = `0 0 40px rgba(0, 229, 255, 0.6)`;
        
        
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
        el.style.boxShadow = isHighlighted
          ? "0 0 30px rgba(255, 42, 122, 0.5)"
          : `0 0 ${ratio * 30}px rgba(0, 229, 255, ${ratio * 0.4})`;
        
        
      });

      // Popup
      const popup = new maplibregl.Popup({
        offset: 15,
        closeButton: false,
        className: "map-popup",
      }).setHTML(`
        <div style="background: rgba(21,14,40,0.95); backdrop-filter: blur(10px); border: 1px solid rgba(255,42,122,0.5); border-radius: 12px; padding: 12px 16px; color: #c4b5fd; min-width: 140px;">
          <div style="font-weight: 700; font-size: 14px; color: #ff2a7a; margin-bottom: 4px;">${item.location}</div>
          <div style="font-size: 22px; font-weight: 800; color: #ffffff;">${item.count.toLocaleString()}</div>
          <div style="font-size: 11px; color: #8c909f; margin-top: 2px;">Active Jobs</div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: markerContainer })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(mapRef.current!);

      el.addEventListener("click", () => {
        onLocationClick?.(item.location);
      });

      markersRef.current.push(marker);
    });
  }, [data, highlightLocation, onLocationClick]);

  // Fly to highlighted location
  useEffect(() => {
    if (!mapRef.current || !highlightLocation) return;
    const coords = GOVERNORATE_COORDS[highlightLocation];
    if (coords) {
      mapRef.current.flyTo({ center: coords, zoom: 10, duration: 1500 });
    }
  }, [highlightLocation]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mode === "jobs") {
      mapRef.current.scrollZoom.enable();
      mapRef.current.dragPan.enable();
      mapRef.current.doubleClickZoom.enable();
    } else {
      mapRef.current.scrollZoom.disable(); // MUST be disabled so page can scroll
      mapRef.current.dragPan.enable();
      mapRef.current.doubleClickZoom.enable();
    }
  }, [mode]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: "500px" }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50">
          <div className="text-secondary animate-pulse flex items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
            Loading map data...
          </div>
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: "500px", backgroundColor: "#090514" }}
      />
    </div>
  );
}
