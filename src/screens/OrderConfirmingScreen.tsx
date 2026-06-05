import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { API_BASE_URL } from '../config/api';

interface OrderConfirmingScreenProps {
  cartItems: any[];
  totalAmount: number;
  deliveryFee: number;
  deliveryTip: number;
  rainyFee: number;
  lateNightFee: number;
  userData: any;
  locationData?: { latitude: number; longitude: number } | null;
  userToken: string | null;
  onSuccess: (orderId: string, order: any) => void;
  onFailure: () => void;
  isSelfPickup?: boolean;
}

const OrderConfirmingScreen: React.FC<OrderConfirmingScreenProps> = ({
  cartItems,
  totalAmount,
  deliveryFee,
  deliveryTip,
  rainyFee,
  lateNightFee,
  userData,
  locationData,
  userToken,
  onSuccess,
  onFailure,
  isSelfPickup = false,
}) => {
  const [success, setSuccess] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    const placeOrder = async () => {
      try {
        const storeId = String(cartItems[0].store_id || cartItems[0].storeId);
        
        const payload = {
          store_id: storeId,
          items: cartItems,
          total_amount: totalAmount,
          subtotal: totalAmount - deliveryFee - deliveryTip - rainyFee - lateNightFee,
          delivery_fee: deliveryFee,
          delivery_tip: deliveryTip,
          rainy_surge_fee: rainyFee,
          late_night_fee: lateNightFee,
          is_pickup: isSelfPickup,
          delivery_address: {
            line1: `${userData?.houseNumber ? userData.houseNumber + ', ' : ''}${userData?.addressLine || ''}`,
            line2: userData?.landmark || '',
            city: userData?.city || '',
            pincode: userData?.pincode || '',
            latitude: userData?.currentAddressLatitude ?? locationData?.latitude ?? null,
            longitude: userData?.currentAddressLongitude ?? locationData?.longitude ?? null,
          },
          address_id: userData?.currentAddressId,
        };

        console.log('\n📝 [OrderPlacement] STEP 1: Sending order payload to backend:');
        console.log(JSON.stringify(payload, null, 2));

        const response = await fetch(`${API_BASE_URL}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log('\n📥 [OrderPlacement] STEP 4: Received order placement response:');
        console.log(JSON.stringify(data, null, 2));

        if (!isMounted) return;

        if (data.success && data.order) {
          setSuccess(true);
          
          Animated.parallel([
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 5,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            })
          ]).start();

          setTimeout(() => {
            if (isMounted) onSuccess(data.order.id, data.order);
          }, 2000);
        } else {
          Alert.alert('Error', data.error || 'Failed to place order');
          onFailure();
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('❌ [OrderPlacement] Error placing order:', error);
        Alert.alert('Error', 'Something went wrong while placing the order.');
        onFailure();
      }
    };

    // Small delay to ensure the UI renders before starting heavy work
    setTimeout(() => placeOrder(), 500);

    return () => {
      isMounted = false;
    };
  }, [
    cartItems,
    onFailure,
    onSuccess,
    totalAmount,
    userData?.addressLine,
    userData?.city,
    userData?.currentAddressId,
    userData?.currentAddressLatitude,
    userData?.currentAddressLongitude,
    userData?.houseNumber,
    userData?.landmark,
    userData?.pincode,
    locationData?.latitude,
    locationData?.longitude,
    userToken,
    isSelfPickup,
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.container}>
        {success ? (
          <Animated.View style={[styles.content, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.successIconCircle}>
              <Icon name="checkmark" size={80} color={Colors.primary} />
            </View>
            <Text style={styles.titleText}>Order Confirmed!</Text>
          </Animated.View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.holdOnText}>Breathe In</Text>
            <ActivityIndicator size="large" color="#fff" style={styles.spinner} />
            <Text style={styles.subText}>Placing your order...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.primary },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  holdOnText: {
    fontSize: 32,
    fontFamily: Fonts.black,
    color: '#fff',
    marginBottom: 30,
    letterSpacing: 1,
  },
  spinner: {
    transform: [{ scale: 2 }],
    marginVertical: 20,
  },
  subText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#fff',
    marginTop: 30,
    opacity: 0.9,
  },
  titleText: {
    fontSize: 26,
    fontFamily: Fonts.black,
    color: '#fff',
  },
});

export default OrderConfirmingScreen;
