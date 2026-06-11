import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { Alertt } from '../components/Alertt';
import { API_BASE_URL } from '../config/api';
import RazorpayCheckout from 'react-native-razorpay';

interface OrderConfirmingScreenProps {
  cartItems: any[];
  totalAmount: number;
  deliveryFee: number;
  deliveryTip: number;
  rainyFee: number;
  lateNightFee: number;
  extraStoreCharge?: number;
  userData: any;
  locationData?: { latitude: number; longitude: number } | null;
  userToken: string | null;
  onSuccess: (orderId: string, order: any) => void;
  onFailure: () => void;
  isSelfPickup?: boolean;
  paymentMode?: 'cod' | 'online';
}

const OrderConfirmingScreen: React.FC<OrderConfirmingScreenProps> = ({
  cartItems,
  totalAmount,
  deliveryFee,
  deliveryTip,
  rainyFee,
  lateNightFee,
  extraStoreCharge = 0,
  userData,
  locationData,
  userToken,
  onSuccess,
  onFailure,
  isSelfPickup = false,
  paymentMode = 'cod',
}) => {
  const [success, setSuccess] = useState(false);
  const [statusText, setStatusText] = useState('Placing your order...');
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
          subtotal: totalAmount - deliveryFee - deliveryTip - rainyFee - lateNightFee - extraStoreCharge,
          delivery_fee: deliveryFee,
          delivery_tip: deliveryTip,
          rainy_surge_fee: rainyFee,
          late_night_fee: lateNightFee,
          extra_store_charge: extraStoreCharge,
          is_pickup: isSelfPickup,
          payment_mode: paymentMode,
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
        
        let dbOrder;

        if (paymentMode === 'online') {
          setStatusText('Initiating secure payment...');
          
          // 1. Create Razorpay Session on Backend (no DB order created yet)
          const rzpRes = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userToken}`,
            },
            body: JSON.stringify({ total_amount: totalAmount }),
          });

          const rzpData = await rzpRes.json();
          if (!isMounted) return;
          if (!rzpData.success) {
            throw new Error(rzpData.error || 'Failed to create payment session');
          }

          // 2. Open Razorpay Checkout
          const options = {
            description: 'Order Payment',
            image: 'https://freshrun.in/logo.png',
            currency: rzpData.currency,
            key: rzpData.key,
            amount: rzpData.amount,
            name: 'FreshRush',
            order_id: rzpData.order_id,
            prefill: {
              email: userData?.email || '',
              contact: userData?.phone || '',
              name: userData?.fullName || ''
            },
            theme: { color: Colors.primary }
          };

          try {
            console.log("RZP_DATA", rzpData);
            console.log(
              "RAZORPAY_CHECKOUT_OPTIONS",
              JSON.stringify(options, null, 2)
            );
            const rzpSuccessResponse = await RazorpayCheckout.open(options);
            if (!isMounted) return;
            setStatusText('Verifying payment...');
            
            // 3. Verify Payment and Create Database Order on Backend
            const verifyRes = await fetch(`${API_BASE_URL}/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`,
              },
              body: JSON.stringify({
                ...rzpSuccessResponse,
                orderData: payload
              }),
            });

            const verifyData = await verifyRes.json();
            if (!isMounted) return;
            if (!verifyData.success || !verifyData.order) {
              throw new Error(verifyData.message || 'Payment verification failed');
            }
            dbOrder = verifyData.order;
          } catch (rzpError: any) {
            if (!isMounted) return;
            console.log('Razorpay Error:', rzpError);
            Alertt.alert('Payment Failed', rzpError.description || 'Payment was cancelled');
            onFailure();
            return;
          }
        } else {
          // COD Flow: Create Database Order immediately
          const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userToken}`,
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json();
          if (!isMounted) return;

          if (!data.success || !data.order) {
            throw new Error(data.error || 'Failed to place order');
          }

          dbOrder = data.order;
        }

        // 3. Finalize Success
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
          if (isMounted) onSuccess(dbOrder.id, dbOrder);
        }, 2000);

      } catch (error: any) {
        if (!isMounted) return;
        console.error('❌ [OrderPlacement] Error:', error);
        Alertt.alert('Order Failed', error.message || 'Something went wrong.');
        onFailure();
      }
    };

    setTimeout(() => placeOrder(), 500);

    return () => {
      isMounted = false;
    };
  }, [
    cartItems,
    onFailure,
    onSuccess,
    totalAmount,
    userData,
    locationData,
    userToken,
    isSelfPickup,
    paymentMode
  ]);

  const isNeutralTheme = !success && paymentMode === 'online';
  const bgColor = isNeutralTheme ? '#f8fafc' : Colors.primary;
  const barStyle = isNeutralTheme ? 'dark-content' : 'light-content';
  const barBgColor = isNeutralTheme ? '#f8fafc' : Colors.primary;
  const textColor = isNeutralTheme ? '#0f172a' : '#ffffff';
  const spinnerColor = isNeutralTheme ? Colors.primary : '#ffffff';
  const headerText = isNeutralTheme ? 'Awaiting Payment' : 'Breathe In';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={barStyle} backgroundColor={barBgColor} />
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {success ? (
          <Animated.View style={[styles.content, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.successIconCircle}>
              <Icon name="checkmark" size={80} color={Colors.primary} />
            </View>
            <Text style={styles.titleText}>Order Confirmed!</Text>
          </Animated.View>
        ) : (
          <View style={styles.content}>
            <Text style={[styles.holdOnText, { color: textColor }]}>{headerText}</Text>
            <ActivityIndicator size="large" color={spinnerColor} style={styles.spinner} />
            <Text style={[styles.subText, { color: textColor }]}>{statusText}</Text>
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
