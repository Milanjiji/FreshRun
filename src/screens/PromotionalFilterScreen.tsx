import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { API_BASE_URL } from '../config/api';
import { getOptimizedImageUrl } from '../utils/image';
import { TopCropImage } from '../components/TopCropImage';

interface PromotionalFilterScreenProps {
  route: any;
  navigation: any;
  addToCart: (product: any) => void;
  cartItems: any[];
  updateQuantity: (id: string, delta: number) => void;
}

const PromotionalFilterScreen: React.FC<PromotionalFilterScreenProps> = ({ 
  route, 
  navigation,
  addToCart,
  cartItems,
  updateQuantity
}) => {
  const { maxPrice, title, imageUrl } = route.params || {};
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products?include_inactive=false`);
      const result = await response.json();
      
      if (result.success && result.data) {
        let filtered = result.data;
        if (maxPrice !== undefined) {
          filtered = filtered.filter((p: any) => {
            // Check if product price or any of its variants price is <= maxPrice
            const hasVars = Array.isArray(p.variants) && p.variants.length > 0;
            if (hasVars) {
              return p.variants.some((v: any) => v.price <= maxPrice);
            }
            return p.price <= maxPrice;
          });
        }
        setProducts(filtered);
      }
    } catch (e) {
      console.error('Error fetching promotional products:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Special Offers'}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Banner area */}
          <View style={styles.storeBanner}>
            <View style={styles.imageContainer}>
              {imageUrl ? (
                <TopCropImage uri={getOptimizedImageUrl(imageUrl, 600)} containerStyle={styles.storeImage} />
              ) : (
                <View style={[styles.placeholderImage, { backgroundColor: Colors.primary }]}>
                  <Icon name="sparkles-outline" size={50} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.storeContent}>
              <Text style={styles.storeName}>{title || 'Amazing Deals'}</Text>
              <Text style={styles.storeDescription}>
                Selected fresh products filtered for your budget. Everything under ₹{maxPrice}.
              </Text>
            </View>
          </View>

          {/* Products List */}
          <View style={styles.productsSection}>
            <Text style={styles.sectionTitle}>FEATURED ITEMS</Text>

            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : products.length > 0 ? (
              products.map((product) => {
                const hasVars = Array.isArray(product.variants) && product.variants.length > 0;
                // Filter variants to only include those <= maxPrice if configured
                const allowedVariants = hasVars 
                  ? product.variants.filter((v: any) => maxPrice === undefined || v.price <= maxPrice)
                  : [];
                
                const finalHasVars = allowedVariants.length > 0;
                const activeVar = finalHasVars 
                  ? (selectedVariants[product.id] || allowedVariants[0]) 
                  : null;

                // Determine active values to show
                const displayPrice = activeVar ? activeVar.price : product.price;
                const displayDiscount = activeVar ? (activeVar.discount_percent || 0) : (product.discount_percent || 0);
                const displayStock = activeVar ? (activeVar.stock_quantity || 0) : (product.stock_quantity || 0);
                const displayStockOut = activeVar ? (activeVar.is_stock_out || false) : product.is_stock_out;
                const displayUnit = activeVar ? activeVar.unit : product.unit;
                const activeId = activeVar ? `${product.id}-${activeVar.id}` : product.id;
                
                const cartItem = cartItems.find(item => item.id === activeId);

                return (
                  <View key={product.id} style={[styles.productCard, !product.is_active && styles.productCardInactive]}>
                    <View style={styles.productInfo}>
                      <Text style={[styles.productName, !product.is_active && { color: '#999' }]}>{product.name}</Text>
                      
                      {product.store_name && (
                        <Text style={styles.storeTag}>By {product.store_name}</Text>
                      )}

                      {/* Show unit if not variants */}
                      {!finalHasVars && displayUnit ? (
                        <Text style={styles.productUnitText}>{displayUnit}</Text>
                      ) : null}

                      <Text style={styles.productDesc} numberOfLines={2}>
                        {product.description || 'Delicious item prepared with fresh ingredients.'}
                      </Text>

                      {/* Variants chips */}
                      {finalHasVars && (
                        <View style={styles.variantChipsContainer}>
                          {allowedVariants.map((v: any) => {
                            const isSelected = activeVar && activeVar.id === v.id;
                            return (
                              <TouchableOpacity
                                key={v.id}
                                style={[
                                  styles.variantChip,
                                  isSelected && styles.variantChipActive
                                ]}
                                onPress={() => {
                                  setSelectedVariants(prev => ({ ...prev, [product.id]: v }));
                                }}
                              >
                                <Text style={[
                                  styles.variantChipText,
                                  isSelected && styles.variantChipTextActive
                                ]}>
                                  {v.unit}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}

                      <View style={styles.priceRow}>
                        <Text style={[styles.price, !product.is_active && { color: '#999' }]}>
                          ₹{displayDiscount > 0 
                            ? (displayPrice * (1 - displayDiscount / 100)).toFixed(0) 
                            : displayPrice}
                        </Text>
                        {displayDiscount > 0 && (
                          <Text style={styles.originalPrice}>₹{displayPrice}</Text>
                        )}
                        {displayDiscount > 0 && product.is_active && (
                          <Text style={styles.discount}>-{displayDiscount}% OFF</Text>
                        )}
                      </View>

                      {displayStockOut ? (
                        <Text style={styles.stockOut}>Out of Stock</Text>
                      ) : !product.is_active ? (
                        <Text style={styles.stockOut}>Currently Unavailable</Text>
                      ) : (
                        <Text style={styles.stockText}>In Stock: {displayStock}</Text>
                      )}
                    </View>
                    
                    <View style={styles.productImageContainer}>
                      {product.image_url ? (
                        <Image source={{ uri: getOptimizedImageUrl(product.image_url, 250) }} style={[styles.productImage, !product.is_active && { opacity: 0.5 }]} />
                      ) : (
                        <View style={styles.productPlaceholder}>
                          <Icon name="fast-food-outline" size={30} color="#eee" />
                        </View>
                      )}
                      {!product.is_active && (
                        <View style={styles.offTag}>
                           <Text style={styles.offTagText}>OFF</Text>
                        </View>
                      )}
                      {product.is_active && !displayStockOut && (
                        <View style={styles.addButtonContainer}>
                          {cartItem ? (
                            <View style={styles.qtyContainer}>
                              <TouchableOpacity 
                                style={styles.qtyBtn} 
                                onPress={() => updateQuantity(activeId, -1)}
                              >
                                <Icon name="remove" size={16} color={Colors.primary} />
                              </TouchableOpacity>
                              <Text style={styles.qtyText}>
                                {cartItem.quantity}
                              </Text>
                              <TouchableOpacity 
                                style={styles.qtyBtn} 
                                onPress={() => updateQuantity(activeId, 1)}
                              >
                                <Icon name="add" size={16} color={Colors.primary} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              style={styles.addButton} 
                              onPress={() => addToCart({ 
                                ...product,
                                id: activeId,
                                name: activeVar ? `${product.name} (${activeVar.unit})` : product.name,
                                price: displayPrice,
                                discount_percent: displayDiscount,
                                stock_quantity: displayStock,
                                is_stock_out: displayStockOut,
                                unit: displayUnit,
                                store_id: product.store_id,
                                handling_fee: product.store_handling_fee || 0 
                              })}
                            >
                              <Text style={styles.addButtonText}>ADD</Text>
                              <Icon name="add" size={16} color={Colors.primary} />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="basket-outline" size={60} color="#eee" />
                <Text style={styles.emptyText}>No products found matching the criteria.</Text>
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
    marginBottom: 5,
    lineHeight: 20,
  },
  productsSection: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    minHeight: 500,
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
    marginBottom: 2,
  },
  storeTag: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.primary,
    marginBottom: 6,
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
  originalPrice: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
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
  addButtonContainer: {
    position: 'absolute',
    bottom: -5,
  },
  qtyContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 80,
    height: 32,
  },
  qtyBtn: {
    padding: 4,
  },
  qtyText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    paddingHorizontal: 10,
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
  productCardInactive: {
    backgroundColor: '#fafafa',
    borderColor: '#eee',
    opacity: 0.8,
  },
  offTag: {
    position: 'absolute',
    bottom: 0,
    left: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    alignItems: 'center',
    borderRadius: 4,
  },
  offTagText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: Fonts.black,
  },
  productUnitText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    marginBottom: 4,
  },
  variantChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    marginTop: 2,
  },
  variantChip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  variantChipActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  variantChipText: {
    fontSize: 10.5,
    fontFamily: Fonts.bold,
    color: '#666',
  },
  variantChipTextActive: {
    color: Colors.primary,
  },
});

export default PromotionalFilterScreen;
