import React, { useState } from 'react';
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../theme/typography';

interface DebugMapScreenProps {
  onBack: () => void;
}

const CALICUT_COORDINATE = {
  latitude: 11.2588,
  longitude: 75.7804,
};

type MapStatus = 'waiting' | 'ready' | 'loaded';

const DebugMapScreen: React.FC<DebugMapScreenProps> = ({ onBack }) => {
  const [mapKey, setMapKey] = useState(0);
  const [mapStatus, setMapStatus] = useState<MapStatus>('waiting');
  const [markerCoordinate, setMarkerCoordinate] = useState(CALICUT_COORDINATE);

  const retryMap = () => {
    setMapStatus('waiting');
    setMarkerCoordinate(CALICUT_COORDINATE);
    setMapKey(currentKey => currentKey + 1);
  };

  const statusMessage = {
    waiting: 'Waiting for the native map view...',
    ready: 'Native map is ready. Waiting for Google map tiles...',
    loaded: 'Google map tiles loaded. The map integration is working.',
  }[mapStatus];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Google Maps Debug</Text>
        <TouchableOpacity onPress={retryMap} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusPanel}>
        <View style={[styles.statusDot, mapStatus === 'loaded' && styles.statusDotLoaded]} />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>{mapStatus.toUpperCase()}</Text>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          key={mapKey}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          onMapReady={() => setMapStatus('ready')}
          onMapLoaded={() => setMapStatus('loaded')}
          onPress={event => setMarkerCoordinate(event.nativeEvent.coordinate)}
          initialRegion={{
            ...CALICUT_COORDINATE,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          <Marker
            coordinate={markerCoordinate}
            title="Test Marker (Calicut)"
            description="Tap anywhere on the map to move this marker."
          />
        </MapView>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Test instructions</Text>
        <Text style={styles.footerText}>
          Platform: {Platform.OS}
          {"\n"}1. Wait for the status to become LOADED.
          {"\n"}2. Confirm that roads and the test marker appear.
          {"\n"}3. Tap a road and confirm that the marker moves.
          {"\n\n"}If READY remains visible with a blank map, check billing, the enabled Maps SDK, and the API-key restriction for this app.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 5,
    marginRight: 15,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#333',
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryText: {
    color: '#0052FF',
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  statusPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F7FA',
  },
  statusDot: {
    width: 10,
    height: 10,
    marginRight: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  statusDotLoaded: {
    backgroundColor: '#16A34A',
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    color: '#333',
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  statusMessage: {
    color: '#666',
    fontFamily: Fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  map: {
    flex: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  footerTitle: {
    color: '#333',
    fontFamily: Fonts.bold,
    fontSize: 13,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#666',
    lineHeight: 18,
  },
});

export default DebugMapScreen;
