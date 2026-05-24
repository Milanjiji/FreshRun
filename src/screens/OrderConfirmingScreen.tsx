import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { API_BASE_URL } from '../config/api';

interface OrderConfirmingScreenProps {
  cartItems: any[];
  totalAmount: number;
  userData: any;
  userToken: string | null;
  onSuccess: (orderId: string) => void;
  onFailure: () => void;
}

const OrderConfirmingScreen: React.FC<OrderConfirmingScreenProps> = ({
  cartItems,
  totalAmount,
  userData,
  userToken,
  onSuccess,
  onFailure,
}) => {
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const placeOrder = async () => {
      try {
        const storeId = String(cartItems[0].store_id || cartItems[0].storeId);
        
        const payload = {
          store_id: storeId,
          items: cartItems,
          total_amount: totalAmount,
          subtotal: totalAmount,
          delivery_address: {
            line1: `${userData?.houseNumber ? userData.houseNumber + ', ' : ''}${userData?.addressLine || ''}`,
            line2: userData?.landmark || '',
            city: userData?.city || '',
            pincode: userData?.pincode || '',
          },
          address_id: userData?.currentAddressId,
        };

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

        if (data.success && data.order) {
          setSuccess(true);
          setTimeout(() => {
            if (isMounted) onSuccess(data.order.id);
          }, 1500);
        } else {
          Alert.alert('Error', data.error || 'Failed to place order');
          onFailure();
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Order Error:', error);
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
    userData?.houseNumber,
    userData?.landmark,
    userData?.pincode,
    userToken,
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
      <View style={styles.container}>
        {success ? (
          <View style={styles.content}>
            <View style={styles.successIconCircle}>
              <Icon name="checkmark" size={60} color="#fff" />
            </View>
            <Text style={styles.titleText}>Order is Confirmed!</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.holdOnText}>Hold on</Text>
            <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
            <Text style={styles.subText}>Placing your order...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    width: '80%',
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.success || '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  holdOnText: {
    fontSize: 22,
    fontFamily: Fonts.black,
    color: '#333',
    marginBottom: 20,
  },
  spinner: {
    transform: [{ scale: 1.5 }],
    marginVertical: 10,
  },
  subText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#666',
    marginTop: 20,
  },
  titleText: {
    fontSize: 20,
    fontFamily: Fonts.black,
    color: '#333',
  },
});

export default OrderConfirmingScreen;
