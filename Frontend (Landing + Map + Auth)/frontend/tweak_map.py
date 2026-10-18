import sys
import re

file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\InteractiveMap.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Base Color (Cyan -> Electric Cyan)
content = content.replace('93, 230, 255', '0, 229, 255')

# Replace Highlight Color (Green -> Neon Pink)
content = content.replace('rgba(78, 222, 163', 'rgba(255, 42, 122')
content = content.replace('#4edea3', '#ff2a7a')

# Apply a CSS filter to the map container to tint the basemap purple
# Let's add paint properties to the raster layer
raster_layer = """            {
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
            }"""
content = re.sub(
    r'\{\s*id:\s*"esri-dark-layer",\s*type:\s*"raster",\s*source:\s*"esri-dark",\s*minzoom:\s*0,\s*maxzoom:\s*19,?\s*\}',
    raster_layer,
    content
)

# Popup styles
content = content.replace('rgba(93,230,255,0.3)', 'rgba(255,42,122,0.5)')
content = content.replace('color: #5de6ff', 'color: #ff2a7a')


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Map tweaked')
