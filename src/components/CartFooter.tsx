import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import Icon from 'react-native-vector-icons/Ionicons';
import { useCartStore } from '../store/useCartStore';
import { useNavigation } from '@react-navigation/native';

const CartFooter: React.FC = () => {
  const navigation = useNavigation<any>();
  const cartItems = useCartStore((state) => state.cartItems);
  const getCartItemCount = useCartStore((state) => state.getCartItemCount);
  const getCartTotalPrice = useCartStore((state) => state.getCartTotalPrice);

  const itemCount = getCartItemCount();
  const totalPrice = getCartTotalPrice();

  if (itemCount === 0) return null;

  const lastItemImage = cartItems.length > 0 ? cartItems[cartItems.length - 1].image_url : undefined;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.content} onPress={() => navigation.navigate('Cart')} activeOpacity={0.9}>
        <View style={styles.leftSide}>
          <Text style={styles.deliveryText}>
            Add ₹{Math.max(0, 500 - totalPrice)} more to unlock
          </Text>
          <Text style={styles.freeDeliveryText}>FREE DELIVERY</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progress, { width: `${Math.min(100, (totalPrice / 500) * 100)}%` }]} />
          </View>
        </View>

        <View style={styles.rightSide}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartLabel}>CART</Text>
            <Text style={styles.itemCount}>{itemCount} ITEMS</Text>
          </View>
          {lastItemImage ? (
            <View style={styles.imageStack}>
              <Image source={{ uri: lastItemImage }} style={styles.itemImage} />
              <View style={[styles.imageOverlay, { right: -4, zIndex: -1 }]} />
              <View style={[styles.imageOverlay, { right: -8, zIndex: -2 }]} />
            </View>
          ) : (
            <Icon name="cart" size={24} color="#fff" />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  content: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    padding: 8,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  leftSide: {
    flex: 1,
  },
  deliveryText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  freeDeliveryText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.black,
    marginTop: 0,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: 6,
    width: '80%',
  },
  progress: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartInfo: {
    alignItems: 'flex-end',
  },
  cartLabel: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Fonts.black,
  },
  itemCount: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Fonts.bold,
    opacity: 0.8,
  },
  imageStack: {
    width: 36,
    height: 36,
    position: 'relative',
  },
  itemImage: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  imageOverlay: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: 36,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  }
});


export default CartFooter;
