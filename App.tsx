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
import HelpScreen from './src/screens/HelpScreen';
import TicketDetailsScreen from './src/screens/TicketDetailsScreen';
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

// Helpers for token validation and injection
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decodeTokenPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
    let output = '';
    
    for (let bc = 0, bs = 0, rbuffer, idx = 0; idx < base64.length; idx++) {
      const char = base64.charAt(idx);
      const pos = CHARS.indexOf(char);
      if (pos === -1) continue;
      bs = bc % 4 ? bs * 64 + pos : pos;
      if (bc++ % 4) {
        rbuffer = (bs >> ((-2 * bc) & 6));
        output += String.fromCharCode(255 & rbuffer);
      }
    }
    
    return JSON.parse(output);
  } catch (e) {
    return null;
  }
}

function isTokenExpired(token: string) {
  const payload = decodeTokenPayload(token);
  if (!payload || !payload.exp) return true;
  
  const expTimeMs = payload.exp * 1000;
  return Date.now() >= (expTimeMs - 10000);
}

function injectAuthHeader(headers: any, token: string) {
  if (!headers) {
    return { 'Authorization': `Bearer ${token}` };
  }
  if (headers instanceof Headers) {
    headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }
  if (Array.isArray(headers)) {
    const newHeaders = [...headers];
    const authIdx = newHeaders.findIndex(([k]) => k.toLowerCase() === 'authorization');
    if (authIdx > -1) {
      newHeaders[authIdx] = ['Authorization', `Bearer ${token}`];
    } else {
      newHeaders.push(['Authorization', `Bearer ${token}`]);
    }
    return newHeaders;
  }
  return {
    ...headers,
    'Authorization': `Bearer ${token}`
  };
}

// Intercept global fetch to automatically inject a fresh Firebase ID token.
// We check if the token is expired before calling the API, force-refreshing if needed.
const originalFetch = (globalThis as any).fetch;
(globalThis as any).fetch = async (input: any, init?: any) => {
  if (typeof input === 'string' && input.startsWith(API_BASE_URL)) {
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        let token = storage.getString('userToken') || '';

        // If the token is missing or expired, fetch a fresh one before the call
        if (!token || isTokenExpired(token)) {
          console.log('[Fetch Interceptor] Token expired or missing. Refreshing before API call...');
          try {
            token = await currentUser.getIdToken(true);
            if (token) {
              storage.setItem('userToken', token);
            }
          } catch (refreshErr) {
            console.error('[Fetch Interceptor] Failed to force-refresh token:', refreshErr);
          }
        }

        // If it's valid, fetch cached token using false (handles other SDK-side updates)
        if (token && !isTokenExpired(token)) {
          try {
            token = await currentUser.getIdToken(false);
          } catch (e) {
            // fallback to local storage token
          }
        }

        if (token) {
          init = init || {};
          init.headers = injectAuthHeader(init.headers, token);
        }
      }
    } catch (error) {
      console.error('[Fetch Interceptor] Error in proactive token check:', error);
    }
  }
  return originalFetch(input, init);
};

