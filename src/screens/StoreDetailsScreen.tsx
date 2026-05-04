import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';

interface StoreDetailsScreenProps {
  store: any;
  onBack: () => void;
}

const StoreDetailsScreen: React.FC<StoreDetailsScreenProps> = ({ store, onBack }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const baseUrl = 'https://freshrun-backend.onrender.com';
        const response = await fetch(`${baseUrl}/products?store_id=${store.id}`);
        const result = await response.json();
        if (result.success) {
          setProducts(result.data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [store.id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{store.name}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon}>
              <Icon name="search-outline" size={22} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon}>
              <Icon name="share-outline" size={22} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Store Info Banner */}
          <View style={styles.storeBanner}>
            <View style={styles.imageContainer}>
              {store.image_url ? (
                <Image source={{ uri: store.image_url }} style={styles.storeImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Icon name="image-outline" size={50} color="#ccc" />
                </View>
              )}
            </View>
            <View style={styles.storeContent}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.storeDescription}>{store.description || 'Quality products delivered fresh.'}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Icon name="time-outline" size={16} color={Colors.primary} />
                  <Text style={styles.metaText}>25-30 mins</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaItem}>
                  <Icon name="location-outline" size={16} color={Colors.primary} />
                  <Text style={styles.metaText}>{store.city || 'Calicut'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Products List */}
          <View style={styles.productsSection}>
            <Text style={styles.sectionTitle}>ALL PRODUCTS</Text>
            
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : products.length > 0 ? (
              products.map((product) => (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productDesc} numberOfLines={2}>
                      {product.description || 'Delicious item prepared with fresh ingredients.'}
                    </Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>₹{product.price}</Text>
                      {product.discount_percent > 0 && (
                        <Text style={styles.discount}>-{product.discount_percent}% OFF</Text>
                      )}
                    </View>
                    {product.is_stock_out ? (
                      <Text style={styles.stockOut}>Out of Stock</Text>
                    ) : (
                      <Text style={styles.stockText}>In Stock: {product.stock_quantity}</Text>
                    )}
                  </View>
                  <View style={styles.productImageContainer}>
                    {product.image_url ? (
                      <Image source={{ uri: product.image_url }} style={styles.productImage} />
                    ) : (
                      <View style={styles.productPlaceholder}>
                        <Icon name="fast-food-outline" size={30} color="#eee" />
                      </View>
                    )}
                    {!product.is_stock_out && (
                      <TouchableOpacity style={styles.addButton}>
                        <Text style={styles.addButtonText}>ADD</Text>
                        <Icon name="add" size={16} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="basket-outline" size={60} color="#eee" />
                <Text style={styles.emptyText}>No products available in this store yet.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#333',
    marginLeft: 10,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 15,
  },
  headerIcon: {
    padding: 5,
  },
  storeBanner: {
    padding: 15,
    backgroundColor: '#fff',
  },
  imageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    marginBottom: 15,
  },
  storeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeContent: {
    paddingHorizontal: 5,
  },
  storeName: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: '#333',
    marginBottom: 5,
  },
  storeDescription: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: '#333',
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
  },
  productsSection: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    minHeight: 400,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#999',
    letterSpacing: 1.5,
    marginBottom: 20,
    marginTop: 10,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eee',
  },
  productInfo: {
    flex: 1,
    marginRight: 15,
  },
  productName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#333',
    marginBottom: 4,
  },
  productDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#888',
    marginBottom: 10,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  price: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#333',
  },
  discount: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: '#999',
    marginTop: 8,
  },
  stockOut: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.error,
    marginTop: 8,
  },
  productImageContainer: {
    width: 110,
    height: 110,
    position: 'relative',
    alignItems: 'center',
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  productPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: -5,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButtonText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 15,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#999',
    textAlign: 'center',
  },
});

export default StoreDetailsScreen;
