// High-Fidelity Egypt Vector Boundaries & Nile River Spine
// Provides the glowing neon cyber aesthetic for Egypt Career Intelligence

export const EGYPT_BORDER_GEOJSON: any = {
  type: "FeatureCollection",
  features: [
    // 1. Egypt National Boundary Polygon
    {
      type: "Feature",
      properties: { name: "Egypt Mainland" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [25.0, 31.55], // Sallum (Northwest corner)
            [25.5, 31.6],
            [26.2, 31.35],
            [27.24, 31.35], // Matruh
            [28.5, 30.95],
            [29.91, 31.2], // Alexandria
            [30.4, 31.45], // Rosetta
            [31.1, 31.55], // Burullus
            [31.81, 31.42], // Damietta
            [32.3, 31.26], // Port Said
            [32.8, 31.1],
            [33.6, 31.13], // Arish
            [34.25, 31.3], // Rafah (Northeast corner)
            [34.88, 29.55], // Taba
            [34.33, 27.92], // Sharm El-Sheikh (Sinai tip)
            [33.85, 27.8],
            [33.81, 27.26], // Hurghada
            [33.95, 26.75], // Safaga
            [34.3, 26.1], // Quseir
            [34.89, 25.06], // Marsa Alam
            [35.4, 24.1], // Berenice
            [36.9, 22.0], // Shalateen / Halayeb (Southeast border)
            [25.0, 22.0], // Southwest border (Egypt-Libya-Sudan tripoint)
            [25.0, 31.55], // Western border straight line with Libya
          ],
        ],
      },
    },

    // 2. Sinai Peninsula Internal Border Accent
    {
      type: "Feature",
      properties: { name: "Sinai Boundary" },
      geometry: {
        type: "LineString",
        coordinates: [
          [32.3, 31.26], // Port Said
          [32.27, 30.6], // Ismailia
          [32.55, 29.97], // Suez
          [33.0, 28.5],
          [34.33, 27.92], // Sharm El-Sheikh
          [34.45, 28.5], // Dahab
          [34.65, 29.05], // Nuweiba
          [34.88, 29.55], // Taba
        ],
      },
    },

    // 3. The Nile River & Delta Spine (Glowing Electric Spine)
    {
      type: "Feature",
      properties: { name: "Nile River Valley" },
      geometry: {
        type: "LineString",
        coordinates: [
          [32.9, 24.09], // Aswan
          [32.95, 24.9], // Kom Ombo
          [32.87, 25.15], // Edfu
          [32.64, 25.69], // Luxor
          [32.72, 26.16], // Qena
          [32.0, 26.35], // Nag Hammadi
          [31.69, 26.56], // Sohag
          [31.18, 27.18], // Asyut
          [30.75, 28.11], // Minya
          [31.08, 29.07], // Beni Suef
          [31.24, 29.98], // Helwan / Giza
          [31.24, 30.05], // Cairo
        ],
      },
    },

    // 4. Nile Delta Rosetta Branch
    {
      type: "Feature",
      properties: { name: "Rosetta Branch" },
      geometry: {
        type: "LineString",
        coordinates: [
          [31.24, 30.05], // Cairo apex
          [31.1, 30.45],
          [30.85, 30.8],
          [30.55, 31.15],
          [30.42, 31.46], // Rosetta mouth
        ],
      },
    },

    // 5. Nile Delta Damietta Branch
    {
      type: "Feature",
      properties: { name: "Damietta Branch" },
      geometry: {
        type: "LineString",
        coordinates: [
          [31.24, 30.05], // Cairo apex
          [31.35, 30.4],
          [31.45, 30.8],
          [31.55, 31.1], // Mansoura
          [31.81, 31.42], // Damietta mouth
        ],
      },
    },
  ],
};

// Heatmap density points reflecting real employment clustering in Egypt
export const EGYPT_JOB_HEATMAP_GEOJSON: any = {
  type: "FeatureCollection",
  features: [
    // Greater Cairo Core (Maximum density warm hotspot)
    { type: "Feature", properties: { intensity: 1.0, title: "Cairo Core" }, geometry: { type: "Point", coordinates: [31.2357, 30.0444] } },
    { type: "Feature", properties: { intensity: 0.95, title: "New Cairo" }, geometry: { type: "Point", coordinates: [31.4913, 30.0300] } },
    { type: "Feature", properties: { intensity: 0.9, title: "Nasr City" }, geometry: { type: "Point", coordinates: [31.3450, 30.0626] } },
    { type: "Feature", properties: { intensity: 0.95, title: "Giza & Smart Village" }, geometry: { type: "Point", coordinates: [31.0189, 30.07] } },
    { type: "Feature", properties: { intensity: 0.85, title: "6th of October" }, geometry: { type: "Point", coordinates: [30.9188, 29.9285] } },
    { type: "Feature", properties: { intensity: 0.85, title: "Maadi Tech Hub" }, geometry: { type: "Point", coordinates: [31.2598, 29.9602] } },

    // Alexandria & Coastal Hubs
    { type: "Feature", properties: { intensity: 0.8, title: "Alexandria Coastal" }, geometry: { type: "Point", coordinates: [29.9187, 31.2001] } },
    { type: "Feature", properties: { intensity: 0.7, title: "Alexandria Tech" }, geometry: { type: "Point", coordinates: [29.97, 31.23] } },
    { type: "Feature", properties: { intensity: 0.65, title: "Port Said Maritime" }, geometry: { type: "Point", coordinates: [32.3019, 31.2565] } },
    { type: "Feature", properties: { intensity: 0.6, title: "Suez Canal Logistics" }, geometry: { type: "Point", coordinates: [32.5498, 29.9668] } },
    { type: "Feature", properties: { intensity: 0.55, title: "Ismailia Hub" }, geometry: { type: "Point", coordinates: [32.2743, 30.5965] } },

    // Delta Industrial & Commercial Centers
    { type: "Feature", properties: { intensity: 0.65, title: "Mansoura Delta Tech" }, geometry: { type: "Point", coordinates: [31.3807, 31.0364] } },
    { type: "Feature", properties: { intensity: 0.6, title: "Tanta Commercial" }, geometry: { type: "Point", coordinates: [31.0004, 30.7865] } },
    { type: "Feature", properties: { intensity: 0.55, title: "Zagazig Industrial" }, geometry: { type: "Point", coordinates: [31.5041, 30.5877] } },

    // Upper Egypt & Red Sea
    { type: "Feature", properties: { intensity: 0.5, title: "Asyut University Hub" }, geometry: { type: "Point", coordinates: [31.1837, 27.1810] } },
    { type: "Feature", properties: { intensity: 0.45, title: "Hurghada Remote Hub" }, geometry: { type: "Point", coordinates: [33.8116, 27.2579] } },
    { type: "Feature", properties: { intensity: 0.4, title: "Luxor Heritage" }, geometry: { type: "Point", coordinates: [32.6396, 25.6872] } },
    { type: "Feature", properties: { intensity: 0.4, title: "Aswan Clean Energy" }, geometry: { type: "Point", coordinates: [32.8998, 24.0889] } },
  ],
};
