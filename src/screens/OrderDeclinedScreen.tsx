import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';

interface OrderDeclinedScreenProps {
  onBack: () => void;
}

const OrderDeclinedScreen: React.FC<OrderDeclinedScreenProps> = ({ onBack }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="close-circle" size={80} color={Colors.error} />
        </View>
        <Text style={styles.title}>Order Declined</Text>
        <Text style={styles.message}>
          We're sorry, but the store is currently unable to accept your order. 
          Any payments made will be refunded automatically.
        </Text>
        
        <TouchableOpacity style={styles.button} onPress={onBack}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 20,
    backgroundColor: '#ffebee',
    borderRadius: 60,
    padding: 10,
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.black,
    color: '#333',
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});

export default OrderDeclinedScreen;
