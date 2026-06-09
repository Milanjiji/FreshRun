import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  AppState,
  PermissionsAndroid,
} from 'react-native';
import io from 'socket.io-client';
import messaging from '@react-native-firebase/messaging';
import Icon from 'react-native-vector-icons/Ionicons';
import { storage } from './src/utils/storage';
import {
  requestNotificationPermission, 
  createNotificationChannels, 
  registerFCMToken, 
  setupFCMListeners 
} from './src/utils/notifications';
import LoginScreen from './src/screens/LoginScreen';
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
import InfoScreen, { InfoType } from './src/screens/InfoScreen';
import LoadingTransition from './src/components/LoadingTransition';
import { Alertt, CustomAlert } from './src/components/Alertt';
import CartFooter from './src/components/CartFooter';
import ActiveOrderWidget from './src/components/ActiveOrderWidget';

import { Colors } from './src/theme/colors';
import { Fonts } from './src/theme/typography';
import { API_BASE_URL } from './src/config/api';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import auth from '@react-native-firebase/auth';
import appCheck from '@react-native-firebase/app-check';

// Initialize App Check
const rnfbProvider = appCheck().newReactNativeFirebaseAppCheckProvider();
rnfbProvider.configure({
  android: {
    provider: 'playIntegrity',
  },
  apple: {
    provider: 'deviceCheck',
  },
});

appCheck().initializeAppCheck({
  provider: rnfbProvider,
  isTokenAutoRefreshEnabled: true,
});
// App Check is separate from Firebase Auth phone-number app verification.

