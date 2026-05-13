import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { API_BASE_URL } from '../config/api';

interface PaymentScreenProps {
  cartItems: any[];
  totalAmount: number;
  userData: any;
  userToken: string | null;
  onBack: () => void;
  onOrderConfirmed: (orderId: string) => void;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({
  cartItems,
  totalAmount,
  userData,
  userToken,
  onBack,
  onOrderConfirmed, // This will now just signal to move to the confirming screen
}) => {

  const handleConfirmOrder = () => {
    if (cartItems.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }
    // Instantly transition to the new OrderConfirmingScreen
    onOrderConfirmed('PENDING_ORDER_ID');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Options</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>SELECT PAYMENT METHOD</Text>
          
          <TouchableOpacity style={styles.paymentMethodBox} activeOpacity={0.9}>
            <View style={styles.iconContainer}>
              <Icon name="cash-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodName}>Cash on Delivery</Text>
              <Text style={styles.methodDesc}>Pay cash when order arrives</Text>
            </View>
            <Icon name="radio-button-on" size={24} color={Colors.primary} />
          </TouchableOpacity>

          {/* Amount Box */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Total Payable</Text>
            <Text style={styles.amountValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Sticky Footer */}
        <View style={styles.stickyFooter}>
          <TouchableOpacity 
            style={styles.confirmBtn} 
            onPress={handleConfirmOrder}
          >
            <Text style={styles.confirmBtnText}>Confirm Order</Text>
            <Icon name="checkmark-circle" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#333',
    marginLeft: 10,
  },
  content: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Fonts.black,
    color: '#999',
    letterSpacing: 1,
    marginBottom: 15,
    marginTop: 10,
  },
  paymentMethodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f0f5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  methodInfo: { flex: 1 },
  methodName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#333',
  },
  methodDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#888',
    marginTop: 2,
  },
  amountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  amountLabel: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: '#333',
  },
  amountValue: {
    fontSize: 20,
    fontFamily: Fonts.black,
    color: '#1a1a1a',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.black,
  },
});

export default PaymentScreen;
