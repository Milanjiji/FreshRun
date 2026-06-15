import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';

interface ActiveOrder {
  id: string | number;
  status?: string;
  is_completed?: boolean;
  store_name?: string;
  created_at?: string;
  total_amount?: number | string;
}

interface ActiveOrderWidgetProps {
  orders: ActiveOrder[];
  onOrderPress: (orderId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  preparing: '#8B5CF6',
  out_for_delivery: '#10B981',
  delivered: '#22C55E',
  declined: '#EF4444',
  cancelled: '#6B7280',
};

const STATUS_ICONS: Record<string, string> = {
  pending: 'time-outline',
  confirmed: 'checkmark-circle-outline',
  preparing: 'restaurant-outline',
  out_for_delivery: 'bicycle',
  delivered: 'checkmark-circle',
  declined: 'close-circle',
  cancelled: 'close-circle-outline',
};

const getStatusLabel = (status?: string) => {
  if (!status || status === 'pending') return 'Confirmed';
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
};

const ActiveOrderWidget: React.FC<ActiveOrderWidgetProps> = ({ orders, onOrderPress }) => {
  // Never show declined orders in the widget
  const visibleOrders = orders.filter(o => o.status !== 'declined');

  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Reset to first order if orders change
  useEffect(() => {
    setCurrentIndex(0);
  }, [visibleOrders.length]);

  if (!visibleOrders || visibleOrders.length === 0) return null;

  // Clamp index in case orders reduce
  const safeIndex = Math.min(currentIndex, visibleOrders.length - 1);
  const currentOrder = visibleOrders[safeIndex];
  const status = currentOrder?.status || 'pending';
  const statusColor = STATUS_COLORS[status] || Colors.primary;
  const statusIcon = STATUS_ICONS[status] || 'bicycle';

  const animateTransition = (nextIndex: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -10, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setCurrentIndex(nextIndex);
      slideAnim.setValue(10);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = () => {
    const next = (safeIndex + 1) % visibleOrders.length;
    animateTransition(next);
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[styles.container, { borderLeftColor: statusColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Header row */}
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: statusColor }]}>
            <Icon name={statusIcon} size={14} color="#fff" />
          </View>
          <Text style={styles.statusText} numberOfLines={1}>
            {getStatusLabel(status)}
          </Text>
          {/* Cycle button (only if multiple orders) */}
          {visibleOrders.length > 1 && (
            <TouchableOpacity style={styles.cycleBtn} onPress={handleNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="swap-horizontal-outline" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Order info — tap to open tracking */}
        <TouchableOpacity
          style={styles.body}
          activeOpacity={0.75}
          onPress={() => onOrderPress(String(currentOrder.id))}
        >
          <Text style={styles.storeName} numberOfLines={1}>
            {currentOrder.store_name || 'Your Order'}
          </Text>
        </TouchableOpacity>

        {/* Dots indicator */}
        {visibleOrders.length > 1 && (
          <View style={styles.dotsRow}>
            {visibleOrders.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => animateTransition(i)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <View
                  style={[
                    styles.dot,
                    i === safeIndex && { backgroundColor: statusColor, width: 16 },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 30,
    right: 12,
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderLeftWidth: 4,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    minWidth: 170,
    maxWidth: 210,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  iconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.text,
  },
  cycleBtn: {
    padding: 2,
  },
  body: {
    paddingBottom: 4,
  },
  storeName: {
    fontFamily: Fonts.black,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 1,
  },
  trackRow: {
    display: 'none' as any,
  },
  trackText: {
    display: 'none' as any,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
});

export default ActiveOrderWidget;
