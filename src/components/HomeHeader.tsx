import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { formatDeliveryTime } from '../utils/distance';
import { TopCropImage } from './TopCropImage';
import { getOptimizedImageUrl } from '../utils/image';

interface HomeHeaderProps {
  onAddressPress?: () => void;
  onProfilePress?: () => void;
  onProfileLongPress?: () => void;
  userData?: any;
  avgTime?: number;
  banners?: any[];
  onBannerPress?: (actionType: string, payload: any, imageUrl?: string) => void;
  categories?: any[];
  selectedCategory?: string;
  onCategorySelect?: (id: string) => void;
  searchQuery?: string;
  onSearchChange?: (text: string) => void;
  onSearchFocus?: () => void;
  onSearchClear?: () => void;
  isVeg?: boolean;
  onVegToggle?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const bannerWidth = screenWidth - 30; // 15px padding on each side
const snapInterval = bannerWidth + 15;

const HomeHeader: React.FC<HomeHeaderProps> = ({
  onAddressPress,
  onProfilePress,
  onProfileLongPress,
  userData,
  avgTime,
  banners = [],
  onBannerPress,
  categories = [],
  selectedCategory,
  onCategorySelect,
  searchQuery = '',
  onSearchChange,
  onSearchFocus,
  onSearchClear,
  isVeg = false,
  onVegToggle,
}) => {
  const insets = useSafeAreaInsets();
  const bannerScrollRef = useRef<ScrollView>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const displayAddress = userData?.addressLine
    ? `${userData.houseNumber ? userData.houseNumber + ', ' : ''}${userData.addressLine}`
    : 'Set your delivery address';

  return (
    <View style={[styles.greenContainer, { paddingTop: insets.top + 12 }]}>

      {/* ── Row 1: Address + Profile Icon ─────────────────────── */}
      <View style={styles.addressRow}>
        <View style={styles.addressLeft}>
          <Text style={styles.timeText}>{formatDeliveryTime(avgTime || 20)}</Text>
          <TouchableOpacity style={styles.addressTouchable} onPress={onAddressPress}>
            <Text style={styles.addressLabel} numberOfLines={1}>
              {'Address: '}
              <Text style={styles.addressValue}>{displayAddress}</Text>
            </Text>
            <Icon name="chevron-down" size={14} color="#fff" style={styles.chevronIcon} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.profileCircle}
          onPress={onProfilePress}
          onLongPress={onProfileLongPress}
          delayLongPress={1000}
        >
          <Icon name="person-circle" size={34} color="#333" />
        </TouchableOpacity>
      </View>

      {/* ── Row 2: Search Bar + Veg Toggle ────────────────────── */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={20} color={Colors.primary} />
          <TextInput
            placeholder="Search for 'Pizza'"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={onSearchFocus}
            placeholderTextColor="#999"
          />
          {searchQuery.trim().length > 0 && (
            <TouchableOpacity onPress={onSearchClear} style={{ padding: 4 }}>
              <Icon name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.vegToggle, isVeg && styles.vegToggleActive]}
          onPress={onVegToggle}
        >
          <Text style={[styles.vegText, isVeg && styles.vegTextActive]}>VEG</Text>
          <View style={[styles.toggleTrack, isVeg && styles.toggleTrackActive]}>
            <View style={[styles.toggleThumb, isVeg && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Row 3: Banner Carousel ────────────────────────────── */}
      <View style={styles.bannerContainer}>
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
                onPress={() =>
                  onBannerPress &&
                  onBannerPress(banner.action_type, banner.action_payload, banner.image_url)
                }
                activeOpacity={0.9}
              >
                <TopCropImage
                  uri={getOptimizedImageUrl(banner.image_url, 600)}
                  containerStyle={styles.bannerImage}
                />
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.bannerCard, styles.bannerPlaceholder, { width: bannerWidth }]}>
              <Icon name="image-outline" size={40} color="#ccc" />
            </View>
          )}
        </ScrollView>

        {/* Dot indicators */}
        {banners.length > 1 && (
          <View style={styles.dotsRow}>
            {banners.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentBannerIndex && styles.dotActive]}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Row 4: Category Pills ─────────────────────────────── */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContent}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.pillBtn}
                onPress={() => onCategorySelect && onCategorySelect(cat.id)}
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
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  // ── Outer green wrapper ──────────────────────────────────────────
  greenContainer: {
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    paddingBottom: 4,
  },

  // ── Row 1: Address + Profile ─────────────────────────────────────
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  addressLeft: {
    flex: 1,
    marginRight: 10,
  },
  timeText: {
    color: Colors.white,
    fontSize: 22,
    fontFamily: Fonts.black,
    lineHeight: 26,
    marginBottom: 4,
  },
  addressTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressLabel: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Fonts.bold,
    flexShrink: 1,
  },
  addressValue: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
    opacity: 0.88,
  },
  chevronIcon: {
    marginLeft: 4,
  },
  profileCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Row 2: Search + Veg ──────────────────────────────────────────
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 14,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: '#333',
  },
  vegToggle: {
    width: 58,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegToggleActive: {
    borderColor: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  vegText: {
    fontSize: 9,
    fontFamily: Fonts.black,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 3,
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

  // ── Row 3: Banners ───────────────────────────────────────────────
  bannerContainer: {
    paddingBottom: 10,
  },
  bannerScroll: {
    paddingHorizontal: 15,
    gap: 15,
  },
  bannerCard: {
    height: 155,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: Colors.white,
    width: 16,
  },

  // ── Row 4: Category Pills ────────────────────────────────────────
  categoryContainer: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  pillsContent: {
    paddingHorizontal: 20,
    gap: 28,
  },
  pillBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.4,
    marginTop: 3,
  },
  pillTextActive: {
    color: Colors.white,
  },
});

export default HomeHeader;
