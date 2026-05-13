import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Coordinate {
  lat: number;
  lng: number;
}

interface LiveMapProps {
  storeLocation: Coordinate;
  userLocation: Coordinate;
}

const LiveMap: React.FC<LiveMapProps> = ({ storeLocation, userLocation }) => {
  const webViewRef = useRef<WebView>(null);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; }
        html, body, #map { height: 100%; width: 100%; }
        /* Custom markers styling */
        .store-icon {
          background-color: #3b82f6; /* Blue for store */
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          font-weight: bold;
          font-family: sans-serif;
        }
        .home-icon {
          background-color: #22c55e; /* Green for home */
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          font-weight: bold;
          font-family: sans-serif;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        // Wait for Leaflet to load
        document.addEventListener('DOMContentLoaded', () => {
          const storeLoc = [${storeLocation.lat}, ${storeLocation.lng}];
          const userLoc = [${userLocation.lat}, ${userLocation.lng}];

          // Initialize map without zoom controls for cleaner UI
          const map = L.map('map', { zoomControl: false }).setView(storeLoc, 13);

          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
          }).addTo(map);

          // Create custom SVG icons
          const storeHtml = '<div style="width: 100%; height: 100%;" class="store-icon">S</div>';
          const homeHtml = '<div style="width: 100%; height: 100%;" class="home-icon">H</div>';

          const storeIcon = L.divIcon({ html: storeHtml, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
          const homeIcon = L.divIcon({ html: homeHtml, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });

          // Add markers
          const storeMarker = L.marker(storeLoc, { icon: storeIcon }).addTo(map);
          const homeMarker = L.marker(userLoc, { icon: homeIcon }).addTo(map);

          // Draw a dashed line between them
          const latlngs = [storeLoc, userLoc];
          const polyline = L.polyline(latlngs, {
            color: '#10b981',
            weight: 4,
            dashArray: '10, 10'
          }).addTo(map);

          // Fit map bounds to show both markers with some padding
          const bounds = L.latLngBounds([storeLoc, userLoc]);
          map.fitBounds(bounds, { padding: [50, 50] });
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={true}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#e0e0e0', // Placeholder color while loading
  },
});

export default LiveMap;
