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
import CartScreen from './src/screens/CartScreen';
import CartFooter from './src/components/CartFooter';

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
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Cart logic
  const addToCart = (product: any) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      let newCart;
      if (existing) {
        newCart = prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        newCart = [...prev, { ...product, quantity: 1 }];
      }
      storage.setItem('cartItems', newCart);
      return newCart;
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prev => {
      const newCart = prev.map(item => {
        if (item.id === id) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0);
      storage.setItem('cartItems', newCart);
      return newCart;
    });
  };

  const clearCart = () => {
    storage.removeItem('cartItems');
    setCartItems([]);
  };

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Update to use discounted price for footer total
  const cartTotalPrice = cartItems.reduce((sum, item) => {
    const discount = item.discount_percent || 0;
    const discountedPrice = item.price * (1 - discount / 100);
    return sum + (discountedPrice * item.quantity);
  }, 0);

  const lastItemImage = cartItems.length > 0 ? cartItems[cartItems.length - 1].image_url : undefined;



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

        // 4. Load Cart
        const savedCart = storage.getObject<any[]>('cartItems');
        if (savedCart) {
          setCartItems(savedCart);
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

    if (showCart) {
      return (
        <CartScreen 
          cartItems={cartItems}
          onBack={() => setShowCart(false)}
          updateQuantity={updateQuantity}
          clearCart={clearCart}
          locationAddress={userData?.address?.line1}
        />
      );
    }

    return (
      <View style={{ flex: 1 }}>
        {selectedStore ? (
          <StoreDetailsScreen 
            store={selectedStore} 
            onBack={() => setSelectedStore(null)} 
            addToCart={addToCart}
            cartItems={cartItems}
            updateQuantity={updateQuantity}
          />
        ) : (
          <HomeScreen 
            userData={userData} 
            locationData={locationData} 
            onLogout={handleLogout} 
            onAddressPress={() => setIsSelectingLocation(true)}
            onProfilePress={() => setShowAccount(true)}
            onStorePress={(store) => setSelectedStore(store)}
          />
        )}
        <CartFooter 
          itemCount={cartItemCount} 
          totalPrice={cartTotalPrice} 
          onPress={() => setShowCart(true)} 
          lastItemImage={lastItemImage}
        />
      </View>
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
