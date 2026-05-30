import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import io from 'socket.io-client';
import messaging from '@react-native-firebase/messaging';
import { storage } from './src/utils/storage';
import { 
  requestNotificationPermission, 
  createNotificationChannels, 
  registerFCMToken, 
  setupFCMListeners 
} from './src/utils/notifications';
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
  const [checkoutDeliveryFee, setCheckoutDeliveryFee] = useState<number>(0);
  const [checkoutDeliveryTip, setCheckoutDeliveryTip] = useState<number>(0);

  // FCM Setup
  useEffect(() => {
    if (userToken && userData?.id) {
      const initFCM = async () => {
        try {
          const hasPermission = await requestNotificationPermission();
          if (hasPermission) {
            await createNotificationChannels();
            const fcmToken = await messaging().getToken();
            await registerFCMToken(userToken, fcmToken);
            
            // Listen for token refresh
            const unsubscribeTokenRefresh = messaging().onTokenRefresh(async newToken => {
              await registerFCMToken(userToken, newToken);
            });

            const cleanupListeners = setupFCMListeners((data) => {
              if (data?.orderId) {
                setOrderId(data.orderId);
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
        try {
          const res = await fetch(`${API_BASE_URL}/orders/active`, {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          const data = await res.json();
          if (data.success && data.order) {
            setActiveOrder(data.order);

            if (data.order?.status === 'delivered' || data.order?.is_completed) {
              setOrderId(null);
              setActiveOrderTimestamp(null);
              storage.removeItem(`activeOrderId_${userData.id}`);
              storage.removeItem(`activeOrderTimestamp_${userData.id}`);
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
          orderId={orderId}
          activeOrder={activeOrder}
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
          deliveryFee={checkoutDeliveryFee}
          deliveryTip={checkoutDeliveryTip}
          userData={userData}
          locationData={locationData}
          userToken={userToken}
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
          onProceedToCheckout={(total, deliveryFee, deliveryTip) => {
            setCheckoutTotalAmount(total);
            setCheckoutDeliveryFee(deliveryFee);
            setCheckoutDeliveryTip(deliveryTip);
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
        {orderId && activeOrder && !showOrderTracking && !showOrderDeclined && activeOrder?.status !== 'delivered' && activeOrder?.status !== 'declined' && !activeOrder?.is_completed && (
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
