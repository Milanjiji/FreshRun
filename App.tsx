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
import PaymentScreen from './src/screens/PaymentScreen';
import OrderConfirmingScreen from './src/screens/OrderConfirmingScreen';
import OrderTrackingScreen from './src/screens/OrderTrackingScreen';
import OrderDeclinedScreen from './src/screens/OrderDeclinedScreen';
import CartFooter from './src/components/CartFooter';
import ActiveOrderWidget from './src/components/ActiveOrderWidget';

import { Colors } from './src/theme/colors';
import { Fonts } from './src/theme/typography';
import { API_BASE_URL } from './src/config/api';

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
  const [showPayment, setShowPayment] = useState(false);
  const [showOrderConfirming, setShowOrderConfirming] = useState(false);
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [showOrderDeclined, setShowOrderDeclined] = useState(false);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [activeOrderTimestamp, setActiveOrderTimestamp] = useState<number | null>(null);
  const [checkoutTotalAmount, setCheckoutTotalAmount] = useState<number>(0);

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
        if (token && data && data.id) {
          setUserToken(token);
          setUserData(data);

          // Restore active order if it exists and hasn't expired
          const savedOrderId = storage.getString(`activeOrderId_${data.id}`);
          const savedOrderTs = storage.getNumber(`activeOrderTimestamp_${data.id}`);
          
          if (savedOrderId && savedOrderTs) {
            const elapsed = Math.floor((Date.now() - savedOrderTs) / 1000);
            if (elapsed < 1200) {
              setOrderId(savedOrderId);
              setActiveOrderTimestamp(savedOrderTs);
            } else {
              storage.removeItem(`activeOrderId_${data.id}`);
              storage.removeItem(`activeOrderTimestamp_${data.id}`);
            }
          }
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

  // Sync active order with the backend every 20 seconds
  useEffect(() => {
    let interval: any;
    if (userToken && userData?.id) {
      const fetchActiveOrder = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/orders/active`, {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          const data = await res.json();
          if (data.success && data.order) {
            setActiveOrder(data.order);
            setOrderId(data.order.id);
            const ts = new Date(data.order.created_at).getTime();
            setActiveOrderTimestamp(ts);
            // Backup locally
            storage.setItem(`activeOrderId_${userData.id}`, data.order.id);
            storage.setItem(`activeOrderTimestamp_${userData.id}`, ts);
          } else if (data.success && !data.order) {
            // Order is completed or no active order exists
            setActiveOrder(null);
            setOrderId(null);
            setActiveOrderTimestamp(null);
            storage.removeItem(`activeOrderId_${userData.id}`);
            storage.removeItem(`activeOrderTimestamp_${userData.id}`);
          }
        } catch (e) {
          console.error('Error syncing active order:', e);
        }
      };

      // Fetch immediately on login/mount
      fetchActiveOrder();

      // Poll every 20 seconds
      interval = setInterval(fetchActiveOrder, 20000);
    }
    return () => clearInterval(interval);
  }, [userToken, userData]);

  const handleLoginSuccess = (token: string, user: any) => {
    setUserToken(token);
    setUserData(user);
    
    if (user && user.id) {
      const savedOrderId = storage.getString(`activeOrderId_${user.id}`);
      const savedOrderTs = storage.getNumber(`activeOrderTimestamp_${user.id}`);
      if (savedOrderId && savedOrderTs) {
        const elapsed = Math.floor((Date.now() - savedOrderTs) / 1000);
        if (elapsed < 1200) {
          setOrderId(savedOrderId);
          setActiveOrderTimestamp(savedOrderTs);
        } else {
          storage.removeItem(`activeOrderId_${user.id}`);
          storage.removeItem(`activeOrderTimestamp_${user.id}`);
        }
      }
    }
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
    setOrderId(null);
    setActiveOrderTimestamp(null);
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
          onBack={isAddingNewAddress ? () => {
            setIsAddingNewAddress(false);
            setHasLocation(true);
            setIsSelectingLocation(true);
          } : undefined}
        />
      );
    }

    if (!userData?.isProfileComplete || isAddingNewAddress) {
      return (
        <UserDetailsScreen 
          userData={isAddingNewAddress ? null : userData} 
          userToken={userToken} 
          locationData={locationData}
          isAddingNewAddress={isAddingNewAddress}
          onSuccess={(updatedUser: any) => {
            setIsAddingNewAddress(false);
            handleProfileSuccess(updatedUser);
          }} 
          onBack={() => {
            if (isAddingNewAddress) {
              setIsAddingNewAddress(false);
              setIsSelectingLocation(true);
            } else {
              handleBackFromProfile();
            }
          }}
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
          onAddNewAddress={() => {
            setIsSelectingLocation(false);
            setHasLocation(false);
            setIsAddingNewAddress(true);
          }}
          onUseCurrentLocation={() => {
            setIsSelectingLocation(false);
            setHasLocation(false);
            setIsAddingNewAddress(true);
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

    if (showOrderDeclined) {
      return (
        <OrderDeclinedScreen 
          onBack={async () => {
            setShowOrderDeclined(false);
            if (orderId && userToken) {
              try {
                // Acknowledge decline by marking it completed
                await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                  method: 'PATCH',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                  },
                  body: JSON.stringify({ is_completed: true })
                });
                
                // Clear local state
                setActiveOrder(null);
                setOrderId(null);
                setActiveOrderTimestamp(null);
                if (userData) {
                  storage.removeItem(`activeOrderId_${userData.id}`);
                  storage.removeItem(`activeOrderTimestamp_${userData.id}`);
                }
              } catch (e) {
                console.error("Failed to acknowledge declined order", e);
              }
            }
          }}
        />
      );
    }

    if (showOrderTracking) {
      return (
        <OrderTrackingScreen 
          orderId={orderId}
          activeOrder={activeOrder}
          locationData={locationData}
          onHome={() => {
            setShowOrderTracking(false);
            // We NO LONGER clear orderId or cart here so the active order widget can show
          }}
        />
      );
    }

    if (showOrderConfirming) {
      return (
        <OrderConfirmingScreen
          cartItems={cartItems}
          totalAmount={checkoutTotalAmount}
          userData={userData}
          userToken={userToken}
          onSuccess={(id) => {
            setOrderId(id);
            const ts = Date.now();
            setActiveOrderTimestamp(ts);
            
            if (userData && userData.id) {
              storage.setItem(`activeOrderId_${userData.id}`, id);
              storage.setItem(`activeOrderTimestamp_${userData.id}`, ts);
            }
            
            setShowOrderConfirming(false);
            setShowOrderTracking(true);
            clearCart();
          }}
          onFailure={() => {
            setShowOrderConfirming(false);
            setShowPayment(true);
          }}
        />
      );
    }

    if (showPayment) {
      return (
        <PaymentScreen 
          cartItems={cartItems}
          totalAmount={checkoutTotalAmount}
          userData={userData}
          userToken={userToken}
          onBack={() => setShowPayment(false)}
          onOrderConfirmed={() => {
            setShowPayment(false);
            setShowCart(false);
            setShowOrderConfirming(true);
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
          onProceedToCheckout={(total) => {
            setCheckoutTotalAmount(total);
            setShowPayment(true);
          }}
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
        
        {/* Active Order Widget (Floats globally if order is active and we are not on the tracking screen) */}
        {orderId && !showOrderTracking && !showOrderDeclined && (
          <ActiveOrderWidget 
            onPress={() => {
              if (activeOrder?.status === 'declined') {
                setShowOrderDeclined(true);
              } else {
                setShowOrderTracking(true);
              }
            }} 
            timestamp={activeOrderTimestamp}
            status={activeOrder?.status}
          />
        )}
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