function App() {

  const [userToken, setUserToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Update locationData whenever userData changes (e.g. address switch)
  useEffect(() => {
    console.log('[DEBUG-App] userData changed. currentAddressId:', userData?.currentAddressId);
    if (userData?.currentAddressLatitude && userData?.currentAddressLongitude) {
      const newLoc = {
        latitude: parseFloat(userData.currentAddressLatitude),
        longitude: parseFloat(userData.currentAddressLongitude),
        isFromAddress: true,
        addressId: userData.currentAddressId
      };
      console.log('[DEBUG-App] SETTING LOCATION FROM ADDRESS:', {
        name: userData.addressLine,
        lat: newLoc.latitude,
        lng: newLoc.longitude
      });
      setLocationData(newLoc);
    } else {
      console.log('[DEBUG-App] userData has no address coordinates. Falling back to GPS or previous state.');
    }
  }, [userData?.id, userData?.currentAddressId, userData?.currentAddressLatitude, userData?.currentAddressLongitude]);

  // Firebase Auth & Token Refresh Logic
  useEffect(() => {
    const unsubscribe = auth().onIdTokenChanged(async (user) => {
      console.log('[Auth] ID Token changed or user state changed');
      if (user) {
        // User is signed in or token refreshed
        try {
          const idToken = await user.getIdToken();
          console.log('[Auth] New ID Token acquired');
          
          setUserToken(idToken);
          storage.setItem('userToken', idToken);
          
          // Re-load userData from storage if it exists
          const currentData = storage.getObject<any>('userData');
          if (currentData) {
            setUserData(currentData);
            if (currentData.currentAddressId || currentData.addressLine) {
              setHasLocation(true);
              // Populate locationData from user's saved address if available
              if (currentData.currentAddressLatitude && currentData.currentAddressLongitude) {
                setLocationData({
                  latitude: parseFloat(currentData.currentAddressLatitude),
                  longitude: parseFloat(currentData.currentAddressLongitude)
                });
              }
            }
          }
        } catch (e) {
          console.error('[Auth] Error getting ID token:', e);
        }
      } else {
        // User is signed out
        console.log('[Auth] User is signed out');
        setUserToken(null);
        setUserData(null);
        storage.removeItem('userToken');
        storage.removeItem('userData');
      }
    });

    return unsubscribe;
  }, []);

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
  const [showInfo, setShowInfo] = useState<InfoType | null>(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [selectedTrackingOrderId, setSelectedTrackingOrderId] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [activeOrderTimestamp, setActiveOrderTimestamp] = useState<number | null>(null);
  const [checkoutTotalAmount, setCheckoutTotalAmount] = useState<number>(0);
  const [checkoutDeliveryFee, setCheckoutDeliveryFee] = useState<number>(0);
  const [checkoutDeliveryTip, setCheckoutDeliveryTip] = useState<number>(0);
  const [checkoutLateNightFee, setCheckoutLateNightFee] = useState<number>(0);
  const [checkoutRainyFee, setCheckoutRainyFee] = useState<number>(0);
  const [checkoutIsSelfPickup, setCheckoutIsSelfPickup] = useState<boolean>(false);
  const [checkoutPaymentMode, setCheckoutPaymentMode] = useState<'cod' | 'online'>('cod');
  const [appSettings, setAppSettings] = useState<any>(null);

  // Fetch Global App Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/settings`);
        const data = await res.json();
        if (data.success) setAppSettings(data.data);
      } catch (e) {
        console.warn('Failed to fetch settings in App.tsx');
      }
    };
    fetchSettings();
  }, []);

  // FCM Setup
  useEffect(() => {
    if (userToken && userData?.id) {
      const initFCM = async () => {
        try {
          const hasPermission = await requestNotificationPermission();
          if (hasPermission) {
            await createNotificationChannels();
            const fcmToken = await messaging().getToken();
            console.log('[FCM] Token:', fcmToken);
            await registerFCMToken(userToken, fcmToken);
            
            // Listen for token refresh
            const unsubscribeTokenRefresh = messaging().onTokenRefresh(async newToken => {
              await registerFCMToken(userToken, newToken);
            });

            console.log('[FCM] Initializing listeners...');
            const cleanupListeners = setupFCMListeners((data) => {
              console.log('[FCM] Callback triggered with data:', data);
              if (data?.orderId) {
                setOrderId(data.orderId);
                setSelectedTrackingOrderId(null);
                setShowOrderTracking(true);
              }
            });

            return () => {
              unsubscribeTokenRefresh();
              cleanupListeners();
            };
          }
        } catch (error) {
          console.error('[FCM] Init error:', error);
        }
      };

      const cleanup = initFCM();
      return () => {
        if (typeof cleanup === 'function') (cleanup as any)();
      };
    }
  }, [userToken, userData?.id]);

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
        // 1. Check if user already has a saved address in their profile
        const currentData = storage.getObject<any>('userData');
        if (currentData && (currentData.currentAddressId || currentData.addressLine)) {
          setHasLocation(true);
          // Populate locationData from user's saved address if available
          if (currentData.currentAddressLatitude && currentData.currentAddressLongitude) {
             setLocationData({
                latitude: parseFloat(currentData.currentAddressLatitude),
                longitude: parseFloat(currentData.currentAddressLongitude)
             });
          }
        } else {
          // 2. Otherwise, check Location Data and Permission
          const savedLocation = storage.getObject<{ latitude: number; longitude: number }>('locationData');
          
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
        }

        // 3. Load Cart
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

  const socketRef = useRef<any>(null);

  // Socket.io initialization
  useEffect(() => {
    if (userToken && userData?.id) {
      // Connect to socket server
      socketRef.current = io(API_BASE_URL);

      socketRef.current.on('connect', () => {
        console.log('[Socket] Connected to server');
        if (orderId) {
          socketRef.current.emit('join_room', `order_${orderId}`);
        }

        // Join rooms for all stores currently in the cart to get product updates
        const storeIds = [...new Set(cartItems.map(item => String(item.store_id || (item as any).storeId)).filter(id => id && id !== 'undefined'))];
        storeIds.forEach(id => {
          socketRef.current.emit('join_room', `store_${id}`);
        });
      });

      socketRef.current.on('product_updated', (updatedProduct: any) => {
        console.log('[Socket] Product updated:', updatedProduct.id, 'Active:', updatedProduct.is_active);
        // We trigger a cart items update to force CartScreen to re-check serviceability
        setCartItems(prev => {
          const updatedCart = prev.map(item => 
            item.id === updatedProduct.id ? { ...item, ...updatedProduct } : item
          );
          storage.setItem('cartItems', updatedCart);
          return updatedCart;
        });
      });

      socketRef.current.on('store_updated', (updatedStore: any) => {
        console.log('[Socket] Store updated:', updatedStore.id, 'Active:', updatedStore.is_active);
        // Force serviceability re-check by updating cartItems (even if just a reference change)
        setCartItems(prev => [...prev]);
      });

      socketRef.current.on('order_status_changed', (updatedOrder: any) => {
        console.log('[Socket] Order status update:', updatedOrder.status);
        setActiveOrder(updatedOrder);

        if (updatedOrder?.status === 'delivered' || updatedOrder?.is_completed) {
          setOrderId(null);
          setActiveOrderTimestamp(null);
          storage.removeItem(`activeOrderId_${userData.id}`);
          storage.removeItem(`activeOrderTimestamp_${userData.id}`);
          setShowOrderTracking(false);
          setShowOrderDeclined(false);
          return;
        }

        if (updatedOrder?.status === 'declined') {
          setShowOrderTracking(false);
          setShowOrderDeclined(true);
          setOrderId(updatedOrder.id);
          const ts = new Date(updatedOrder.created_at).getTime();
          setActiveOrderTimestamp(ts);
          storage.setItem(`activeOrderId_${userData.id}`, updatedOrder.id);
          storage.setItem(`activeOrderTimestamp_${userData.id}`, ts);
          return;
        }

        setOrderId(updatedOrder.id);
        
        const ts = new Date(updatedOrder.created_at).getTime();
        setActiveOrderTimestamp(ts);
        
        // Update local storage
        storage.setItem(`activeOrderId_${userData.id}`, updatedOrder.id);
        storage.setItem(`activeOrderTimestamp_${userData.id}`, ts);
      });

      socketRef.current.on('settings_updated', (newSettings: any) => {
        console.log('[Socket] Global settings updated');
        setAppSettings(newSettings);
      });

      socketRef.current.on('disconnect', () => {
        console.log('[Socket] Disconnected');
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }
  }, [userToken, userData?.id, orderId]);

  // Join order room when orderId changes
  useEffect(() => {
    if (socketRef.current && orderId) {
      socketRef.current.emit('join_room', `order_${orderId}`);
    }
  }, [orderId]);

  // Sync active order with the backend on mount/login
  useEffect(() => {
    if (userToken && userData?.id) {
      const fetchActiveOrder = async () => {
        // 1. Load from cache first
        const cachedOrder = storage.getObject<any>(`activeOrderObject_${userData.id}`);
        if (cachedOrder) {
          console.log('[OrderSync] Loading order from cache');
          setActiveOrder(cachedOrder);
          setOrderId(cachedOrder.id);
          const ts = new Date(cachedOrder.created_at).getTime();
          setActiveOrderTimestamp(ts);
          if (cachedOrder.status === 'declined') setShowOrderDeclined(true);
        }

        try {
          const res = await fetch(`${API_BASE_URL}/orders/active`, {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          const data = await res.json();
          if (data.success && data.order) {
            setActiveOrder(data.order);
            // Save full object to cache
            storage.setItem(`activeOrderObject_${userData.id}`, data.order);

            if (data.order?.status === 'delivered' || data.order?.is_completed) {
              setOrderId(null);
              setActiveOrderTimestamp(null);
              storage.removeItem(`activeOrderId_${userData.id}`);
              storage.removeItem(`activeOrderTimestamp_${userData.id}`);
              storage.removeItem(`activeOrderObject_${userData.id}`);
              setShowOrderDeclined(false);
              return;
            }

            if (data.order?.status === 'declined') {
              setOrderId(data.order.id);
              const ts = new Date(data.order.created_at).getTime();
              setActiveOrderTimestamp(ts);
              setShowOrderDeclined(true);
              storage.setItem(`activeOrderId_${userData.id}`, data.order.id);
              storage.setItem(`activeOrderTimestamp_${userData.id}`, ts);
              return;
            }

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
            storage.removeItem(`activeOrderObject_${userData.id}`);
          }
        } catch (e) {
          console.error('Error fetching active order:', e);
        }
      };

      fetchActiveOrder();
    }
  }, [userToken, userData?.id]);

  const handleLoginSuccess = async (token: string, user: any) => {
    setUserToken(token);
    setUserData(user);
    
    // Check for existing addresses to show selection screen
    try {
      const res = await fetch(`${API_BASE_URL}/user/addresses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.addresses && data.addresses.length > 0) {
        setIsSelectingLocation(true);
      }
    } catch (e) {
      console.error('Error checking addresses after login:', e);
    }
    
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
    auth().signOut();
    storage.removeItem('userToken');
    storage.removeItem('userData');
    storage.removeItem('locationData');
    setUserToken(null);
    setUserData(null);
    setHasLocation(false);
    setLocationData(null);
    setShowAccount(false);
    setOrderId(null);
    setSelectedTrackingOrderId(null);
    setActiveOrder(null);
    setActiveOrderTimestamp(null);
  };

  // Determine which screen to show
  const renderContent = () => {
    if (!userToken) {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} role="customer" />;
    }

    if (isSelectingLocation) {
      return (
        <AddressSelectionScreen 
          userData={userData}
          userToken={userToken!}
          onBack={() => {
            setIsSelectingLocation(false);
            if (userData?.currentAddressId) {
              setHasLocation(true);
            }
          }}
          onAddressUpdated={(updatedUser) => {
            setUserData(updatedUser);
            storage.setItem('userData', updatedUser);
            
            // If we just selected an address and we didn't have location yet,
            // we should set hasLocation to true so it goes to Home.
            if (!hasLocation) {
              setHasLocation(true);
            }
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

    if (showInfo) {
      return (
        <InfoScreen 
          type={showInfo}
          onBack={() => setShowInfo(null)}
        />
      );
    }

    if (showAccount) {
      return (
        <AccountScreen 
          userData={userData}
          userToken={userToken!}
          onBack={() => setShowAccount(false)}
          onLogout={handleLogout}
          onSavedAddressPress={() => {
            setShowAccount(false);
            setIsSelectingLocation(true);
          }}
          onOrderPress={(id) => {
            setSelectedTrackingOrderId(id);
            setShowAccount(false);
            setShowOrderTracking(true);
          }}
          onInfoPress={(type) => {
             setShowInfo(type);
          }}
        />
      );
    }

    if (showOrderDeclined) {
      return (
        <OrderDeclinedScreen 
          onBack={async () => {
            setShowOrderDeclined(false);
            // Clear local state immediately to ensure smooth UX
            const currentOrderId = orderId;
            setActiveOrder(null);
            setOrderId(null);
            setActiveOrderTimestamp(null);
            if (userData) {
              storage.removeItem(`activeOrderId_${userData.id}`);
              storage.removeItem(`activeOrderTimestamp_${userData.id}`);
            }

            if (currentOrderId && userToken) {
              try {
                console.log('[App] Sending PATCH to mark declined order completed:', currentOrderId);
                const response = await fetch(`${API_BASE_URL}/orders/${currentOrderId}`, {
                  method: 'PATCH',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                  },
                  body: JSON.stringify({ is_completed: true })
                });
                const resData = await response.json();
                console.log('[App] Mark completed response:', JSON.stringify(resData, null, 2));
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
          orderId={selectedTrackingOrderId || orderId}
          activeOrder={activeOrder}
          userToken={userToken}
          onHome={() => {
            setShowOrderTracking(false);
            setSelectedTrackingOrderId(null);
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
          deliveryFee={checkoutDeliveryFee}
          deliveryTip={checkoutDeliveryTip}
          rainyFee={checkoutRainyFee}
          lateNightFee={checkoutLateNightFee}
          userData={userData}
          locationData={locationData}
          userToken={userToken}
          isSelfPickup={checkoutIsSelfPickup}
          paymentMode={checkoutPaymentMode}
          onSuccess={(id, order) => {
            console.log('\n✅ [OrderPlacement] STEP 5: Order successfully completed and stored in local state. ID:', id);
            console.log('Order Details:', JSON.stringify(order, null, 2));
            setOrderId(id);
            setActiveOrder(order);
            const ts = Date.now();
            setActiveOrderTimestamp(ts);

            if (userData && userData.id) {
              storage.setItem(`activeOrderId_${userData.id}`, id);
              storage.setItem(`activeOrderTimestamp_${userData.id}`, ts);
            }

            setShowOrderConfirming(false);
            setSelectedTrackingOrderId(null);
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
          onOrderConfirmed={(dummyId, selectedMode) => {
            setCheckoutPaymentMode(selectedMode);
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
          socket={socketRef.current}
          onProceedToCheckout={(total, deliveryFee, deliveryTip, isSelfPickup, rainyFee, lateNightFee) => {
            setCheckoutTotalAmount(total);
            setCheckoutDeliveryFee(deliveryFee);
            setCheckoutDeliveryTip(deliveryTip);
            setCheckoutRainyFee(rainyFee);
            setCheckoutLateNightFee(lateNightFee);
            setCheckoutIsSelfPickup(!!isSelfPickup);
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
          onPress={() => {
            const hasRunningOrder = orderId && activeOrder && activeOrder?.status !== 'delivered' && activeOrder?.status !== 'declined' && !activeOrder?.is_completed;
            if (hasRunningOrder) {
              Alertt.alert('Order in Progress', 'You already have an active order. Please wait until it is completed before placing a new one.');
              return;
            }
            setShowCart(true);
          }} 
          lastItemImage={lastItemImage}
        />
        
        {/* Active Order Widget (Floats globally if order is active and we are not on the tracking screen) */}
        {orderId && activeOrder && !showOrderTracking && !showOrderDeclined && activeOrder?.status !== 'delivered' && activeOrder?.status !== 'declined' && !activeOrder?.is_completed && (
          <ActiveOrderWidget 
            onPress={() => {
              if (activeOrder?.status === 'declined') {
                setShowOrderDeclined(true);
              } else {
                setSelectedTrackingOrderId(null);
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
    <SafeAreaProvider>
      <View style={styles.container}>
        {loading ? (
          <LoadingTransition />
        ) : (
          <>
            {appSettings?.is_rainy_condition && (
              <SafeAreaView edges={['top']} style={styles.rainyBar}>
                <Text style={styles.rainyText}>
                    Rainy weather: <Text style={{ color: '#4A90E2' }}>Extra ₹{appSettings.rainy_condition_fee}</Text> will be added to delivery
                </Text>
              </SafeAreaView>
            )}
            {renderContent()}
          </>
        )}
        <CustomAlert />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  rainyBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rainyText: {
    color: '#333',
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontWeight: 'bold',
  },
});

export default App;
