import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
  PanResponder,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import io from 'socket.io-client';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { API_BASE_URL } from '../config/api';
import { storage } from '../utils/storage';
import LiveMap from '../components/LiveMap';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OrderTrackingScreenProps {
  orderId: string | null;
  activeOrder: any;
  userToken: string | null;
  onHome: () => void;
}

const parseCoordinate = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsedValue = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({
  orderId,
  activeOrder,
  userToken,
  onHome,
}) => {
  const [trackedOrder, setTrackedOrder] = useState<any>(
    activeOrder?.id === orderId ? activeOrder : null
  );
  const [loadingOrder, setLoadingOrder] = useState(activeOrder?.id !== orderId);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [storeCoords, setStoreCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const socketRef = useRef<any>(null);

  // DRAGGABLE BOTTOM SHEET LOGIC
  const INITIAL_SHEET_HEIGHT = SCREEN_HEIGHT * 0.4;
  const sheetHeight = useRef(new Animated.Value(INITIAL_SHEET_HEIGHT)).current;
  const lastSheetHeight = useRef(INITIAL_SHEET_HEIGHT);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const newHeight = lastSheetHeight.current - gestureState.dy;
        // Limit height between 25% and 90% of screen
        if (newHeight > SCREEN_HEIGHT * 0.25 && newHeight < SCREEN_HEIGHT * 0.90) {
          sheetHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        lastSheetHeight.current = (sheetHeight as any)._value;
      },
    })
  ).current;

  useEffect(() => {
    if (activeOrder?.id === orderId) {
      setTrackedOrder((prev: any) => ({
        ...activeOrder,
        delivery_pin: activeOrder.delivery_pin || prev?.delivery_pin,
      }));
    }
  }, [activeOrder, orderId]);

  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async () => {
      if (!orderId || !userToken) {
        setLoadingOrder(false);
        setOrderError('Order details are unavailable.');
        return;
      }

      if (activeOrder?.id !== orderId) {
        setTrackedOrder(null);
        setLoadingOrder(true);
      }
      setOrderError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });
        const data = await response.json();

        if (!response.ok || !data.success || !data.order) {
          throw new Error(data.error || 'Failed to load order details.');
        }

        if (isMounted) {
          setTrackedOrder((prev: any) => ({
            ...data.order,
            delivery_pin: data.order.delivery_pin || prev?.delivery_pin,
          }));
        }
      } catch (error: any) {
        if (isMounted) {
          setOrderError(error.message || 'Failed to load order details.');
        }
      } finally {
        if (isMounted) {
          setLoadingOrder(false);
        }
      }
    };

    fetchOrder();

    return () => {
      isMounted = false;
    };
  }, [activeOrder?.id, orderId, userToken]);

  // Use a screen-level socket so historical order views subscribe to their own order room.
  useEffect(() => {
    if (!orderId) {
      console.log('[OrderTracking] No orderId provided, skipping socket.');
      return;
    }

    console.log('[OrderTracking] Initializing socket connection for order:', orderId);
    socketRef.current = io(API_BASE_URL);

    const joinRoom = () => {
      console.log('[OrderTracking] Joining room:', `order_${orderId}`);
      socketRef.current?.emit('join_room', `order_${orderId}`);
    };

    socketRef.current.on('connect', () => {
      console.log('[OrderTracking] Socket connected!');
      joinRoom();
    });

    // If already connected, join immediately
    if (socketRef.current.connected) {
      joinRoom();
    }

    socketRef.current.on('delivery_location_updated', (data: any) => {
      console.log('[OrderTracking] Received location update:', data);
      const lat = parseCoordinate(data.latitude);
      const lng = parseCoordinate(data.longitude);
      // Use loose equality or cast to handle string/number mismatch
      if (String(data.orderId) === String(orderId) && lat !== null && lng !== null) {
        setDriverCoords({ lat, lng });
      }
    });

    socketRef.current.on('order_status_changed', (updatedOrder: any) => {
      console.log('[OrderTracking] Received status update:', updatedOrder.status);
      if (String(updatedOrder?.id) === String(orderId)) {
        setTrackedOrder((prev: any) => ({
          ...prev,
          ...updatedOrder,
          delivery_pin: updatedOrder?.delivery_pin || prev?.delivery_pin,
        }));
      }
    });

    socketRef.current.on('connect_error', (err) => {
      console.warn('[OrderTracking] Socket connection error:', err.message);
    });

    return () => {
      if (socketRef.current) {
        console.log('[OrderTracking] Disconnecting socket for order:', orderId);
        socketRef.current.disconnect();
      }
    };
    }, [orderId]);

    useEffect(() => {
    const fetchStoreLocation = async () => {
      setStoreCoords(null);
      const lat = parseCoordinate(trackedOrder?.store_lat);
      const lng = parseCoordinate(trackedOrder?.store_lng);

      if (lat !== null && lng !== null) {
        setStoreCoords({ lat, lng });
        return;
      }

      if (trackedOrder?.store_id) {
        // 1. Check local cache first
        const cacheKey = `store_coords_${trackedOrder.store_id}`;
        const cachedCoords = storage.getObject<{ lat: number; lng: number }>(cacheKey);
        
        if (cachedCoords) {
          console.log('[OrderTracking] Using cached store coordinates');
          setStoreCoords(cachedCoords);
          return;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/stores/${trackedOrder.store_id}`);
          const data = await response.json();
          if (data.success && data.data) {
            const fallbackLat = parseCoordinate(data.data.latitude);
            const fallbackLng = parseCoordinate(data.data.longitude);
            if (fallbackLat !== null && fallbackLng !== null) {
              const coords = { lat: fallbackLat, lng: fallbackLng };
              setStoreCoords(coords);
              // Save to cache for future use
              storage.setItem(cacheKey, coords);
            }
          }
        } catch (error) {
          console.error('[OrderTracking] Failed to fetch fallback store location:', error);
        }
      }
    };

    fetchStoreLocation();
  }, [trackedOrder?.id, trackedOrder?.store_id, trackedOrder?.store_lat, trackedOrder?.store_lng]);

  const storeLat = storeCoords?.lat ?? null;
  const storeLng = storeCoords?.lng ?? null;
  
  const userLat = parseCoordinate(
    trackedOrder?.delivery_address?.latitude ??
    trackedOrder?.delivery_address?.lat ??
    trackedOrder?.user_lat
  );
  const userLng = parseCoordinate(
    trackedOrder?.delivery_address?.longitude ??
    trackedOrder?.delivery_address?.lng ??
    trackedOrder?.user_lng
  );
  const hasMapCoordinates =
    storeLat !== null &&
    storeLng !== null &&
    userLat !== null &&
    userLng !== null;

  const getStatusDisplay = () => {
    const status = trackedOrder?.status;
    if (!status || status === 'pending') return 'Confirmed';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  const isPacked = trackedOrder?.is_packed || ['packed', 'ready', 'assigned', 'out_for_delivery', 'delivered'].includes(trackedOrder?.status);
  const isAssigned = trackedOrder?.delivery_boy_opted || ['assigned', 'out_for_delivery', 'delivered'].includes(trackedOrder?.status);
  const isOutForDelivery = trackedOrder?.is_given_to_delivery_boy || ['out_for_delivery', 'delivered'].includes(trackedOrder?.status);
  const isDelivered = trackedOrder?.is_completed || trackedOrder?.status === 'delivered';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Interactive Map (Flex: 1 fills remaining area) */}
      <View style={styles.mapContainer}>
        {hasMapCoordinates ? (
          <LiveMap
            storeLocation={{ lat: storeLat, lng: storeLng }}
            userLocation={{ lat: userLat, lng: userLng }}
            driverLocation={driverCoords}
            orderStatus={trackedOrder?.status}
          />
        ) : (
          <View style={styles.mapErrorContainer}>
            {loadingOrder ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Icon name="map-outline" size={28} color="#888" />
            )}
            <Text style={styles.mapErrorText}>
              {loadingOrder
                ? 'Loading order map...'
                : orderError || 'Map coordinates are missing for this order.'}
            </Text>
          </View>
        )}
        
        <SafeAreaView style={styles.headerOverlay}>
          <TouchableOpacity onPress={onHome} style={styles.backButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </SafeAreaView>

        <View style={styles.timeTag}>
          <Text style={styles.timeTagText}>{getStatusDisplay().toUpperCase()}</Text>
        </View>
      </View>

      {/* Bottom Sheet Details (Draggable) */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
           <View style={styles.dragHandle} />
        </View>
        
        <ScrollView 
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.statusTitle}>Order Tracking</Text>
            <Text style={styles.statusDesc}>Track your order status and delivery partner live on the map.</Text>
          </View>
          
          <View style={styles.trackingSteps}>
            <View style={styles.step}>
               <View style={[styles.stepDot, styles.stepDotActive]} />
               <Text style={styles.stepTextActive}>Confirmed</Text>
            </View>
            <View style={[styles.stepLine, isPacked && styles.stepDotActive]} />
            
            <View style={styles.step}>
               <View style={[styles.stepDot, isPacked && styles.stepDotActive]} />
               <Text style={isPacked ? styles.stepTextActive : styles.stepText}>Packed</Text>
            </View>
            <View style={[styles.stepLine, isAssigned && styles.stepDotActive]} />
            
            <View style={styles.step}>
               <View style={[styles.stepDot, isAssigned && styles.stepDotActive]} />
               <Text style={isAssigned ? styles.stepTextActive : styles.stepText}>Assigned</Text>
            </View>
            <View style={[styles.stepLine, isOutForDelivery && styles.stepDotActive]} />
            
            <View style={styles.step}>
               <View style={[styles.stepDot, isDelivered && styles.stepDotActive]} />
               <Text style={isDelivered ? styles.stepTextActive : styles.stepText}>Delivered</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {trackedOrder?.delivery_pin && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionHeading}>Delivery Verification</Text>
              <View style={[styles.infoCard, { justifyContent: 'space-between', alignItems: 'center' }]}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Icon name="shield-checkmark" size={20} color={Colors.primary} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                       <Text style={styles.infoTitle}>Share PIN with Partner</Text>
                       <Text style={styles.infoSub}>Share this PIN only after receiving your order</Text>
                    </View>
                 </View>
                 <Text style={{ fontSize: 22, fontFamily: Fonts.black, color: Colors.primary, letterSpacing: 1 }}>
                    {trackedOrder.delivery_pin}
                 </Text>
              </View>
            </View>
          )}

          {trackedOrder?.delivery_boy_opted && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionHeading}>Delivery Partner</Text>
              <View style={styles.infoCard}>
                 <View style={styles.partnerAvatar}>
                    <Icon name="person" size={20} color="#fff" />
                 </View>
                 <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.infoTitle}>
                       {trackedOrder?.delivery_partner_name || 'Delivery Partner'}
                    </Text>
                    <Text style={styles.infoSub}>FreshRush Delivery Partner</Text>
                 </View>
                 <TouchableOpacity 
                    style={styles.callBtn}
                    onPress={() => {
                      if (trackedOrder?.delivery_partner_phone) {
                        Linking.openURL(`tel:${trackedOrder.delivery_partner_phone}`);
                      }
                    }}
                 >
                    <Icon name="call" size={18} color="#fff" />
                 </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Combined Bill & Summary Details */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionHeading}>Bill Details</Text>
            <View style={styles.billCard}>
               {trackedOrder?.items?.map((item: any, idx: number) => (
                  <View key={idx} style={styles.billRow}>
                     <Text style={styles.billLabel}>{item.quantity}x {item.name}</Text>
                     <Text style={styles.billValue}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
               ))}
               
               <View style={styles.divider} />
               
               <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Item Total</Text>
                  <Text style={styles.billValue}>₹{parseFloat(trackedOrder?.subtotal || 0).toFixed(2)}</Text>
               </View>
               <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Delivery Fee</Text>
                  <Text style={styles.billValue}>₹{parseFloat(trackedOrder?.delivery_fee || 0).toFixed(2)}</Text>
               </View>
               {parseFloat(trackedOrder?.extra_store_charge) > 0 && (
                 <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Extra Store Charge</Text>
                    <Text style={styles.billValue}>₹{parseFloat(trackedOrder?.extra_store_charge).toFixed(2)}</Text>
                 </View>
               )}
               {parseFloat(trackedOrder?.rainy_surge_fee) > 0 && (
                 <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Rainy Surge Fee</Text>
                    <Text style={styles.billValue}>₹{parseFloat(trackedOrder?.rainy_surge_fee).toFixed(2)}</Text>
                 </View>
               )}
               {parseFloat(trackedOrder?.late_night_fee) > 0 && (
                 <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Late Night Fee</Text>
                    <Text style={styles.billValue}>₹{parseFloat(trackedOrder?.late_night_fee).toFixed(2)}</Text>
                 </View>
               )}
               {parseFloat(trackedOrder?.delivery_tip) > 0 && (
                 <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Delivery Tip</Text>
                    <Text style={styles.billValue}>₹{parseFloat(trackedOrder?.delivery_tip).toFixed(2)}</Text>
                 </View>
               )}
               
               <View style={[styles.billRow, { marginTop: 10 }]}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>₹{(
                    parseFloat(trackedOrder?.total_amount || 0) || 
                    (parseFloat(trackedOrder?.subtotal || 0) + 
                     parseFloat(trackedOrder?.delivery_fee || 0) + 
                     parseFloat(trackedOrder?.extra_store_charge || 0) + 
                     parseFloat(trackedOrder?.rainy_surge_fee || 0) + 
                     parseFloat(trackedOrder?.late_night_fee || 0) + 
                     parseFloat(trackedOrder?.delivery_tip || 0) +
                     parseFloat(trackedOrder?.handling_fee || 0))
                  ).toFixed(2)}</Text>
               </View>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionHeading}>Order Details</Text>
            <View style={styles.infoCard}>
               <Icon name="basket" size={20} color={Colors.primary} />
               <View style={{ marginLeft: 12 }}>
                  <Text style={styles.infoTitle}>{trackedOrder?.store_name || "FreshRush Partner Store"}</Text>
                  <Text style={styles.infoSub}>Order ID: #{orderId?.split('-')[0].toUpperCase()}</Text>
               </View>
            </View>

            <View style={[styles.infoCard, { marginTop: 12 }]}>
               <Icon name="location" size={20} color="#FF3B30" />
               <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.infoTitle}>{trackedOrder?.delivery_address?.saveAs || "Home"}</Text>
                  <Text style={styles.infoSub}>{trackedOrder?.delivery_address?.line1}</Text>
               </View>
            </View>
          </View>

        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  mapContainer: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    position: 'relative',
  },
  mapErrorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF1F4',
    paddingHorizontal: 30,
  },
  mapErrorText: {
    color: '#666',
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingTop: 10,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  timeTag: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  timeTagText: {
    fontSize: 11,
    fontFamily: Fonts.black,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  dragHandleContainer: {
    width: '100%',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
  },
  statusTitle: {
    fontSize: 20,
    fontFamily: Fonts.black,
    color: '#333',
    marginBottom: 6,
  },
  statusDesc: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#888',
    lineHeight: 18,
    marginBottom: 25,
  },
  trackingSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  step: {
    alignItems: 'center',
  },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e0e0e0',
    marginBottom: 8,
  },
  stepDotActive: {
    backgroundColor: Colors.success,
  },
  stepText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#999',
  },
  stepTextActive: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#333',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
    marginBottom: 20,
  },
  orderInfoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  orderIdText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#666',
  },
  viewDetailsText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.black,
    color: '#333',
  },
  closeBtn: {
    padding: 5,
  },
  modalScroll: {
    paddingBottom: 40,
  },
  detailSection: {
    marginBottom: 25,
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#333',
  },
  infoSub: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#888',
    marginTop: 2,
  },
  partnerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billCard: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 15,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#666',
  },
  billValue: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: Fonts.black,
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontFamily: Fonts.black,
    color: Colors.primary,
  },
});

export default OrderTrackingScreen;
