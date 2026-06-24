import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  TextInput,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import io from 'socket.io-client';
import HomeHeader from '../components/HomeHeader';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_BASE_URL } from '../config/api';
import DebugMapScreen from './DebugMapScreen';
import { storage } from '../utils/storage';
import { calculateDistance, estimateDeliveryTime, formatDeliveryTime } from '../utils/distance';
import { getOptimizedImageUrl } from '../utils/image';
import { TopCropImage } from '../components/TopCropImage';
import CartFooter from '../components/CartFooter';
import ActiveOrderWidget from '../components/ActiveOrderWidget';


interface HomeScreenProps {
  userData: any;
  locationData: any;
  onLogout: () => void;
  onAddressPress?: () => void;
  onProfilePress?: () => void;
  onStorePress: (store: any) => void;
  onBannerPress?: (actionType: string, payload: any, imageUrl?: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ 
  userData, 
  locationData,
  onAddressPress,
  onProfilePress,
  onStorePress,
  onBannerPress,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    return storage.getString('last_visited_category') || 'restaurants';
  });
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVeg, setIsVeg] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showDebugMap, setShowDebugMap] = useState(false);
  const [avgDeliveryTime, setAvgDeliveryTime] = useState<number>(20);

  const scrollY = useRef(new Animated.Value(0)).current;

  const searchY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [80, 0],
    extrapolate: 'clamp',
  });

  const categoryY = scrollY.interpolate({
    inputRange: [0, 270],
    outputRange: [330, 60],
    extrapolate: 'clamp',
  });

  const socketRef = useRef<any>(null);
  const bannerScrollRef = useRef<ScrollView>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const { width: screenWidth } = Dimensions.get('window');
  const bannerWidth = screenWidth - 30; // 15px padding on each side
  const snapInterval = bannerWidth + 15; // Width + Gap

  // Auto-scroll banners
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prev) => {
          const nextIndex = (prev + 1) % banners.length;
          bannerScrollRef.current?.scrollTo({ x: nextIndex * snapInterval, animated: true });
          return nextIndex;
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [banners.length, snapInterval]);

  const [categories, setCategories] = useState<any[]>([
    { id: "restaurants", name: "RESTAURANTS", icon: "restaurant-outline" },
    { id: "street-food", name: "STREET FOOD", icon: "pizza-outline" },
    { id: "groceries", name: "GROCERIES", icon: "cart-outline" },
    { id: "chicken", name: "CHICKEN", icon: "egg-outline" },
    { id: "fish", name: "FISH", icon: "fish-outline" },
    { id: "medicine", name: "MEDICINE", icon: "medkit-outline" }
  ]);

  // Save selected category to storage whenever it changes
  useEffect(() => {
    if (selectedCategory) {
      storage.setItem('last_visited_category', selectedCategory);
    }
  }, [selectedCategory]);

  // Load cached delivery time on mount
  useEffect(() => {
    const cachedData = storage.getObject<any>('cached_delivery_time');
    if (cachedData && cachedData.avgTime) {
      console.log('[DeliveryTime] Loading initial average from cache:', cachedData.avgTime, 'mins');
      setAvgDeliveryTime(cachedData.avgTime);
    }
  }, []);

  useEffect(() => {
    socketRef.current = io(API_BASE_URL);

    socketRef.current.on('product_updated', (updatedProduct: any) => {
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p));
    });

    socketRef.current.on('store_updated', (updatedStore: any) => {
      setStores(prev => prev.map(s => s.id === updatedStore.id ? { ...s, ...updatedStore } : s));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);



  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const result = await response.json();
        if (result.success && result.data) {
          const formatted = result.data.map((cat: any) => ({
            id: cat.slug,
            name: cat.name.toUpperCase(),
            icon: cat.icon || 'cart-outline'
          }));
          setCategories(formatted);
          if (formatted.length > 0 && !selectedCategory) {
            setSelectedCategory(formatted[0].id);
          }
        }
      } catch (err) {
        console.error('[HomeScreen] Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const filters = ["Fast Delivery", "Rating 4.0+", "Pure Veg", "Offers"];

  const fetchProductsForCategory = async () => {
    try {
      const baseUrl = API_BASE_URL;
      const productRes = await fetch(`${baseUrl}/products?category=${selectedCategory}&is_veg=${isVeg}&include_inactive=true`);
      const productResult = await productRes.json();
      if (productResult.success) {
        setProducts(productResult.data);
      }
    } catch (e) {
      console.error('[HomeScreen] Error fetching products:', e);
    }
  };

  useEffect(() => {
    console.log('[HomeScreen] Location changed, triggering fresh fetch...');
    fetchHomeData();
  }, [selectedCategory, isVeg, locationData?.latitude, locationData?.longitude]);

  const fetchHomeData = async () => {
    setLoading(true); // Always show loading when fetching fresh data
    console.log('[HomeScreen] fetchHomeData started');
    try {
      const baseUrl = API_BASE_URL;

      // 0. Fetch Banners
      try {
        const bannerRes = await fetch(`${baseUrl}/banners`);
        const bannerData = await bannerRes.json();
        if (bannerData.success) {
          setBanners(bannerData.data);
        }
      } catch (err) {
        console.error('[HomeScreen] Error fetching banners:', err);
      }

      // 1. Fetch Global Settings
      const settingsRes = await fetch(`${baseUrl}/settings`);
      const settingsResult = await settingsRes.json();
      const globalMaxRadius = parseFloat(settingsResult?.data?.global_max_delivery_radius || '10.0');
      console.log('[HomeScreen] Global Max Radius:', globalMaxRadius);

      // 2. Fetch stores including inactive ones
      console.log(`[HomeScreen] Fetching stores for category: ${selectedCategory}, isVeg: ${isVeg}`);
      const storeRes = await fetch(`${baseUrl}/stores?category=${selectedCategory}&is_veg=${isVeg}&include_inactive=true&include_pending=true`);
      const storeResult = await storeRes.json();
      
      if (storeResult.success && storeResult.data) {
        const fetchedStores = storeResult.data;
        console.log(`[HomeScreen] Total stores fetched from server: ${fetchedStores.length}`);
        
        if (locationData?.latitude && locationData?.longitude && fetchedStores.length > 0) {
          console.log(`[HomeScreen] User Location: ${locationData.latitude}, ${locationData.longitude}`);
          const latKey = locationData.latitude.toFixed(4);
          const lngKey = locationData.longitude.toFixed(4);
          const locKey = `${latKey}|${lngKey}|${!!locationData.isFromAddress}`;
          const currentFullKey = `${locKey}|${selectedCategory}|${isVeg}`;
          
          // 1. Get the existing multi-cache for this specific location
          // 2. If it's a NEW location, we clear everything to keep it fresh
          const lastCache = storage.getObject<any>('home_multi_cache');
          
          if (lastCache && lastCache.locKey === locKey && lastCache.results[currentFullKey]) {
            const cached = lastCache.results[currentFullKey];
            console.log(`[HomeCache] HIT: category '${selectedCategory}' from cache (${locationData.isFromAddress ? 'Address' : 'GPS'})`);
            console.log(`[HomeCache] Loaded ${cached.stores.length} stores from cache`);
            setAvgDeliveryTime(cached.avgTime);
            setStores(cached.stores);
          } else {
            console.log(`[HomeCache] MISS: calculating '${selectedCategory}' for ${locationData.isFromAddress ? 'Address' : 'GPS'}`);
            
            let totalTime = 0;
            const serviceableStores: any[] = [];

            fetchedStores.forEach((s: any) => {
              const storeLat = parseFloat(s.latitude);
              const storeLng = parseFloat(s.longitude);
              
              console.log(`--- Calculating for store: ${s.name} (ID: ${s.id}) ---`);
              console.log(`Store Coords: ${storeLat}, ${storeLng}`);

              if (!isNaN(storeLat) && !isNaN(storeLng)) {
                const dist = calculateDistance(locationData.latitude, locationData.longitude, storeLat, storeLng);
                console.log(`Distance to user: ${dist.toFixed(2)} km`);

                if (dist <= globalMaxRadius) {
                  const time = estimateDeliveryTime(dist);
                  totalTime += time;
                  serviceableStores.push({ ...s, distance: dist, deliveryTime: time });
                  console.log(`Result: SERVICEABLE (within ${globalMaxRadius}km)`);
                } else {
                  console.log(`Result: NOT SERVICEABLE (too far, exceeds ${globalMaxRadius}km)`);
                }
              } else {
                console.log('Result: INVALID COORDINATES (NaN)');
              }
            });
            
            console.log(`[HomeScreen] Final serviceable stores count: ${serviceableStores.length}`);
            const avg = serviceableStores.length > 0 ? Math.round(totalTime / serviceableStores.length) : 0;
            setAvgDeliveryTime(avg);
            setStores(serviceableStores);
            
            // Manage multi-layer cache: 
            // If location changed entirely, start fresh. Otherwise, append the new category result.
            let newCache;
            if (lastCache && lastCache.locKey === locKey) {
              newCache = { ...lastCache, results: { ...lastCache.results, [currentFullKey]: { avgTime: avg, stores: serviceableStores } } };
            } else {
              newCache = { locKey, results: { [currentFullKey]: { avgTime: avg, stores: serviceableStores } } };
            }
            
            storage.setItem('home_multi_cache', newCache);
            console.log(`[HomeCache] SAVED: result added to location cache.`);
          }
        } else {
          console.log('[HomeScreen] No user location or no stores fetched. Setting stores as is.');
          setStores(fetchedStores);
        }
      } else {
        console.log('[HomeScreen] Failed to fetch stores or no data returned:', storeResult);
      }

      // Fetch products including inactive/out of stock
      const productRes = await fetch(`${baseUrl}/products?category=${selectedCategory}&is_veg=${isVeg}&include_inactive=true`);
      const productResult = await productRes.json();
      if (productResult.success) {
        setProducts(productResult.data);
      }
    } catch (error) {
      console.error('fetchHomeData Error:', error);
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

  const handleFilterPress = (filter: string) => {
    if (activeFilter === filter) {
      setActiveFilter(null);
      if (filter === "Pure Veg") {
        setIsVeg(false);
      }
    } else {
      setActiveFilter(filter);
      if (filter === "Pure Veg") {
        setIsVeg(true);
      }
    }
  };

  const getFilteredStores = () => {
    let result = [...stores];

    if (activeFilter === "Fast Delivery") {
      result.sort((a, b) => (a.deliveryTime || 0) - (b.deliveryTime || 0));
    } else if (activeFilter === "Offers") {
      result = result.filter(store => {
        const storeProducts = products.filter(p => p.store_id === store.id);
        const maxDiscount = storeProducts.reduce((max, p) => Math.max(max, p.discount_percent || 0), 0);
        const displayDiscount = store.max_discount || maxDiscount;
        return displayDiscount > 0;
      });
      result.sort((a, b) => {
        const getDiscount = (s: any) => {
          const storeProducts = products.filter(p => p.store_id === s.id);
          const maxDiscount = storeProducts.reduce((max, p) => Math.max(max, p.discount_percent || 0), 0);
          return s.max_discount || maxDiscount;
        };
        return getDiscount(b) - getDiscount(a);
      });
    }

    return result;
  };


  if (showDebugMap) {
    return <DebugMapScreen onBack={() => setShowDebugMap(false)} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={{ height: 80, overflow: 'hidden' }}>
          <HomeHeader 
            userData={userData} 
            avgTime={avgDeliveryTime}
            onProfilePress={onProfilePress}
            onAddressPress={onAddressPress}
            onProfileLongPress={() => setShowDebugMap(true)}
          />
        </View>

        {/* Spacer for search bar (H2 = 60) */}
        <View style={{ height: 60, backgroundColor: Colors.primary }} />

        {/* Dynamic Banners Carousel (Now inside a container with primary background to match) */}
        <View style={{ backgroundColor: Colors.primary }}>
          <View style={styles.bannerSection}>
            <ScrollView 
              ref={bannerScrollRef}
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.bannerScroll}
              snapToInterval={snapInterval}
              decelerationRate="fast"
              onMomentumScrollEnd={(e) => {
                const newIndex = Math.round(e.nativeEvent.contentOffset.x / snapInterval);
                setCurrentBannerIndex(newIndex);
              }}
            >
              {banners.length > 0 ? (
                banners.map((banner) => (
                  <TouchableOpacity 
                    key={banner.id} 
                    style={[styles.bannerCard, { width: bannerWidth }]}
                    onPress={() => onBannerPress && onBannerPress(banner.action_type, banner.action_payload, banner.image_url)}
                    activeOpacity={0.9}
                  >
                    <TopCropImage 
                      uri={getOptimizedImageUrl(banner.image_url, 600)} 
                      containerStyle={styles.bannerImage} 
                    />
                  </TouchableOpacity>
                ))
              ) : (
                /* Placeholder if no banners */
                <View style={[styles.bannerCard, styles.bannerPlaceholder, { width: bannerWidth }]}>
                  <Icon name="image-outline" size={40} color="#ccc" />
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Spacer for Category Pills (H4 = 64) with bottom rounded corners */}
        <View style={{ height: 64, backgroundColor: Colors.primary, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }} />

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
                        source={{ uri: getOptimizedImageUrl(product.image_url, 150) }} 
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
            {filters.map((filter, index) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => handleFilterPress(filter)}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{filter}</Text>
                </TouchableOpacity>
              );
            })}
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
          ) : getFilteredStores().length > 0 ? (
            getFilteredStores().map((store) => {
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
                      source={{ uri: getOptimizedImageUrl(store.image_url, 500) }} 
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
                      <Text style={styles.timeBadgeText}>
                        {store.deliveryTime 
                          ? (store.deliveryTime < 60 
                              ? `${store.deliveryTime - 5}-${store.deliveryTime + 5} MINS` 
                              : formatDeliveryTime(store.deliveryTime).toUpperCase())
                          : '25-30 MINS'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.storeInfo}>
                    <View style={styles.storeNameRow}>
                      <Text style={[styles.storeName, !store.is_active && { color: '#999' }]}>{store.name}</Text>
                    </View>

                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>{store.city || 'Calicut'}, {store.distance?.toFixed(1) || '6.6'} km</Text>
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
      </Animated.ScrollView>

      {/* Absolute Positioned Sticky SearchBar */}
      <Animated.View style={[styles.absoluteSearchBar, { transform: [{ translateY: searchY }] }]}>
        <View style={[styles.searchRow, { marginBottom: 0 }]}>
          <View style={styles.searchContainer}>
            <Icon name="search-outline" size={20} color={Colors.primary} />
            <TextInput 
              placeholder="Search for 'Pizza'" 
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity 
            style={[styles.vegToggle, isVeg && styles.vegToggleActive]}
            onPress={() => {
              const nextVeg = !isVeg;
              setIsVeg(nextVeg);
              if (nextVeg) {
                setActiveFilter("Pure Veg");
              } else if (activeFilter === "Pure Veg") {
                setActiveFilter(null);
              }
            }}
          >
            <Text style={[styles.vegText, isVeg && styles.vegTextActive]}>VEG</Text>
            <View style={[styles.toggleTrack, isVeg && styles.toggleTrackActive]}>
              <View style={[styles.toggleThumb, isVeg && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Absolute Positioned Sticky CategoryTabs */}
      <Animated.View style={[styles.absoluteCategoryTabs, { transform: [{ translateY: categoryY }] }]}>
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
                <Icon 
                  name={cat.icon} 
                  size={22} 
                  color={isActive ? Colors.white : 'rgba(255,255,255,0.5)'} 
                />
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      <CartFooter />
      <ActiveOrderWidget />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  absoluteSearchBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    zIndex: 10,
  },
  absoluteCategoryTabs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
  },
  // ── Category Pills ──────────────────────────────────────────────
  pillsContainer: {
    flexDirection: 'row',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 5,
    paddingBottom: 24,
    gap: 30,
  },
  pillBtn: {
    paddingVertical: 4,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pillBtnActive: {
    backgroundColor: 'transparent',
  },
  pillText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  pillTextActive: {
    color: Colors.white,
  },
  stickySection: {
    backgroundColor: Colors.primary,
    paddingTop: 0,
    paddingBottom: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
    backgroundColor: Colors.white,
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

  vegToggle: {
    width: 60,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegToggleActive: {
    borderColor: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  vegText: {
    fontSize: 9,
    fontFamily: Fonts.black,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  vegTextActive: {
    color: Colors.white,
  },
  toggleTrack: {
    width: 24,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: Colors.white,
  },
  toggleThumb: {
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 4,
  },
  toggleThumbActive: {
    backgroundColor: Colors.primary,
    transform: [{ translateX: 12 }],
  },
  bannerSection: {
    paddingVertical: 15,
  },
  bannerScroll: {
    paddingHorizontal: 15,
    gap: 15,
  },
  bannerCard: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
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
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#333',
  },
  filterTextActive: {
    color: '#fff',
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
    bottom: 15,
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
    bottom: 15,
    right: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 6,
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
    ...StyleSheet.absoluteFill,
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
