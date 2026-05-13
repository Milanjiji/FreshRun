import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';

interface HomeHeaderProps {
  onAddressPress?: () => void;
  onProfilePress?: () => void;
  userData?: any;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ onAddressPress, onProfilePress, userData }) => {
  const displayAddress = userData?.addressLine 
    ? `${userData.houseNumber ? userData.houseNumber + ', ' : ''}${userData.addressLine}`
    : "Set your delivery address";

  return (
    <View style={styles.container}>
      {/* Top Section: Stacked Time/Address (Left) and Profile (Right) */}
      <View style={styles.topSection}>
        <View style={styles.leftInfo}>
          <Text style={styles.timeText}>20 mins</Text>
          <TouchableOpacity style={styles.addressContainer} onPress={onAddressPress}>
            <Text style={styles.addressLabel} numberOfLines={1}>
              To Main Address: <Text style={styles.addressValue}>{displayAddress}</Text>
            </Text>
            <Icon name="chevron-down" size={16} color="#fff" style={styles.chevronIcon} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.profileCircle} onPress={onProfilePress}>
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
    paddingTop: 15,
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
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -4,
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
