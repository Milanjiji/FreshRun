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
      const baseUrl = 'https://freshrun-backend.onrender.com';
      
      const storeRes = await fetch(`${baseUrl}/stores?category=${selectedCategory}&is_veg=${isVeg}`);
      const storeResult = await storeRes.json();
      if (storeResult.success) {
        setStores(storeResult.data);
      }

      const productRes = await fetch(`${baseUrl}/products?category=${selectedCategory}&is_veg=${isVeg}`);
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
        stickyHeaderIndices={[1]}
      >
        {/* Original Category Tabs */}
        <View style={styles.categorySection}>
          <View style={styles.categoryContainer}>
            {categories.map((cat) => (
              <TouchableOpacity 
                key={cat.id} 
                style={[
                  styles.categoryBox, 
                  selectedCategory === cat.id && styles.activeCategoryBox
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <View style={[styles.iconBox, selectedCategory === cat.id && styles.activeIconBox]}>
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                </View>
                <Text style={[
                  styles.categoryLabel,
                  selectedCategory === cat.id && styles.activeCategoryLabel
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Original Sticky Header Section */}
        <View style={styles.stickySection}>
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
                <TouchableOpacity key={product.id} style={styles.mindItem}>
                  <View style={styles.mindImageContainer}>
                    {product.image_url ? (
                      <Image source={{ uri: product.image_url }} style={styles.mindImage} />
                    ) : (
                      <Icon name="fast-food-outline" size={24} color="#ccc" />
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
                  style={styles.storeCard}
                  onPress={() => onStorePress(store)}
                >
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: store.image_url }} style={styles.storeImage} />
                    <TouchableOpacity style={styles.heartButton}>
                      <Icon name="heart-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                    
                    {displayDiscount > 0 && (
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
                      <Text style={styles.storeName}>{store.name}</Text>
                      <View style={styles.ratingContainer}>
                        <Icon name="star" size={12} color="#fff" />
                        <Text style={styles.ratingText}>4.3 (196)</Text>
                      </View>
                    </View>

                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>Calicut, 6.6 km</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.metaText}>₹299 for two</Text>
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
  categorySection: {
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  categoryBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 5,
    borderRadius: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  activeCategoryBox: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
    borderWidth: 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeIconBox: {
    backgroundColor: Colors.primary + '15',
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#666',
  },
  activeCategoryLabel: {
    color: Colors.primary,
    fontFamily: Fonts.bold,
  },
  stickySection: {
    backgroundColor: '#fff',
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  ratingText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Fonts.bold,
    marginLeft: 3,
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
  }
});

export default HomeScreen;
