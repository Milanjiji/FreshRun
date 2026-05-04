import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { storage } from './src/utils/storage';
import LoginScreen from './src/screens/LoginScreen';
import SplashScreen from './src/screens/SplashScreen';
import LocationScreen from './src/screens/LocationScreen';
import UserDetailsScreen from './src/screens/UserDetailsScreen';
import HomeScreen from './src/screens/HomeScreen';
import AddressSelectionScreen from './src/screens/AddressSelectionScreen';
import AccountScreen from './src/screens/AccountScreen';
import StoreDetailsScreen from './src/screens/StoreDetailsScreen';
import { Colors } from './src/theme/colors';
import { Fonts } from './src/theme/typography';

function App() {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasLocation, setHasLocation] = useState(false);
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);

  // Check login and location state on start
  useEffect(() => {
    const checkAppState = async () => {
      try {
        // 1. Check Login
        const token = storage.getString('userToken');
        const data = storage.getObject<any>('userData');
        if (token) {
          setUserToken(token);
          setUserData(data);
        }

        // 2. Check Location Data
        const savedLocation = storage.getObject<{ latitude: number; longitude: number }>('locationData');
        
        // 3. Check Location Permission
        let permissionGranted = false;
        if (Platform.OS === 'ios') {
          permissionGranted = !!savedLocation;
        } else {
          permissionGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
        }

        if (savedLocation && permissionGranted) {
          setLocationData(savedLocation);
          setHasLocation(true);
        } else if (savedLocation) {
          setLocationData(savedLocation);
        }
      } catch (e) {
        console.error('Failed to load app state', e);
      } finally {
        setLoading(false);
      }
    };

    checkAppState();
  }, []);

  const handleLoginSuccess = (token: string, user: any) => {
    setUserToken(token);
    setUserData(user);
  };

  const handleLocationSuccess = (location: { latitude: number; longitude: number }) => {
    storage.setItem('locationData', location);
    setLocationData(location);
    setHasLocation(true);
  };

  const handleProfileSuccess = (updatedUser: any) => {
    storage.setItem('userData', updatedUser);
    setUserData(updatedUser);
  };

  const handleBackFromProfile = () => {
    setHasLocation(false);
  };

  const handleLogout = () => {
    storage.removeItem('userToken');
    storage.removeItem('userData');
    storage.removeItem('locationData');
    setUserToken(null);
    setUserData(null);
    setHasLocation(false);
    setLocationData(null);
    setShowAccount(false);
  };

  if (loading) {
    return <SplashScreen />;
  }

  // Determine which screen to show
  const renderContent = () => {
    if (!userToken) {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} role="customer" />;
    }

    if (!hasLocation) {
      return (
        <LocationScreen 
          onLocationSuccess={handleLocationSuccess} 
          existingLocation={locationData}
        />
      );
    }

    if (!userData?.isProfileComplete) {
      return (
        <UserDetailsScreen 
          userData={userData} 
          userToken={userToken} 
          onSuccess={handleProfileSuccess} 
          onBack={handleBackFromProfile}
        />
      );
    }

    if (isSelectingLocation) {
      return (
        <AddressSelectionScreen 
          userData={userData}
          userToken={userToken!}
          onBack={() => setIsSelectingLocation(false)}
          onAddressUpdated={(updatedUser) => {
            setUserData(updatedUser);
            storage.setItem('userData', updatedUser);
          }}
        />
      );
    }

    if (showAccount) {
      return (
        <AccountScreen 
          userData={userData}
          onBack={() => setShowAccount(false)}
          onLogout={handleLogout}
          onSavedAddressPress={() => {
            setShowAccount(false);
            setIsSelectingLocation(true);
          }}
        />
      );
    }

    if (selectedStore) {
      return (
        <StoreDetailsScreen 
          store={selectedStore} 
          onBack={() => setSelectedStore(null)} 
        />
      );
    }

    return (
      <HomeScreen 
        userData={userData} 
        locationData={locationData} 
        onLogout={handleLogout} 
        onAddressPress={() => setIsSelectingLocation(true)}
        onProfilePress={() => setShowAccount(true)}
        onStorePress={(store) => setSelectedStore(store)}
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontWeight: 'bold',
  },
});

export default App;
