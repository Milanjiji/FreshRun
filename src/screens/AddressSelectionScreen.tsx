import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import axios from 'axios';

const BACKEND_URL = "https://freshrun-backend.onrender.com";

interface Address {
  id: string;
  fullName: string;
  addressLine: string;
  landmark?: string;
  houseNumber?: string;
  pincode: string;
  city?: string;
  addressType: string;
  saveAs: string;
  isCurrent?: boolean;
}

interface AddressSelectionScreenProps {
  userData: any;
  userToken: string;
  onBack: () => void;
  onAddressUpdated: (updatedUser: any) => void;
}

const AddressSelectionScreen: React.FC<AddressSelectionScreenProps> = ({ 
  userData, 
  userToken, 
  onBack, 
  onAddressUpdated 
}) => {
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/user/addresses`, {
        headers: { Authorization: `Bearer ${userToken}` },
        timeout: 10000,
      });

      if (response.data.success) {
        setSavedAddresses(response.data.addresses);
      }
    } catch (error) {
      console.error('Fetch Addresses Error:', error);
      // We don't Alert here to avoid annoying the user if it's just empty
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = async (addressId: string) => {
    setSelectingId(addressId);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/user/addresses/select`,
        { addressId },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      if (response.data.success) {
        onAddressUpdated(response.data.user);
        onBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to select address');
    } finally {
      setSelectingId(null);
    }
  };

  const currentAddress: Address = {
    id: 'current',
    fullName: userData?.fullName || 'Main Address',
    addressLine: userData?.addressLine || '',
    landmark: userData?.landmark,
    houseNumber: userData?.houseNumber,
    pincode: userData?.pincode || '',
    city: userData?.city,
    addressType: 'Current',
    saveAs: 'Main Address',
    isCurrent: true,
  };

  const getAddressIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'house': return 'location';
      case 'work':
      case 'office': return 'briefcase';
      default: return 'location-outline';
    }
  };

  const renderAddressItem = (item: Address, isSelected: boolean) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.addressItem}
      onPress={() => !isSelected && handleSelectAddress(item.id)}
      disabled={isSelected || !!selectingId}
    >
      <View style={styles.iconContainer}>
        <Icon name={getAddressIcon(item.addressType)} size={20} color="#333" />
        {/* Distance placeholder logic could go here */}
        <Text style={styles.distanceText}>-- m</Text>
      </View>
      <View style={styles.addressInfo}>
        <View style={styles.addressHeaderRow}>
          <Text style={styles.addressName}>{item.fullName || item.saveAs || 'Saved Address'}</Text>
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>SELECTED</Text>
            </View>
          )}
          {selectingId === item.id && (
            <ActivityIndicator size="small" color={Colors.success} style={{ marginLeft: 10 }} />
          )}
        </View>
        <Text style={styles.addressFull} numberOfLines={2}>
          {item.houseNumber ? `${item.houseNumber}, ` : ''}
          {item.addressLine}, {item.city || ''}
        </Text>
      </View>
      <TouchableOpacity style={styles.menuButton}>
        <Icon name="ellipsis-vertical" size={18} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select your location</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search an area or address"
            placeholderTextColor="#999"
          />
          <Icon name="search" size={20} color="#666" />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="locate" size={20} color={Colors.secondary} />
            <Text style={styles.actionButtonText}>Use Current Location</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Icon name="add-circle-outline" size={20} color={Colors.secondary} />
            <Text style={styles.actionButtonText}>Add New Address</Text>
          </TouchableOpacity>
        </View>

        {/* Saved Addresses Section */}
        <Text style={styles.sectionTitle}>SAVED ADDRESSES</Text>
        
        <View style={styles.addressListCard}>
          {/* Current Active Address */}
          {renderAddressItem(currentAddress, true)}

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ margin: 20 }} />
          ) : (
            <>
              {savedAddresses.map((addr) => (
                <React.Fragment key={addr.id}>
                  <View style={styles.listSeparator} />
                  {renderAddressItem(addr, false)}
                </React.Fragment>
              ))}
            </>
          )}

          <View style={styles.listSeparator} />

          {/* View all */}
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View all</Text>
            <Icon name="chevron-down" size={16} color={Colors.secondary} style={{ marginLeft: 5, marginTop: 2 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  backButton: { padding: 10, marginLeft: -10, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: Fonts.bold, fontWeight: '800', color: '#333', marginLeft: 5 },
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  searchContainer: { height: 54, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 15, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  searchInput: { flex: 1, fontSize: 16, fontFamily: Fonts.regular, color: '#333' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  actionButton: { flex: 0.48, height: 46, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  actionButtonText: { fontSize: 11, fontFamily: Fonts.bold, color: '#555', marginLeft: 6, flex: 1 },
  sectionTitle: { fontSize: 11, fontFamily: Fonts.bold, color: '#999', marginBottom: 12, letterSpacing: 0.5 },
  addressListCard: { backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0', elevation: 0, overflow: 'hidden' },
  addressItem: { flexDirection: 'row', padding: 16 },
  iconContainer: { width: 46, height: 46, backgroundColor: '#F5F5F5', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  distanceText: { fontSize: 9, fontFamily: Fonts.bold, color: '#333', marginTop: 1 },
  addressInfo: { flex: 1, justifyContent: 'center' },
  addressHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  addressName: { fontSize: 15, fontFamily: Fonts.bold, color: '#333' },
  selectedBadge: { backgroundColor: '#E6F9F0', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: 8 },
  selectedBadgeText: { fontSize: 9, fontFamily: Fonts.bold, color: Colors.success },
  addressFull: { fontSize: 12, fontFamily: Fonts.regular, color: '#888', lineHeight: 16 },
  menuButton: { padding: 5, justifyContent: 'center' },
  listSeparator: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 16 },
  viewAllButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, backgroundColor: '#fff' },
  viewAllText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.secondary },
});

export default AddressSelectionScreen;
