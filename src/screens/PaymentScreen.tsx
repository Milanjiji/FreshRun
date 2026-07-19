import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Alertt } from '../components/Alertt';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';

interface PaymentScreenProps {
  cartItems: any[];
  totalAmount: number;
  userData: any;
  userToken: string | null;
  appSettings: any;
  onBack: () => void;
  onOrderConfirmed: (orderId: string, paymentMode: 'cod' | 'online') => void;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({
  cartItems,
  totalAmount,
  userData,
  userToken,
  appSettings,
  onBack,
  onOrderConfirmed,
}) => {
  const isCodEnabled = appSettings?.cod_enabled !== false;

  const [selectedMethod, setSelectedMethod] = useState<'cod' | 'online'>(
    isCodEnabled ? 'cod' : 'online'
  );

  // React to real-time COD disable: if user has COD selected and admin turns it off, alert and switch
  useEffect(() => {
    if (!isCodEnabled && selectedMethod === 'cod') {
      setSelectedMethod('online');
      Alertt.alert(
        'Payment Method Unavailable',
        'Cash on Delivery has been disabled by the administrator. Your payment method has been switched to Online Payment.'
      );
    }
  }, [isCodEnabled]);

  const handleConfirmOrder = () => {
    if (cartItems.length === 0) {
      Alertt.alert('Error', 'Cart is empty');
      return;
    }
    // Transition to the OrderConfirmingScreen with the selected mode
    onOrderConfirmed('PENDING_ORDER_ID', selectedMethod);
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

          {/* COD Option — only shown if cod_enabled */}
          {isCodEnabled && (
            <TouchableOpacity
              style={[styles.paymentMethodBox, selectedMethod === 'cod' && styles.selectedBox]}
              onPress={() => setSelectedMethod('cod')}
              activeOpacity={0.9}
            >
              <View style={styles.iconContainer}>
                <Icon name="cash-outline" size={24} color={selectedMethod === 'cod' ? Colors.primary : '#888'} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>Cash on Delivery</Text>
                <Text style={styles.methodDesc}>Pay cash when order arrives</Text>
              </View>
              <Icon
                name={selectedMethod === 'cod' ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={selectedMethod === 'cod' ? Colors.primary : '#ccc'}
              />
            </TouchableOpacity>
          )}

          {/* Online Payment */}
          <TouchableOpacity
            style={[styles.paymentMethodBox, selectedMethod === 'online' && styles.selectedBox]}
            onPress={() => setSelectedMethod('online')}
            activeOpacity={0.9}
          >
            <View style={styles.iconContainer}>
              <Icon name="card-outline" size={24} color={selectedMethod === 'online' ? Colors.primary : '#888'} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodName}>Online Payment</Text>
              <Text style={styles.methodDesc}>Pay securely via Razorpay (UPI, Card, Wallet)</Text>
            </View>
            <Icon
              name={selectedMethod === 'online' ? "radio-button-on" : "radio-button-off"}
              size={24}
              color={selectedMethod === 'online' ? Colors.primary : '#ccc'}
            />
          </TouchableOpacity>

          {/* COD disabled notice */}
          {!isCodEnabled && (
            <View style={styles.codDisabledNotice}>
              <Icon name="information-circle-outline" size={16} color="#888" />
              <Text style={styles.codDisabledText}>
                Cash on Delivery is currently unavailable. Please pay online.
              </Text>
            </View>
          )}

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
            <Text style={styles.confirmBtnText}>
              {selectedMethod === 'cod' ? 'Confirm Order' : 'Proceed to Pay'}
            </Text>
            <Icon name={selectedMethod === 'cod' ? "checkmark-circle" : "shield-checkmark"} size={18} color="#fff" />
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
    borderColor: 'transparent',
    marginBottom: 15,
  },
  selectedBox: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  codDisabledNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ffe082',
  },
  codDisabledText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#795548',
    lineHeight: 16,
  },
  amountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
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
