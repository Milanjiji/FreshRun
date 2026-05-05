import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Image,
  TextInput,
} from 'react-native';
import HomeHeader from '../components/HomeHeader';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_BASE_URL } from '../config/api';


interface HomeScreenProps {
  userData: any;
  locationData: any;
  onLogout: () => void;
  onAddressPress?: () => void;
  onProfilePress?: () => void;
  onStorePress: (store: any) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ 
  userData, 
  locationData, 
  onLogout, 
  onAddressPress,
  onProfilePress,
  onStorePress,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('restaurants');
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVeg, setIsVeg] = useState(false);

  const categories = [
    { id: "restaurants", name: "Restaurants", icon: "🍴" },
    { id: "street-food", name: "Street Food", icon: "🍱" },
    { id: "groceries", name: "Groceries", icon: "🛒" }
  ];

  const filters = ["Fast Delivery", "Rating 4.0+", "Pure Veg", "Offers"];

  useEffect(() => {
    fetchHomeData();
  }, [selectedCategory, isVeg]);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const baseUrl = API_BASE_URL;

      
      // Fetch stores including inactive ones to show them as grayed out
      const storeRes = await fetch(`${baseUrl}/stores?category=${selectedCategory}&is_veg=${isVeg}&include_inactive=true`);
      const storeResult = await storeRes.json();
      if (storeResult.success) {
        setStores(storeResult.data);
      }

      // Fetch products including inactive/out of stock
      const productRes = await fetch(`${baseUrl}/products?category=${selectedCategory}&is_veg=${isVeg}&include_inactive=true`);
      const productResult = await productRes.json();
      if (productResult.success) {
        setProducts(productResult.data);
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleProductPress = async (product: any) => {
    if (!product.store_id) return;

    // 1. Try finding in currently loaded stores
    const store = stores.find(s => s.id === product.store_id);
    if (store) {
      onStorePress(store);
      return;
    }

    // 2. If not in current list, fetch specific store details
    try {
      const baseUrl = API_BASE_URL;
      const response = await fetch(`${baseUrl}/stores/${product.store_id}`);

      const result = await response.json();
      if (result.success && result.data) {
        onStorePress(result.data);
      }
    } catch (error) {
      console.error('Error fetching store for product:', error);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <HomeHeader 
        userData={userData} 
        locationData={locationData} 
        onProfilePress={onProfilePress}
        onAddressPress={onAddressPress}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky Section: Category Pills + Search Bar */}
        <View style={styles.stickySection}>

          {/* Category Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContainer}
          >
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.pillBtn, isActive && styles.pillBtnActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Search Row */}
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Icon name="search-outline" size={20} color="#666" />
              <TextInput 
                placeholder="Search for 'Pizza'" 
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity style={styles.micButton}>
                <Icon name="mic-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.vegToggle, isVeg && styles.vegToggleActive]}
              onPress={() => setIsVeg(!isVeg)}
            >
              <Text style={[styles.vegText, isVeg && styles.vegTextActive]}>VEG</Text>
              <View style={[styles.toggleTrack, isVeg && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, isVeg && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Circular Products (Whats on your mind) */}
        <View style={styles.mindSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.mindScroll}
          >
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => <View key={i} style={styles.skeletonCircle} />)
            ) : products.length > 0 ? (
              products.map((product) => (
                <TouchableOpacity 
                  key={product.id} 
                  style={[styles.mindItem, !product.is_active && { opacity: 0.7 }]}
                  onPress={() => product.is_active && handleProductPress(product)}
                >

                  <View style={styles.mindImageContainer}>
                    {product.image_url ? (
                      <Image 
                        source={{ uri: product.image_url }} 
                        style={[styles.mindImage, !product.is_active && { tintColor: 'gray' } as any]} 
                      />
                    ) : (
                      <Icon name="fast-food-outline" size={24} color="#ccc" />
                    )}
                    {!product.is_active && (
                      <View style={styles.notAvailableBadge}>
                        <Text style={styles.notAvailableText}>OFF</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.mindName} numberOfLines={1}>{product.name}</Text>
                </TouchableOpacity>

              ))
            ) : (
              <Text style={styles.noData}>No items found</Text>
            )}
          </ScrollView>

          {/* Filters */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.filterScroll}
          >
            {filters.map((filter, index) => (
              <TouchableOpacity key={index} style={styles.filterChip}>
                <Text style={styles.filterText}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Store Listing */}
        <View style={styles.storeListContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} to explore</Text>
            <Text style={styles.listSubtitle}>Featured {selectedCategory}</Text>
          </View>

          {loading ? (
            <View style={{ padding: 20 }}><Text>Loading stores...</Text></View>
          ) : stores.length > 0 ? (
            stores.map((store) => {
              const storeProducts = products.filter(p => p.store_id === store.id);
              const maxDiscount = storeProducts.reduce((max, p) => Math.max(max, p.discount_percent || 0), 0);
              const displayDiscount = store.max_discount || maxDiscount;

              return (
                <TouchableOpacity 
                  key={store.id} 
                  style={[styles.storeCard, !store.is_active && styles.storeCardInactive]}
                  onPress={() => onStorePress(store)}
                >
                  <View style={styles.imageContainer}>
                    <Image 
                      source={{ uri: store.image_url }} 
                      style={[styles.storeImage, !store.is_active && { opacity: 0.6 }]} 
                    />
                    {!store.is_active && (
                      <View style={styles.unserviceableOverlay}>
                         <Text style={styles.unserviceableTextOverlay}>CURRENTLY UNSERVICEABLE</Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.heartButton}>
                      <Icon name="heart-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                    
                    {displayDiscount > 0 && store.is_active && (
                      <View style={styles.promoBadge}>
                        <Text style={styles.promoText}>Upto {displayDiscount}% OFF</Text>
                      </View>
                    )}

                    <View style={styles.timeBadge}>
                      <Text style={styles.timeBadgeText}>25-30 MINS</Text>
                    </View>
                  </View>

                  <View style={styles.storeInfo}>
                    <View style={styles.storeNameRow}>
                      <Text style={[styles.storeName, !store.is_active && { color: '#999' }]}>{store.name}</Text>
                    </View>

                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>Calicut, 6.6 km</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.metaText}>₹1-299 for one</Text>
                    </View>
                    
                    <Text style={styles.cuisineText}>Beverages, Snacks, Desserts</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.noData}>No stores found in this category</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // ── Category Pills ──────────────────────────────────────────────
  pillsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  pillBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pillBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: '#555',
  },
  pillTextActive: {
    color: '#fff',
  },
  stickySection: {
    backgroundColor: Colors.white,
    paddingTop: 6,
    borderBottomWidth: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: '#333',
  },
  micButton: {
    padding: 5,
  },
  vegToggle: {
    width: 60,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegToggleActive: {
    borderColor: '#4caf50',
    backgroundColor: '#f1f8e9',
  },
  vegText: {
    fontSize: 9,
    fontFamily: Fonts.black,
    color: '#999',
    marginBottom: 2,
  },
  vegTextActive: {
    color: '#4caf50',
  },
  toggleTrack: {
    width: 24,
    height: 12,
    backgroundColor: '#ddd',
    borderRadius: 6,
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: '#a5d6a7',
  },
  toggleThumb: {
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  toggleThumbActive: {
    backgroundColor: '#4caf50',
    transform: [{ translateX: 12 }],
  },
  mindSection: {
    paddingVertical: 15,
  },
  mindScroll: {
    paddingLeft: 15,
    marginBottom: 15,
  },
  mindItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 70,
  },
  mindImageContainer: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  mindImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mindName: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#444',
    textAlign: 'center',
  },
  filterScroll: {
    paddingHorizontal: 15,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 10,
  },
  filterText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#333',
  },
  storeListContainer: {
    marginTop: 10,
  },
  listHeader: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  listTitle: {
    fontSize: 18,
    fontFamily: Fonts.black,
    color: '#1a1a1a',
  },
  listSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#888',
    marginTop: 2,
  },
  storeCard: {
    backgroundColor: '#fff',
    marginBottom: 25,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginHorizontal: 15,
  },
  imageContainer: {
    height: 180,
    position: 'relative',
  },
  storeImage: {
    width: '100%',
    height: '100%',
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 18,
    padding: 8,
  },
  promoBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  promoText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Fonts.black,
  },
  timeBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.black,
    color: '#333',
  },
  storeInfo: {
    padding: 12,
  },
  storeNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  storeName: {
    fontSize: 17,
    fontFamily: Fonts.black,
    color: '#1a1a1a',
  },


  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#666',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ccc',
    marginHorizontal: 8,
  },
  cuisineText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#888',
  },
  noData: {
    padding: 20,
    textAlign: 'center',
    color: '#999',
  },
  skeletonCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#f0f0f0',
    marginRight: 20,
  },
  unserviceableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  unserviceableTextOverlay: {
    fontSize: 14,
    fontFamily: Fonts.black,
    color: '#333',
    textAlign: 'center',
    letterSpacing: 1,
  },
  storeCardInactive: {
    backgroundColor: '#fafafa',
    borderColor: '#eee',
  },
  notAvailableBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  notAvailableText: {
    color: '#fff',
    fontSize: 8,
    fontFamily: Fonts.black,
  }
});


export default HomeScreen;
