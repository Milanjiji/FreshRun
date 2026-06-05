import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

const BACKEND_URL = API_BASE_URL;

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
  latitude?: number;
  longitude?: number;
}

interface AddressSelectionScreenProps {
  userData: any;
  userToken: string;
  onBack: () => void;
  onAddressUpdated: (updatedUser: any) => void;
  onAddNewAddress: () => void;
  onUseCurrentLocation: () => void;
}

const AddressSelectionScreen: React.FC<AddressSelectionScreenProps> = ({ 
  userData, 
  userToken, 
  onBack, 
  onAddressUpdated,
  onAddNewAddress,
  onUseCurrentLocation
}) => {
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [currentAddressId, setCurrentAddressId] = useState<string | null>(userData?.currentAddressId || null);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Haversine distance formula in meters
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

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
        const addresses = response.data.addresses;
        const serverCurrentId = response.data.currentAddressId;
        setSavedAddresses(addresses);
        
        if (serverCurrentId) {
          setCurrentAddressId(serverCurrentId);
        } else if (addresses.length > 0) {
          // If none selected, find nearest
          findAndSelectNearest(addresses);
        }
      }
    } catch (error) {
      console.error('Fetch Addresses Error:', error);
      // We don't Alert here to avoid annoying the user if it's just empty
    } finally {
      setLoading(false);
    }
  };

  const findAndSelectNearest = (addresses: Address[]) => {
    console.log('📍 Starting background location fetch to find nearest address...');
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`📡 Current User Location: ${latitude}, ${longitude}`);
        
        let nearestAddr = null;
        let minDistance = Infinity;

        console.log('🏠 Checking addresses:');
        addresses.forEach(addr => {
          console.log(` - Address "${addr.saveAs || addr.fullName}": ${addr.latitude}, ${addr.longitude}`);
          if (addr.latitude && addr.longitude) {
            const dist = getDistance(latitude, longitude, addr.latitude, addr.longitude);
            console.log(`   Distance: ${dist.toFixed(2)} meters`);
            if (dist < minDistance) {
              minDistance = dist;
              nearestAddr = addr;
            }
          }
        });

        if (nearestAddr) {
          console.log('✅ Nearest address found:', (nearestAddr as Address).id);
          handleSelectAddress((nearestAddr as Address).id, true);
        } else {
          console.log('⚠️ No addresses with coordinates found. Falling back to first address.');
          if (addresses.length > 0) {
            handleSelectAddress(addresses[0].id, true);
          }
        }
      },
      (error) => {
        console.log('❌ Background Location Fetch Error:', error);
        // Fallback to first address if location fails
        if (addresses.length > 0) {
          console.log('⚠️ Falling back to first address due to location error.');
          handleSelectAddress(addresses[0].id, true);
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );
  };

  const handleSelectAddress = async (addressId: string, isAuto: boolean = false) => {
    setSelectingId(addressId);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/user/addresses/select`,
        { addressId },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      if (response.data.success) {
        setCurrentAddressId(addressId);
        onAddressUpdated(response.data.user);
        if (!isAuto) {
          onBack();
        }
      }
    } catch (error: any) {
      Alertt.alert('Error', error.response?.data?.error || 'Failed to select address');
    } finally {
      setSelectingId(null);
    }
  };

  const handleDeleteAddress = (addressId: string) => {
    setActiveMenuId(null);
    Alertt.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await axios.delete(`${BACKEND_URL}/user/addresses/${addressId}`, {
                headers: { Authorization: `Bearer ${userToken}` }
              });
              if (response.data.success) {
                fetchAddresses();
              }
            } catch (error: any) {
              Alertt.alert('Error', error.response?.data?.error || 'Failed to delete address');
            }
          }
        }
      ]
    );
  };

  const toggleMenu = (addressId: string) => {
    setActiveMenuId(activeMenuId === addressId ? null : addressId);
  };

  const currentAddress: Address = {
    id: userData?.currentAddressId || 'current',
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

  const renderAddressItem = (item: Address) => {
    const isSelected = item.id === currentAddressId;
    return (
    <TouchableOpacity 
      key={item.id} 
      style={[
        styles.addressItem,
        activeMenuId === item.id && { zIndex: 999 }
      ]}
      onPress={() => isSelected ? onBack() : handleSelectAddress(item.id)}
      disabled={!!selectingId}
    >
      <View style={styles.iconContainer}>
        <Icon name={getAddressIcon(item.addressType)} size={20} color="#333" />
        <Text style={styles.distanceText}>-- m</Text>
      </View>
      <View style={styles.addressInfo}>
        <View style={styles.addressHeaderRow}>
          <Text style={styles.addressName}>{item.saveAs || item.addressType || 'Saved Location'}</Text>
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
          {item.addressLine}{item.landmark ? `, ${item.landmark}` : ''}{item.city ? `, ${item.city}` : ''}
        </Text>
      </View>
      {!isSelected && (
        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => toggleMenu(item.id)}
          >
            <Icon name="ellipsis-vertical" size={18} color="#999" />
          </TouchableOpacity>
          
          {activeMenuId === item.id && (
            <View style={styles.contextMenu}>
              <TouchableOpacity 
                style={styles.contextItem}
                onPress={() => handleDeleteAddress(item.id)}
              >
                <Icon name="trash-outline" size={14} color="#fff" />
                <Text style={styles.contextText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
    );
  };

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
          <TouchableOpacity style={styles.actionButton} onPress={onUseCurrentLocation}>
            <Icon name="locate" size={20} color={Colors.secondary} />
            <Text style={styles.actionButtonText}>Use Current Location</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onAddNewAddress}>
            <Icon name="add-circle-outline" size={20} color={Colors.secondary} />
            <Text style={styles.actionButtonText}>Add New Address</Text>
          </TouchableOpacity>
        </View>

        {/* Saved Addresses Section */}
        <Text style={styles.sectionTitle}>SAVED ADDRESSES</Text>
        
        <View style={styles.addressListCard}>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ margin: 20 }} />
          ) : savedAddresses.length === 0 ? (
            <Text style={{ padding: 20, color: '#999', textAlign: 'center', fontFamily: Fonts.regular }}>No saved addresses yet.</Text>
          ) : (
            <>
              {savedAddresses.map((addr, index) => (
                <React.Fragment key={addr.id}>
                  {index > 0 && <View style={styles.listSeparator} />}
                  {renderAddressItem(addr)}
                </React.Fragment>
              ))}
            </>
          )}

        </View>
      </ScrollView>

      {activeMenuId && (
        <TouchableWithoutFeedback onPress={() => setActiveMenuId(null)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}
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
  addressListCard: { backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0', elevation: 0 },
  addressItem: { flexDirection: 'row', padding: 16, backgroundColor: '#fff' },
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
  menuContainer: {
    position: 'relative',
    justifyContent: 'center',
    zIndex: 100,
  },
  contextMenu: {
    position: 'absolute',
    top: 35,
    right: 0,
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    width: 110,
    padding: 6,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 1000,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  contextText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#fff',
    marginLeft: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 99,
  },
});

export default AddressSelectionScreen;
rt default AddressSelectionScreen;