function App() {

  const [userToken, setUserToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  // Start as true – we flip it to false only after Firebase resolves the auth
  // state (inside onIdTokenChanged). This prevents the login screen from
  // flashing while Firebase is restoring an existing session on app open.
  const [loading, setLoading] = useState(true);
  // True while we are resolving address/profile state immediately after login.
  const [postLoginLoading, setPostLoginLoading] = useState(false);
  const authResolved = React.useRef(false);

  // Debounced versions of userToken and userData.id.
  // Firebase fires onIdTokenChanged TWICE on cold-start (once from local cache,
  // once after server validation). Without debouncing, every effect that depends
  // on [userToken, userData?.id] runs twice: FCM setup, socket, fetchActiveOrder.
  // We debounce by 350 ms – that's long enough for both fires to settle, but
  // short enough that the user never notices.
  const [stableToken, setStableToken] = useState<string | null>(null);
  const [stableUserId, setStableUserId] = useState<string | null>(null);
  const debounceTokenTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep stableToken / stableUserId in sync with userToken / userData, debounced.
  useEffect(() => {
    if (debounceTokenTimer.current) clearTimeout(debounceTokenTimer.current);
    debounceTokenTimer.current = setTimeout(() => {
      setStableToken(userToken);
      setStableUserId(userData?.id ?? null);
    }, 350);
    return () => {
      if (debounceTokenTimer.current) clearTimeout(debounceTokenTimer.current);
    };
  }, [userToken, userData?.id]);

  // Update locationData whenever userData changes (e.g. address switch).
  // Uses a functional setState so it only triggers a re-render (and therefore
  // a HomeScreen re-fetch) when the COORDINATES actually change — not on every
  // userData reference change or when only metadata like isFromAddress differs.
  useEffect(() => {
    if (userData?.currentAddressLatitude && userData?.currentAddressLongitude) {
      const newLat = parseFloat(userData.currentAddressLatitude);
      const newLng = parseFloat(userData.currentAddressLongitude);
      const newAddressId = userData.currentAddressId;
      setLocationData(prev => {
        if (prev?.latitude === newLat && prev?.longitude === newLng) {
          // Same coordinates — return existing object reference so React
          // sees no change and HomeScreen does not re-fetch.
          return prev;
        }
        console.log('[App] Address-based location updated:', { lat: newLat, lng: newLng });
        return { latitude: newLat, longitude: newLng, isFromAddress: true, addressId: newAddressId };
      });
    }
  }, [userData?.id, userData?.currentAddressId, userData?.currentAddressLatitude, userData?.currentAddressLongitude]);

  // Firebase Auth & Token Refresh Logic
  // IMPORTANT: setLoading(false) is called here – AFTER Firebase first resolves
  // the auth state – so we never briefly show the login screen on app open.
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!authResolved.current) {
        authResolved.current = true;
        setLoading(false);
      }
    }, 5000);

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

      // Hide the splash/loading screen only after the first auth resolution.
      // This is the correct place to do it – not in checkAppState().
      if (!authResolved.current) {
        authResolved.current = true;
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
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
  const [showHelp, setShowHelp] = useState(false);
  const [preAttachedHelpOrder, setPreAttachedHelpOrder] = useState<any>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | number | null>(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  // Multi-order support: all non-completed active orders for this user
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [selectedTrackingOrderId, setSelectedTrackingOrderId] = useState<string | null>(null);
  // Keep a single "primary" declined order for the OrderDeclinedScreen flow
  const [declinedOrderId, setDeclinedOrderId] = useState<string | null>(null);

  // Helper: upsert an order into activeOrders (add if new, update if existing)
  const upsertActiveOrder = (order: any) => {
    setActiveOrders(prev => {
      const idx = prev.findIndex(o => String(o.id) === String(order.id));
      if (idx === -1) return [order, ...prev];
      const updated = [...prev];
      updated[idx] = order;
      return updated;
    });
  };

  // Helper: remove an order from activeOrders by id
  const removeActiveOrder = (orderId: string | number) => {
    setActiveOrders(prev => prev.filter(o => String(o.id) !== String(orderId)));
  };
  const [checkoutTotalAmount, setCheckoutTotalAmount] = useState<number>(0);
  const [checkoutDeliveryFee, setCheckoutDeliveryFee] = useState<number>(0);
  const [checkoutDeliveryTip, setCheckoutDeliveryTip] = useState<number>(0);
  const [checkoutLateNightFee, setCheckoutLateNightFee] = useState<number>(0);
  const [checkoutRainyFee, setCheckoutRainyFee] = useState<number>(0);
  const [checkoutExtraStoreCharge, setCheckoutExtraStoreCharge] = useState<number>(0);
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
  // Uses stableToken/stableUserId (debounced) so this only runs once even when
  // Firebase fires onIdTokenChanged twice in quick succession on app open.
  useEffect(() => {
    if (stableToken && stableUserId) {
      const initFCM = async () => {
        try {
          const hasPermission = await requestNotificationPermission();
          if (hasPermission) {
            await createNotificationChannels();
            const fcmToken = await messaging().getToken();
            console.log('[FCM] Token:', fcmToken);
            await registerFCMToken(stableToken, fcmToken);
            
            // Listen for token refresh
            const unsubscribeTokenRefresh = messaging().onTokenRefresh(async newToken => {
              await registerFCMToken(stableToken, newToken);
            });

            console.log('[FCM] Initializing listeners...');
            const cleanupListeners = setupFCMListeners((data) => {
              console.log('[FCM] Callback triggered with data:', data);
              if (data?.orderId) {
                setSelectedTrackingOrderId(data.orderId);
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
  }, [stableToken, stableUserId]);
  // Cart logic
  const proceedAddToCart = (product: any) => {
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

  const addToCart = (product: any) => {
    const isDifferentStore = cartItems.length > 0 && cartItems.some(item => String(item.store_id || item.storeId) !== String(product.store_id || product.storeId));
    if (isDifferentStore) {
      const charge = appSettings?.extra_store_charge || 20;
      Alertt.alert(
        'Different Store',
        `Adding items from multiple stores will add an extra store charge of ₹${charge} to your delivery fee.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Item', onPress: () => proceedAddToCart(product) }
        ]
      );
    } else {
      proceedAddToCart(product);
    }
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

  // Check login and location state on start.
  // NOTE: We intentionally do NOT call setLoading(false) here anymore.
  // Loading is controlled by onIdTokenChanged so there's no race condition
  // where the login screen flashes before Firebase restores the session.
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
      }
      // Do NOT call setLoading(false) here – onIdTokenChanged handles it.
    };

    checkAppState();
  }, []);

  // Proactive token refresh when app transitions back to the foreground (active state)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[Auth] App moved to foreground - proactively refreshing session...');
        try {
          const currentUser = auth().currentUser;
          if (currentUser) {
            const freshToken = await currentUser.getIdToken(true);
            if (freshToken) {
              setUserToken(freshToken);
              storage.setItem('userToken', freshToken);
              console.log('[Auth] Session successfully renewed proactively on foreground.');
            }
          }
        } catch (err) {
          console.warn('[Auth] Proactive session refresh failed:', err);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const socketRef = useRef<any>(null);

  // Socket.io initialization.
  // Uses stableToken/stableUserId (debounced) to prevent double-connect on app open.
  useEffect(() => {
    if (stableToken && stableUserId) {
      // Connect to socket server
      socketRef.current = io(API_BASE_URL);

      socketRef.current.on('connect', () => {
        console.log('[Socket] Connected to server');
        // Join rooms for all active orders
        setActiveOrders(current => {
          current.forEach(o => socketRef.current?.emit('join_room', `order_${o.id}`));
          return current;
        });
        // Join rooms for all stores in cart
        const storeIds = [...new Set(cartItems.map(item => String(item.store_id || (item as any).storeId)).filter(id => id && id !== 'undefined'))];
        storeIds.forEach(id => socketRef.current?.emit('join_room', `store_${id}`));
      });

      socketRef.current.on('product_updated', (updatedProduct: any) => {
        console.log('[Socket] Product updated:', updatedProduct.id);
        setCartItems(prev => {
          const updatedCart = prev.map(item =>
            item.id === updatedProduct.id ? { ...item, ...updatedProduct } : item
          );
          storage.setItem('cartItems', updatedCart);
          return updatedCart;
        });
      });

      socketRef.current.on('store_updated', () => {
        setCartItems(prev => [...prev]);
      });

      socketRef.current.on('order_status_changed', (updatedOrder: any) => {
        console.log('[Socket] Order status update for #' + updatedOrder.id + ':', updatedOrder.status);

        if (updatedOrder?.status === 'delivered' || updatedOrder?.is_completed) {
          removeActiveOrder(updatedOrder.id);
          storage.removeItem(`activeOrderObject_${stableUserId}_${updatedOrder.id}`);
          // If we were tracking this specific order, go back to home
          setSelectedTrackingOrderId(prev => {
            if (String(prev) === String(updatedOrder.id)) {
              setShowOrderTracking(false);
              return null;
            }
            return prev;
          });
          setShowOrderDeclined(false);
          return;
        }

        if (updatedOrder?.status === 'declined') {
          upsertActiveOrder(updatedOrder);
          setDeclinedOrderId(String(updatedOrder.id));
          setShowOrderTracking(false);
          setShowOrderDeclined(true);
          return;
        }

        upsertActiveOrder(updatedOrder);
        storage.setItem(`activeOrderObject_${stableUserId}_${updatedOrder.id}`, updatedOrder);
      });

      socketRef.current.on('settings_updated', (newSettings: any) => {
        setAppSettings(newSettings);
      });

      socketRef.current.on('disconnect', () => console.log('[Socket] Disconnected'));

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }
  }, [stableToken, stableUserId]);

  // Join socket rooms for any new active orders
  useEffect(() => {
    if (socketRef.current) {
      activeOrders.forEach(o => socketRef.current?.emit('join_room', `order_${o.id}`));
    }
  }, [activeOrders.length]);

  // Sync all active orders from backend on mount/login
  useEffect(() => {
    if (stableToken && stableUserId) {
      const fetchActiveOrders = async () => {
        const dismissedOrderId = storage.getString(`dismissedDeclinedOrderId_${stableUserId}`);
        try {
          const res = await fetch(`${API_BASE_URL}/orders/active-all`, {
            headers: { Authorization: `Bearer ${stableToken}` }
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            const liveOrders = data.orders;

            // Detect any newly declined orders to show the declined screen
            liveOrders.forEach((o: any) => {
              if (o.status === 'declined') {
                const isAlreadyDismissed = dismissedOrderId === String(o.id);
                if (!isAlreadyDismissed) {
                  setDeclinedOrderId(String(o.id));
                  setShowOrderDeclined(true);
                }
              }
            });

            // Filter out already-dismissed declined orders from the widget
            const displayOrders = liveOrders.filter((o: any) => {
              if (o.status === 'declined' && dismissedOrderId === String(o.id)) return false;
              return true;
            });

            setActiveOrders(displayOrders);
          }
        } catch (e) {
          console.error('Error fetching active orders:', e);
        }
      };

      fetchActiveOrders();
    }
  }, [stableToken, stableUserId]);

  const handleLoginSuccess = async (token: string, user: any) => {
    // Show the loading screen while we resolve everything – prevents flickering
    // to the wrong screen (e.g. LocationScreen) before we know the user's state.
    setPostLoginLoading(true);

    try {
      setUserToken(token);
      setUserData(user);

      // --- 1. Resolve address / location state ---
      // The login response already includes currentAddressId and coordinates.
      // If the user has a saved address we can skip the addresses API call entirely.
      if (user?.currentAddressId) {
        // User already has a selected address.
        // Do NOT set locationData here — the address watch effect above will
        // set it correctly when setUserData(user) is processed below, avoiding
        // a duplicate locationData update that would cause HomeScreen to fetch twice.
        setHasLocation(true);
        setIsSelectingLocation(false);
      } else {
        // No current address — fetch the full address list to decide what to show.
        try {
          const res = await fetch(`${API_BASE_URL}/user/addresses`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success && data.addresses && data.addresses.length > 0) {
            // Has saved addresses but none selected → let them pick one.
            setIsSelectingLocation(true);
          }
          // else: no addresses at all → hasLocation stays false → LocationScreen shown
        } catch (e) {
          console.error('[Login] Error fetching addresses:', e);
        }
      }

      // Active orders are fetched by the fetchActiveOrders effect after stableToken is set.
    } finally {
      setPostLoginLoading(false);
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
    setActiveOrders([]);
    setSelectedTrackingOrderId(null);
    setDeclinedOrderId(null);
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

    if (selectedTicketId) {
      return (
        <TicketDetailsScreen 
          ticketId={selectedTicketId}
          userToken={userToken!}
          onBack={() => {
            setSelectedTicketId(null);
            setShowHelp(true);
          }}
        />
      );
    }

    if (showHelp) {
      return (
        <HelpScreen 
          userToken={userToken!}
          preAttachedOrder={preAttachedHelpOrder}
          onBack={() => {
            setShowHelp(false);
            setPreAttachedHelpOrder(null);
            setShowAccount(true);
          }}
          onViewTicketDetails={(ticketId) => {
            setShowHelp(false);
            setSelectedTicketId(ticketId);
          }}
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
          onHelpPress={(preAttachedOrder) => {
            setPreAttachedHelpOrder(preAttachedOrder || null);
            setShowAccount(false);
            setShowHelp(true);
          }}
        />
      );
    }

    if (showOrderDeclined) {
      return (
        <OrderDeclinedScreen 
          onBack={async () => {
            const currentOrderId = declinedOrderId;

            // 1. Mark dismissed before clearing state
            if (currentOrderId && userData?.id) {
              storage.setItem(`dismissedDeclinedOrderId_${userData.id}`, String(currentOrderId));
            }

            // 2. Remove from activeOrders and clear declined state
            setShowOrderDeclined(false);
            if (currentOrderId) removeActiveOrder(currentOrderId);
            setDeclinedOrderId(null);
            if (userData) {
              storage.removeItem(`activeOrderObject_${userData.id}_${currentOrderId}`);
            }

            // 3. Best-effort PATCH to mark is_completed on backend
            if (currentOrderId && userToken) {
              try {
                await fetch(`${API_BASE_URL}/orders/${currentOrderId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
                  body: JSON.stringify({ is_completed: true })
                });
              } catch (e) {
                console.error('Failed to acknowledge declined order', e);
              }
            }
          }}
        />
      );
    }

    if (showOrderTracking) {
      const trackingId = selectedTrackingOrderId;
      const matchedOrder = activeOrders.find(o => String(o.id) === String(trackingId));
      return (
        <OrderTrackingScreen 
          orderId={trackingId}
          activeOrder={matchedOrder || null}
          userToken={userToken}
          onHome={() => {
            setShowOrderTracking(false);
            setSelectedTrackingOrderId(null);
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
          extraStoreCharge={checkoutExtraStoreCharge}
          userData={userData}
          locationData={locationData}
          userToken={userToken}
          isSelfPickup={checkoutIsSelfPickup}
          paymentMode={checkoutPaymentMode}
          onSuccess={(id, order) => {
            console.log('\n✅ [OrderPlacement] STEP 5: Order placed. ID:', id);
            upsertActiveOrder(order);
            if (userData?.id) {
              storage.setItem(`activeOrderObject_${userData.id}_${id}`, order);
            }
            setShowOrderConfirming(false);
            setSelectedTrackingOrderId(String(id));
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
          onProceedToCheckout={(total, deliveryFee, deliveryTip, isSelfPickup, rainyFee, lateNightFee, extraStoreCharge) => {
            setCheckoutTotalAmount(total);
            setCheckoutDeliveryFee(deliveryFee);
            setCheckoutDeliveryTip(deliveryTip);
            setCheckoutRainyFee(rainyFee);
            setCheckoutLateNightFee(lateNightFee);
            setCheckoutExtraStoreCharge(extraStoreCharge || 0);
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
            setShowCart(true);
          }} 
          lastItemImage={lastItemImage}
        />
        
        {/* Active Order Widget — shows all active orders, hidden when tracking screen is open */}
        {activeOrders.filter(o => !o.is_completed && o.status !== 'delivered').length > 0 && !showOrderTracking && !showOrderDeclined && (
          <ActiveOrderWidget
            orders={activeOrders.filter(o => !o.is_completed && o.status !== 'delivered')}
            onOrderPress={(orderId) => {
              setSelectedTrackingOrderId(orderId);
              setShowOrderTracking(true);
            }}
          />
        )}
      </View>
    );


  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {(loading || postLoginLoading) ? (
          // Show splash during initial Firebase auth resolution OR
          // while we resolve the user's address/profile state right after login.
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
