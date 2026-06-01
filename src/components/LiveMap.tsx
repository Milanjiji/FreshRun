import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../theme/colors';
import Icon from 'react-native-vector-icons/Ionicons';

interface Coordinate {
  lat: number;
  lng: number;
}

interface LiveMapProps {
  storeLocation: Coordinate;
  userLocation: Coordinate;
  driverLocation?: Coordinate | null;
}

const LiveMap: React.FC<LiveMapProps> = ({ storeLocation, userLocation, driverLocation }) => {
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);

  const fitMapToMarkers = useCallback(() => {
    if (!mapReady || !mapRef.current) {
      return;
    }

    const coords = [
      { latitude: storeLocation.lat, longitude: storeLocation.lng },
      { latitude: userLocation.lat, longitude: userLocation.lng },
    ];

    if (driverLocation) {
      coords.push({ latitude: driverLocation.lat, longitude: driverLocation.lng });
    }

    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 100, right: 80, bottom: 100, left: 80 },
      animated: true,
    });
  }, [
    driverLocation,
    mapReady,
    storeLocation.lat,
    storeLocation.lng,
    userLocation.lat,
    userLocation.lng,
  ]);

  useEffect(() => {
    fitMapToMarkers();
  }, [fitMapToMarkers]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        onMapReady={() => setMapReady(true)}
        initialRegion={{
          latitude: storeLocation.lat,
          longitude: storeLocation.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Store Marker */}
        <Marker
          coordinate={{ latitude: storeLocation.lat, longitude: storeLocation.lng }}
          title="Store"
          pinColor={Colors.secondary}
        />

        {/* Customer Marker */}
        <Marker
          coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
          title="Your Location"
          pinColor={Colors.primary}
        />

        {/* Driver Marker */}
        {driverLocation && (
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="Delivery Partner"
          >
            <View style={styles.driverMarker}>
              <Icon name="bicycle" size={20} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Route Line (Dashed) */}
        <Polyline
          coordinates={[
            { latitude: storeLocation.lat, longitude: storeLocation.lng },
            { latitude: userLocation.lat, longitude: userLocation.lng }
          ]}
          strokeColor={Colors.primary}
          strokeWidth={3}
          lineDashPattern={[10, 10]}
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  driverMarker: {
    backgroundColor: '#0066FF',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5,
  }
});

export default LiveMap;
