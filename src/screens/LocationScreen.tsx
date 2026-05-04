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
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { PageTitle, PageSubtitle } from '../components/Typography';
import { PrimaryButton } from '../components/Button';
import { Fonts } from '../theme/typography';

interface LocationScreenProps {
  onLocationSuccess: (location: { latitude: number; longitude: number }) => void;
  existingLocation?: { latitude: number; longitude: number } | null;
}

const LocationScreen: React.FC<LocationScreenProps> = ({ onLocationSuccess, existingLocation }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedLocation, setFetchedLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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
        <View style={styles.content}>
          <Image 
            source={require('../assets/earth.png')} 
            style={styles.pinImage}
            resizeMode="contain"
          />
          
          <View style={styles.textContainer}>
            <PageTitle style={styles.title}>Confirm your location</PageTitle>
            <PageSubtitle style={styles.subtitle}>
              {loading 
                ? "Finding your exact location..." 
                : fetchedLocation 
                  ? `Location found: ${fetchedLocation.latitude.toFixed(4)}, ${fetchedLocation.longitude.toFixed(4)}`
                  : "We need your location to show stores near you."}
            </PageSubtitle>
          </View>

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
            onPress={getLocation}
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pinImage: {
    width: 180,
    height: 180,
    marginBottom: 30,
  },
  textContainer: {
    alignItems: 'center',
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
