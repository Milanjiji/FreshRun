import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  PermissionsAndroid,
  Image,
  Animated,
} from 'react-native';
import { useRef } from 'react';
import { WebView } from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
import { PageTitle, PageSubtitle } from '../components/Typography';
import { PrimaryButton } from '../components/Button';
import { Fonts } from '../theme/typography';

interface LocationScreenProps {
  onLocationSuccess: (location: { latitude: number; longitude: number }) => void;
  existingLocation?: { latitude: number; longitude: number } | null;
  onBack?: () => void;
}

const LocationScreen: React.FC<LocationScreenProps> = ({ onLocationSuccess, existingLocation, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedLocation, setFetchedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  const transitionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (fetchedLocation) {
      Animated.timing(transitionAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(transitionAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [fetchedLocation]);

  const translateY = transitionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -140],
  });

  const scale = transitionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.4],
  });

  const mapOpacity = transitionAnim.interpolate({
    inputRange: [0.6, 1],
    outputRange: [0, 1],
  });

  const mapScale = transitionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  const getMapHtml = (lat: number, lng: number) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; }
          .leaflet-control-attribution { display: none; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            touchZoom: true,
            doubleClickZoom: true,
            dragging: true,
            zoomAnimation: true
          }).setView([${lat}, ${lng}], 16);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
          
          map.on('move', function(e) {
            var center = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              lat: center.lat,
              lng: center.lng,
              isManual: e.originalEvent !== undefined
            }));
          });
        </script>
      </body>
    </html>
  `;

  const [mapReady, setMapReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasUserMovedMap, setHasUserMovedMap] = useState(false);
  const initialMapLocation = useRef<{lat: number, lng: number} | null>(null);
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    if (fetchedLocation && !initialMapLocation.current) {
      initialMapLocation.current = { lat: fetchedLocation.latitude, lng: fetchedLocation.longitude };
      setMapReady(true);
    }
  }, [fetchedLocation]);

  const handleRefresh = () => {
    initialMapLocation.current = null;
    setMapReady(false);
    setHasUserMovedMap(false);
    setRefreshKey(prev => prev + 1);
    getLocation();
  };

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.lat && data.lng) {
        if (data.isManual) {
          setHasUserMovedMap(true);
        }
        // Only update the coordinate display, don't trigger a WebView source refresh
        setFetchedLocation({ latitude: data.lat, longitude: data.lng });
      }
    } catch (e) {
      console.error("Map Message Error:", e);
    }
  };

  useEffect(() => {
    if (mapReady && fetchedLocation && !hasUserMovedMap && webviewRef.current) {
      const js = `
        if (typeof map !== 'undefined') {
          map.setView([${fetchedLocation.latitude}, ${fetchedLocation.longitude}], 16);
        }
      `;
      webviewRef.current.injectJavaScript(js);
    }
  }, [fetchedLocation, mapReady]);

  useEffect(() => {
    // If we have an existing location from storage, treat it as "fetched" initially
    if (existingLocation) {
      setFetchedLocation(existingLocation);
    }
  }, [existingLocation]);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      // iOS permission is handled by the library when calling getCurrentPosition
      return true;
    }

    try {
      // Check if already granted first
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (alreadyGranted) {
        return true;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'FreshRun needs access to your location to find the best results nearby.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  useEffect(() => {
    const checkAndAutoFetch = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted) {
          getLocation();
        }
      } else {
        // On iOS, calling getCurrentPosition will trigger the prompt if not yet asked,
        // but if already granted it will just return the location.
        // We'll wait a brief moment to ensure UI is ready.
        setTimeout(() => {
          getLocation();
        }, 500);
      }
    };

    checkAndAutoFetch();
  }, []);

  const getLocation = async () => {
    setLoading(true);
    setError(null);

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setError('Location permission denied');
      setLoading(false);
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Location obtained:', latitude, longitude);
        setFetchedLocation({ latitude, longitude });
        setLoading(false);
      },
      (err) => {
        console.error('Location Error:', err);
        setError(err.message || 'Could not fetch location');
        setLoading(false);
        Alert.alert('Location Error', 'Unable to fetch your location. Please ensure GPS is enabled.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.content}>
          <Animated.View style={[
            styles.animatedContainer,
            { transform: [{ translateY }, { scale }] }
          ]}>
            <Image 
              source={require('../assets/earth.png')} 
              style={styles.pinImage}
              resizeMode="contain"
            />
          </Animated.View>
          
          {mapReady && initialMapLocation.current && (
            <Animated.View style={[
              styles.mapWrapper,
              { opacity: mapOpacity, transform: [{ scale: mapScale }] }
            ]}>
              <WebView
                ref={webviewRef}
                key={`map-${refreshKey}`}
                style={styles.map}
                originWhitelist={['*']}
                source={{ html: getMapHtml(initialMapLocation.current.lat, initialMapLocation.current.lng) }}
                scrollEnabled={true}
                onMessage={handleMapMessage}
              />
              <View style={styles.centerMarkerContainer} pointerEvents="none">
                <View style={styles.centerMarker} />
                <View style={styles.centerMarkerStem} />
              </View>
            </Animated.View>
          )}

          <Animated.View style={[
            styles.textContainer,
            { 
              opacity: transitionAnim.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0] }),
              height: transitionAnim.interpolate({ inputRange: [0, 0.4], outputRange: [120, 0], extrapolate: 'clamp' })
            }
          ]}>
            <PageTitle style={styles.title}>Confirm your location</PageTitle>
            <PageSubtitle style={styles.subtitle}>
              {loading 
                ? "Finding your exact location..." 
                : "We need your location to show stores near you."}
            </PageSubtitle>
          </Animated.View>

          {fetchedLocation && (
            <Animated.View style={[
              styles.locationInfo,
              { opacity: mapOpacity }
            ]}>
              <Text style={styles.locationFoundTitle}>Location Pinpointed</Text>
              <Text style={styles.coordinatesText}>
                {fetchedLocation.latitude.toFixed(4)}, {fetchedLocation.longitude.toFixed(4)}
              </Text>
            </Animated.View>
          )}

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <PrimaryButton 
            title={loading ? "Finding..." : fetchedLocation ? "Confirm & Proceed" : "Find My Location"}
            onPress={fetchedLocation && !loading ? () => onLocationSuccess(fetchedLocation) : getLocation}
            loading={loading}
          />
          
          <TouchableOpacity 
            style={styles.linkButton} 
            onPress={handleRefresh}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              {fetchedLocation ? "Not your location? Refresh" : "Try again"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    zIndex: 10,
  },
  backArrow: {
    fontSize: 28,
    color: '#000',
    fontFamily: Fonts.bold,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  animatedContainer: {
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinImage: {
    width: 180,
    height: 180,
  },
  mapWrapper: {
    position: 'absolute',
    width: '115%',
    height: '60%',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#eee',
    top: '25%',
  },
  map: {
    flex: 1,
  },
  centerMarkerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#5D3FD3',
    borderWidth: 3,
    borderColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  centerMarkerStem: {
    width: 2,
    height: 10,
    backgroundColor: '#5D3FD3',
    marginTop: -1,
  },
  locationInfo: {
    marginTop: '65%',
    alignItems: 'center',
  },
  locationFoundTitle: {
    fontSize: 20,
    fontFamily: Fonts.black,
    color: '#333',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: '#666',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
    overflow: 'hidden',
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 24,
    color: '#333',
  },
  errorText: {
    color: '#FF3B30',
    fontFamily: Fonts.medium,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  linkButton: {
    padding: 10,
  },
  linkText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#5D3FD3',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});

export default LocationScreen;
