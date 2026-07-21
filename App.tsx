import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/useAuthStore';
import { useCartStore } from './src/store/useCartStore';
import { useOrderStore } from './src/store/useOrderStore';
import { useSettingsStore } from './src/store/useSettingsStore';
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
import InfoScreen, { InfoType } from './src/screens/InfoScreen';
import HelpScreen from './src/screens/HelpScreen';
import TicketDetailsScreen from './src/screens/TicketDetailsScreen';
import LoadingTransition from './src/components/LoadingTransition';
import { Alertt, CustomAlert } from './src/components/Alertt';
import CartFooter from './src/components/CartFooter';
import ActiveOrderWidget from './src/components/ActiveOrderWidget';
import PromotionalFilterScreen from './src/screens/PromotionalFilterScreen';

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
    console.log('[AuthTrace][Fetch] Intercepted fetch call to backend API:', input);
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        let token = storage.getString('userToken') || '';

        // If the token is missing or expired, fetch a fresh one before the call
        if (!token || isTokenExpired(token)) {
          console.log('[AuthTrace][Fetch] Token expired or missing. Refreshing before API call...');
          try {
            token = await currentUser.getIdToken(true);
            if (token) {
              storage.setItem('userToken', token);
            }
          } catch (refreshErr) {
            console.error('[AuthTrace][Fetch] Failed to force-refresh token:', refreshErr);
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
  const { 
    userToken, 
    userData, 
    hasLocation, 
    setToken, 
    setUserData, 
    setHasLocation, 
    setLocationData,
    setIsSelectingLocation,
    logout
  } = useAuthStore();

  const { cartItems, setCartItems } = useCartStore();
  const { activeOrders, setActiveOrders, upsertActiveOrder, removeActiveOrder, setSelectedTrackingOrderId } = useOrderStore();
  const { appSettings, setAppSettings, setPricingConfig } = useSettingsStore();

  const [loading, setLoading] = useState(true);
  const [postLoginLoading, setPostLoginLoading] = useState(false);
  const authResolved = React.useRef(false);

  // Debounced versions of userToken and userData.id to prevent duplicate triggers
  const [stableToken, setStableToken] = useState<string | null>(null);
  const [stableUserId, setStableUserId] = useState<string | null>(null);
  const debounceTokenTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Firebase Auth state listener
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!authResolved.current) {
        authResolved.current = true;
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = auth().onIdTokenChanged(async (user) => {
      console.log('[AuthTrace][Startup] onIdTokenChanged triggered. User present:', !!user);
      if (user) {
        try {
          const idToken = await user.getIdToken();
          setToken(idToken);
          storage.setItem('userToken', idToken);
          
          const currentData = storage.getObject<any>('userData');
          if (currentData) {
            setUserData(currentData);
            if (currentData.currentAddressId || currentData.addressLine) {
              setHasLocation(true);
              if (currentData.currentAddressLatitude && currentData.currentAddressLongitude) {
                setLocationData({
                  latitude: parseFloat(currentData.currentAddressLatitude),
                  longitude: parseFloat(currentData.currentAddressLongitude),
                  isFromAddress: true,
                });
              }
            }
          }
        } catch (e: any) {
          if (e?.code !== 'auth/no-current-user') {
            console.error('[AuthTrace][Startup] Error getting ID token:', e);
          }
          const cachedToken = storage.getString('userToken');
          if (cachedToken) {
            setToken(cachedToken);
            const currentData = storage.getObject<any>('userData');
            if (currentData) {
              setUserData(currentData);
              if (currentData.currentAddressId || currentData.addressLine) {
                setHasLocation(true);
                if (currentData.currentAddressLatitude && currentData.currentAddressLongitude) {
                  setLocationData({
                    latitude: parseFloat(currentData.currentAddressLatitude),
                    longitude: parseFloat(currentData.currentAddressLongitude),
                    isFromAddress: true,
                  });
                }
              }
            }
          } else {
            setToken(null);
          }
        }
      } else {
        setToken(null);
        setUserData(null);
        storage.removeItem('userToken');
        storage.removeItem('userData');
      }

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

  // Sync settings and location on load
  useEffect(() => {
    const checkAppState = async () => {
      try {
        const currentData = storage.getObject<any>('userData');
        const isFullyOnboarded = currentData?.isProfileComplete && currentData?.currentAddressId;

        if (currentData && (currentData.currentAddressId || currentData.addressLine)) {
          setHasLocation(true);
          if (currentData.currentAddressLatitude && currentData.currentAddressLongitude) {
             setLocationData({
                latitude: parseFloat(currentData.currentAddressLatitude),
                longitude: parseFloat(currentData.currentAddressLongitude)
             });
          }
        } else if (isFullyOnboarded) {
          // Only restore a raw GPS cache for users who have completed onboarding.
          // New users mid-onboarding must go through LocationScreen fresh.
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

        const savedCart = storage.getObject<any[]>('cartItems');
        if (savedCart) {
          setCartItems(savedCart);
        }
      } catch (e) {
        console.error('Failed to load app state', e);
      }
    };

    checkAppState();
  }, []);

  // Proactive token refresh when app transitions to active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        try {
          const currentUser = auth().currentUser;
          if (currentUser) {
            const freshToken = await currentUser.getIdToken(true);
            if (freshToken) {
              setToken(freshToken);
              storage.setItem('userToken', freshToken);
            }
          }
        } catch (err) {
          console.warn('[AuthTrace][Foreground] Proactive session refresh failed:', err);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Fetch Global App Settings + Pricing Config
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const [settingsRes, pricingRes] = await Promise.all([
          fetch(`${API_BASE_URL}/settings`),
          fetch(`${API_BASE_URL}/pricing/config/public`),
        ]);
        const settingsData = await settingsRes.json();
        const pricingData  = await pricingRes.json();
        if (settingsData.success) setAppSettings(settingsData.data);
        if (pricingData.success)  setPricingConfig(pricingData.data);
      } catch (e) {
        console.warn('Failed to fetch configs in App.tsx');
      }
    };
    fetchConfigs();
  }, []);

  // FCM Setup
  useEffect(() => {
    if (stableToken && stableUserId) {
      const initFCM = async () => {
        try {
          const hasPermission = await requestNotificationPermission();
          if (hasPermission) {
            await createNotificationChannels();
            const fcmToken = await messaging().getToken();
            await registerFCMToken(stableToken, fcmToken);
            
            const unsubscribeTokenRefresh = messaging().onTokenRefresh(async newToken => {
              await registerFCMToken(stableToken, newToken);
            });

            const cleanupListeners = setupFCMListeners((data) => {
              if (data?.orderId) {
                setSelectedTrackingOrderId(data.orderId);
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

  const socketRef = useRef<any>(null);

  // Socket.io initialization
  useEffect(() => {
    if (stableToken && stableUserId) {
      socketRef.current = io(API_BASE_URL);

      socketRef.current.on('connect', () => {
        console.log('[Socket] Connected to server');
        activeOrders.forEach(o => socketRef.current?.emit('join_room', `order_${o.id}`));
        const storeIds = [...new Set(cartItems.map(item => String(item.store_id || item.storeId)).filter(id => id && id !== 'undefined'))];
        storeIds.forEach(id => socketRef.current?.emit('join_room', `store_${id}`));
      });

      socketRef.current.on('product_updated', (updatedProduct: any) => {
        const updatedCart = cartItems.map(item =>
          item.id === updatedProduct.id ? { ...item, ...updatedProduct } : item
        );
        setCartItems(updatedCart);
        storage.setItem('cartItems', updatedCart);
      });

      socketRef.current.on('order_status_changed', (updatedOrder: any) => {
        if (updatedOrder?.status === 'delivered' || updatedOrder?.is_completed) {
          removeActiveOrder(updatedOrder.id);
          storage.removeItem(`activeOrderObject_${stableUserId}_${updatedOrder.id}`);
          return;
        }

        if (updatedOrder?.status === 'declined') {
          removeActiveOrder(updatedOrder.id);
          storage.removeItem(`activeOrderObject_${stableUserId}_${updatedOrder.id}`);
          
          fetch(`${API_BASE_URL}/orders/${updatedOrder.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${stableToken}` },
            body: JSON.stringify({ is_completed: true })
          }).catch(e => console.error('Failed to auto-dismiss declined order via socket', e));
          return;
        }

        upsertActiveOrder(updatedOrder);
        storage.setItem(`activeOrderObject_${stableUserId}_${updatedOrder.id}`, updatedOrder);
      });

      socketRef.current.on('settings_updated', (newSettings: any) => {
        setAppSettings(newSettings);
      });

      socketRef.current.on('pricing_updated', (newConfig: any) => {
        setPricingConfig(newConfig);
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

  // Sync active orders on mount/login
  useEffect(() => {
    if (stableToken && stableUserId) {
      const fetchActiveOrders = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/orders/active-all`, {
            headers: { Authorization: `Bearer ${stableToken}` }
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            const liveOrders = data.orders;

            liveOrders.forEach((o: any) => {
              if (o.status === 'declined') {
                storage.removeItem(`activeOrderObject_${stableUserId}_${o.id}`);
                fetch(`${API_BASE_URL}/orders/${o.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${stableToken}` },
                  body: JSON.stringify({ is_completed: true })
                }).catch(e => console.error('Failed to auto-dismiss declined order via sync', e));
              }
            });

            const displayOrders = liveOrders.filter((o: any) => o.status !== 'declined');
            setActiveOrders(displayOrders);
          }
        } catch (e) {
          console.error('Error fetching active orders:', e);
        }
      };
      fetchActiveOrders();
    }
  }, [stableToken, stableUserId]);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {(loading || postLoginLoading) ? (
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
            <NavigationContainer>
              <RootNavigator socket={socketRef.current} />
            </NavigationContainer>
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
