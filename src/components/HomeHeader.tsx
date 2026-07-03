import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { formatDeliveryTime } from '../utils/distance';

interface HomeHeaderProps {
  onAddressPress?: () => void;
  onProfilePress?: () => void;
  onProfileLongPress?: () => void;
  userData?: any;
  avgTime?: number;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ onAddressPress, onProfilePress, onProfileLongPress, userData, avgTime }) => {
  const insets = useSafeAreaInsets();
  const displayAddress = userData?.addressLine 
    ? `${userData.houseNumber ? userData.houseNumber + ', ' : ''}${userData.addressLine}`
    : "Set your delivery address";

  return (
    <View style={[styles.container, { paddingTop: 15 + insets.top }]}>
      {/* Top Section: Stacked Time/Address (Left) and Profile (Right) */}
      <View style={styles.topSection}>
        <View style={styles.leftInfo}>
          <Text style={styles.timeText}>{formatDeliveryTime(avgTime || 20)}</Text>
          <TouchableOpacity style={styles.addressContainer} onPress={onAddressPress}>
            <Text style={styles.addressLabel} numberOfLines={1}>
              Address: <Text style={styles.addressValue}>{displayAddress}</Text>
            </Text>
            <Icon name="chevron-down" size={16} color="#fff" style={styles.chevronIcon} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftInfo: {
    flex: 1,
  },
  timeText: {
    color: Colors.white,
    fontSize: 22,
    fontFamily: Fonts.black,
    lineHeight: 26,
    marginBottom: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
  },
  addressLabel: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.bold,
    fontWeight: '800',
    maxWidth: '90%',
  },
  addressValue: {
    fontFamily: Fonts.regular,
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
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});

export default HomeHeader;
