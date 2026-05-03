import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface HomeHeaderProps {
  onAddressPress?: () => void;
  onProfilePress?: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ onAddressPress, onProfilePress }) => {
  return (
    <View style={styles.container}>
      {/* Top Section: Stacked Time/Address (Left) and Profile (Right) */}
      <View style={styles.topSection}>
        <View style={styles.leftInfo}>
          <Text style={styles.timeText}>20 mins</Text>
          <TouchableOpacity style={styles.addressContainer} onPress={onAddressPress}>
            <Text style={styles.addressLabel} numberOfLines={1}>
              To Main Address: <Text style={styles.addressValue}>House, Punnapra North, Al...</Text>
            </Text>
            <Icon name="chevron-down" size={16} color="#fff" style={styles.chevronIcon} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.profileCircle} onPress={onProfilePress}>
          <Icon name="person-circle" size={34} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Bottom Row: Search Bar and Bookmark */}
      <View style={styles.bottomRow}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for 'Toy Car'"
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity style={styles.bookmarkButton}>
          <Icon name="bookmark-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#60c547',
    paddingHorizontal: 15,
    paddingTop: 5,
    paddingBottom: 15,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  leftInfo: {
    flex: 1,
  },
  timeText: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Montserrat-Black',
    fontWeight: '900',
    lineHeight: 26,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -4,
  },
  addressLabel: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    maxWidth: '90%',
  },
  addressValue: {
    fontFamily: 'Inter-Regular',
    fontWeight: '400',
    opacity: 0.9,
  },
  chevronIcon: {
    marginLeft: 4,
    marginTop: 2,
  },
  profileCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBar: {
    flex: 1,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
    paddingVertical: 0,
  },
  bookmarkButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeHeader;
