import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import io from 'socket.io-client';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { API_BASE_URL } from '../config/api';
import LiveMap from '../components/LiveMap';

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
  const [showDetails, setShowDetails] = useState(false);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (activeOrder?.id === orderId) {
      setTrackedOrder(activeOrder);
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
          setTrackedOrder(data.order);
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
      return;
    }

    socketRef.current = io(API_BASE_URL);

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join_room', `order_${orderId}`);
    });

    socketRef.current.on('delivery_location_updated', (data: any) => {
      const lat = parseCoordinate(data.latitude);
      const lng = parseCoordinate(data.longitude);
      if (data.orderId === orderId && lat !== null && lng !== null) {
        setDriverCoords({ lat, lng });
      }
    });

    socketRef.current.on('order_status_changed', (updatedOrder: any) => {
      if (updatedOrder?.id === orderId) {
        setTrackedOrder(updatedOrder);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [orderId]);

  useEffect(() => {
    const fetchStoreLocation = async () => {
      setStoreCoords(null);
      const lat = parseCoordinate(trackedOrder?.store_lat);
      const lng = parseCoordinate(trackedOrder?.store_lng);

      // 1. Check if we already have both coordinates from the backend join
      if (lat !== null && lng !== null) {
        setStoreCoords({ lat, lng });
        return;
      }

      // 2. If missing, fetch from store details endpoint (Client-side fallback)
      if (trackedOrder?.store_id) {
        try {
          console.log(`[OrderTracking] Fetching missing store location for ID: ${trackedOrder.store_id}`);
          const response = await fetch(`${API_BASE_URL}/stores/${trackedOrder.store_id}`);
          const data = await response.json();
          if (data.success && data.data) {
            const fallbackLat = parseCoordinate(data.data.latitude);
            const fallbackLng = parseCoordinate(data.data.longitude);
            if (fallbackLat !== null && fallbackLng !== null) {
              setStoreCoords({ lat: fallbackLat, lng: fallbackLng });
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
  
  // Delivery coordinates come from the order/address relation, not the device location.
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

  useEffect(() => {
    console.log("--- OrderTrackingScreen Debug ---");
    console.log("Tracked Order ID:", trackedOrder?.id);
    console.log("Final Store Lat/Lng:", storeLat, storeLng);
    console.log("User Lat/Lng:", userLat, userLng);
    console.log("Backend provided store_lat:", trackedOrder?.store_lat);
    console.log("--------------------------------");
  }, [storeLat, storeLng, trackedOrder, userLat, userLng]);

  const renderDetailsModal = () => (
    <Modal
      visible={showDetails}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDetails(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Summary</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)} style={styles.closeBtn}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
            {/* Store Details */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionHeading}>Store Info</Text>
              <View style={styles.infoCard}>
                 <Icon name="basket" size={20} color={Colors.primary} />
                 <View style={{ marginLeft: 12 }}>
                    <Text style={styles.infoTitle}>{trackedOrder?.store_name || "FreshRun Partner Store"}</Text>
                    <Text style={styles.infoSub}>Order ID: #{orderId?.split('-')[0].toUpperCase()}</Text>
                 </View>
              </View>
            </View>

            {/* Delivery Partner */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionHeading}>Delivery Partner</Text>
              <View style={styles.infoCard}>
                 <View style={styles.partnerAvatar}>
                    <Icon name="person" size={20} color="#fff" />
                 </View>
                 <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.infoTitle}>Rahul Kumar</Text>
                    <Text style={styles.infoSub}>FreshRun Delivery Partner</Text>
                 </View>
                 <TouchableOpacity style={styles.callBtn}>
                    <Icon name="call" size={18} color="#fff" />
                 </TouchableOpacity>
              </View>
            </View>

            {/* Bill Details */}
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
                 {parseFloat(trackedOrder?.late_night_fee) > 0 && (
                   <View style={styles.billRow}>
                      <Text style={styles.billLabel}>Late Night Fee</Text>
                      <Text style={styles.billValue}>₹{parseFloat(trackedOrder?.late_night_fee).toFixed(2)}</Text>
                   </View>
                 )}
                 
                 <View style={[styles.billRow, { marginTop: 10 }]}>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalValue}>₹{parseFloat(trackedOrder?.total_amount || 0).toFixed(2)}</Text>
                 </View>
              </View>
            </View>

            {/* Delivery Address */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionHeading}>Delivery At</Text>
              <View style={styles.infoCard}>
                 <Icon name="location" size={20} color="#FF3B30" />
                 <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.infoTitle}>{trackedOrder?.delivery_address?.saveAs || "Home"}</Text>
                    <Text style={styles.infoSub}>{trackedOrder?.delivery_address?.line1}</Text>
                 </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Helper to format status display
  const getStatusDisplay = () => {
    const status = trackedOrder?.status;
    if (!status || status === 'pending') return 'Confirmed';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderDetailsModal()}
      
      {/* Interactive Map */}
      <View style={styles.mapContainer}>
        {hasMapCoordinates ? (
          <LiveMap
            storeLocation={{ lat: storeLat, lng: storeLng }}
            userLocation={{ lat: userLat, lng: userLng }}
            driverLocation={driverCoords}
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
        
        {/* Header Overlay */}
        <SafeAreaView style={styles.headerOverlay}>
          <TouchableOpacity onPress={onHome} style={styles.backButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Floating Status Tag */}
        <View style={styles.timeTag}>
          <Text style={styles.timeTagText}>{getStatusDisplay()}</Text>
          <Text style={styles.timeTagSub}>Order Status</Text>
        </View>
      </View>

      {/* Bottom Sheet Details */}
      <View style={styles.bottomSheet}>
        <View style={styles.dragHandle} />
        
        <Text style={styles.statusTitle}>Order Confirmed</Text>
        <Text style={styles.statusDesc}>Your order has been received by the store and is currently being processed.</Text>
        
        <View style={styles.trackingSteps}>
          {/* Stage 1: Order Confirmed */}
          <View style={styles.step}>
             <View style={[styles.stepDot, styles.stepDotActive]} />
             <Text style={styles.stepTextActive}>Confirmed</Text>
          </View>
          <View style={[styles.stepLine, trackedOrder?.is_packed && styles.stepDotActive]} />
          
          {/* Stage 2: Order Packed */}
          <View style={styles.step}>
             <View style={[styles.stepDot, trackedOrder?.is_packed && styles.stepDotActive]} />
             <Text style={trackedOrder?.is_packed ? styles.stepTextActive : styles.stepText}>Packed</Text>
          </View>
          <View style={[styles.stepLine, trackedOrder?.delivery_boy_opted && styles.stepDotActive]} />
          
          {/* Stage 3: Delivery Boy Assigned */}
          <View style={styles.step}>
             <View style={[styles.stepDot, trackedOrder?.delivery_boy_opted && styles.stepDotActive]} />
             <Text style={trackedOrder?.delivery_boy_opted ? styles.stepTextActive : styles.stepText}>Assigned</Text>
          </View>
          <View style={[styles.stepLine, trackedOrder?.is_given_to_delivery_boy && styles.stepDotActive]} />
          
          {/* Stage 4: Delivered */}
          <View style={styles.step}>
             <View style={[styles.stepDot, trackedOrder?.is_completed && styles.stepDotActive]} />
             <Text style={trackedOrder?.is_completed ? styles.stepTextActive : styles.stepText}>Delivered</Text>
          </View>
        </View>
        
        <View style={styles.orderInfoCard}>
          <Text style={styles.orderIdText}>Order #{orderId?.split('-')[0].toUpperCase()}</Text>
          <TouchableOpacity onPress={() => setShowDetails(true)}>
             <Text style={styles.viewDetailsText}>View details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  mapContainer: {
    flex: 0.65,
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
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.8,
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
    bottom: 35,
    right: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 15,
  },
  timeTagText: {
    fontSize: 22,
    fontFamily: Fonts.black,
    color: Colors.primary,
  },
  timeTagSub: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#888',
  },
  bottomSheet: {
    flex: 0.35,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    marginTop: -20,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
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
  // Modal Styles
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
  paymentMethod: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.success,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default OrderTrackingScreen;
