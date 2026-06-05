import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { PageTitle, PageSubtitle } from '../components/Typography';
import { PrimaryButton } from '../components/Button';
import LocationDisclosureModal from '../components/LocationDisclosureModal';
import { Fonts } from '../theme/typography';

const DEFAULT_LOCATION = {
  latitude: 11.2588,
  longitude: 75.7804,
};

const QUICK_LOCATION_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 60000,
};

const PRECISE_LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 25000,
  maximumAge: 10000,
};

const getCurrentPosition = (
  options: { enableHighAccuracy: boolean; timeout: number; maximumAge: number }
) =>
  new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({ latitude, longitude });
      },
      reject,
      options
    );
  });

interface LocationScreenProps {
  onLocationSuccess: (location: { latitude: number; longitude: number }) => void;
  existingLocation?: { latitude: number; longitude: number } | null;
  onBack?: () => void;
}

const LocationScreen: React.FC<LocationScreenProps> = ({ onLocationSuccess, existingLocation, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [fetchedLocation, setFetchedLocation] = useState<{ latitude: number; longitude: number }>(
    existingLocation ?? DEFAULT_LOCATION
  );
  const [canConfirmLocation, setCanConfirmLocation] = useState(Boolean(existingLocation));
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<MapView>(null);
  const autoFetchStartedRef = useRef(false);
  const userMovedMapRef = useRef(false);
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
  }, [fetchedLocation, transitionAnim]);

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

  const hasLocationPermission = useCallback(async () => {
    if (Platform.OS === 'ios') {
      return true;
    }

    const hasFineLocation = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    const hasCoarseLocation = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
    );

    return hasFineLocation || hasCoarseLocation;
  }, []);

  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === 'ios') {
      // iOS permission is handled by the library when calling getCurrentPosition
      return true;
    }

    try {
      const alreadyGranted = await hasLocationPermission();
      if (alreadyGranted) {
        return true;
      }

      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'FreshRun needs access to your location to find the best results nearby.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (await hasLocationPermission()) {
        return true;
      }

      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
      return hasLocationPermission();
    } catch (err) {
      console.warn(err);
      return false;
    }
  }, [hasLocationPermission]);

  const animateToLocation = useCallback((location: { latitude: number; longitude: number }) => {
    mapRef.current?.animateToRegion({
      ...location,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 350);
  }, []);

  const applyResolvedLocation = useCallback((location: { latitude: number; longitude: number }) => {
    console.log('Location obtained:', location.latitude, location.longitude);
    setFetchedLocation(location);
    setCanConfirmLocation(true);
    setError(null);
    if (mapReady) {
      animateToLocation(location);
    }
  }, [animateToLocation, mapReady]);

  const proceedWithLocationFetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const location = await getCurrentPosition(QUICK_LOCATION_OPTIONS);
      applyResolvedLocation(location);
    } catch (quickError) {
      console.warn('Quick location fetch failed, trying precise GPS:', quickError);

      try {
        const location = await getCurrentPosition(PRECISE_LOCATION_OPTIONS);
        applyResolvedLocation(location);
      } catch (preciseError: any) {
        console.error('Location Error:', preciseError);
        setError('GPS timed out. Move the map pin to your location, or tap Try again.');
        setCanConfirmLocation(current => current || Boolean(existingLocation));
        Alertt.alert('Location Error', 'GPS timed out. You can move the map pin manually or try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [applyResolvedLocation, existingLocation]);

  const getLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    const hasPermission = await hasLocationPermission();
    if (!hasPermission) {
      setLoading(false);
      setShowDisclosure(true);
      return;
    }

    proceedWithLocationFetch();
  }, [hasLocationPermission, proceedWithLocationFetch]);

  const handleDisclosureAccept = async () => {
    setShowDisclosure(false);
    setLoading(true);
    const granted = await requestLocationPermission();
    if (!granted) {
      setError('Location permission denied');
      setLoading(false);
      return;
    }
    proceedWithLocationFetch();
  };

  const handleDisclosureDecline = () => {
    setShowDisclosure(false);
    setError('Location permission is required to detect your location. You can still move the map pin manually.');
  };

  useEffect(() => {
    // If we have an existing location from storage, treat it as "fetched" initially.
    if (existingLocation) {
      setFetchedLocation(existingLocation);
      setCanConfirmLocation(true);
    }
  }, [existingLocation]);

  useEffect(() => {
    const checkAndAutoFetch = async () => {
      if (autoFetchStartedRef.current) {
        return;
      }
      autoFetchStartedRef.current = true;

      if (Platform.OS === 'android') {
        const granted = await hasLocationPermission();
        if (granted) {
          getLocation();
        }
      } else {
        // iOS remains on the default native map provider until native Google Maps is configured.
        setTimeout(() => {
          getLocation();
        }, 500);
      }
    };

    checkAndAutoFetch();
  }, [getLocation, hasLocationPermission]);

  const handleRegionChangeComplete = (region: Region) => {
    setFetchedLocation({
      latitude: region.latitude,
      longitude: region.longitude,
    });
    if (userMovedMapRef.current) {
      setCanConfirmLocation(true);
      setError(null);
    }
  };

  const handleMapPress = (coordinate: { latitude: number; longitude: number }) => {
    userMovedMapRef.current = true;
    setFetchedLocation(coordinate);
    setCanConfirmLocation(true);
    setError(null);
    animateToLocation(coordinate);
  };

  const handleConfirmLocation = () => {
    if (!canConfirmLocation) {
      setError('Move the map pin to your location before confirming.');
      return;
    }

    onLocationSuccess(fetchedLocation);
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
          
          <Animated.View style={[
            styles.mapWrapper,
            { opacity: mapOpacity, transform: [{ scale: mapScale }] }
          ]}>
            <MapView
              ref={mapRef}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              style={styles.map}
              initialRegion={{
                ...fetchedLocation,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onMapReady={() => {
                setMapReady(true);
                animateToLocation(fetchedLocation);
              }}
              onPanDrag={() => {
                userMovedMapRef.current = true;
              }}
              onPress={event => handleMapPress(event.nativeEvent.coordinate)}
              onRegionChangeComplete={handleRegionChangeComplete}
            />
            <View style={styles.centerMarkerContainer} pointerEvents="none">
              <View style={styles.centerMarker} />
              <View style={styles.centerMarkerStem} />
            </View>
          </Animated.View>

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

          <Animated.View style={[
            styles.locationInfo,
            { opacity: mapOpacity }
          ]}>
            <Text style={styles.locationFoundTitle}>
              {canConfirmLocation ? 'Location Selected' : 'Move Map Pin'}
            </Text>
            <Text style={styles.coordinatesText}>
              {fetchedLocation.latitude.toFixed(4)}, {fetchedLocation.longitude.toFixed(4)}
            </Text>
          </Animated.View>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>

      <View style={styles.buttonContainer}>
          <PrimaryButton 
            title={loading ? "Finding..." : canConfirmLocation ? "Confirm & Proceed" : "Find My Location"}
            onPress={canConfirmLocation ? handleConfirmLocation : getLocation}
            loading={loading}
          />
          
          <TouchableOpacity 
            style={styles.linkButton} 
            onPress={getLocation}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              {fetchedLocation ? "Not your location? Refresh" : "Try again"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <LocationDisclosureModal 
        visible={showDisclosure} 
        onAccept={handleDisclosureAccept} 
        onDecline={handleDisclosureDecline} 
      />
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

});

export default LocationScreen;
