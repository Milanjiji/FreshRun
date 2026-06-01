import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { Colors } from '../theme/colors';
import Icon from 'react-native-vector-icons/Ionicons';

const GOOGLE_MAPS_APIKEY = 'AIzaSyC1s78p6_QNfF7eoMbKnMcu5wLqOdLyN9g';

interface Coordinate {
  lat: number;
  lng: number;
}

interface LiveMapProps {
  storeLocation: Coordinate;
  userLocation: Coordinate;
  driverLocation?: Coordinate | null;
  orderStatus?: string;
}

const LiveMap: React.FC<LiveMapProps> = ({ 
  storeLocation, 
  userLocation, 
  driverLocation,
  orderStatus 
}) => {
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [directionsOrigin, setDirectionsOrigin] = useState<Coordinate | null>(null);
  const lastDirectionsUpdate = useRef<number>(0);

  // Update directions origin only every 2 minutes or on status change
  useEffect(() => {
    if (driverLocation) {
      const now = Date.now();
      const isOutForDelivery = orderStatus === 'out_for_delivery';
      
      // If we just entered "out_for_delivery", update immediately
      if (isOutForDelivery && (!directionsOrigin || now - lastDirectionsUpdate.current > 120000)) {
        setDirectionsOrigin(driverLocation);
        lastDirectionsUpdate.current = now;
      }
    }
  }, [driverLocation, orderStatus, directionsOrigin]);

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

  const isOutForDelivery = orderStatus === 'out_for_delivery';

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

        {/* Real-time Directions Route (Throttled) */}
        {directionsOrigin || (storeLocation && userLocation) ? (
          <MapViewDirections
            origin={
              isOutForDelivery && directionsOrigin 
                ? { latitude: directionsOrigin.lat, longitude: directionsOrigin.lng }
                : { latitude: storeLocation.lat, longitude: storeLocation.lng }
            }
            destination={{ latitude: userLocation.lat, longitude: userLocation.lng }}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={4}
            strokeColor={Colors.primary}
            lineDashPattern={isOutForDelivery ? undefined : [10, 10]}
            onReady={result => {
              console.log(`[LiveMap] Dist: ${result.distance}km, Dur: ${result.duration}min`);
            }}
            onError={(errorMessage) => {
              console.log('[LiveMap] Directions Error:', errorMessage);
            }}
          />
        ) : null}
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
