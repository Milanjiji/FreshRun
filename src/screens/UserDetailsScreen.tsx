import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { storage } from '../utils/storage';
import { Fonts } from '../theme/typography';

const BACKEND_URL = "https://freshrun-backend.onrender.com";

export default function UserDetailsScreen({ userData, userToken, onSuccess, onBack, isAddingNewAddress, locationData }: any) {
  const randomNames = [
    'My Place', 'Sweet Home', 'Office Space', 'Hangout Spot', 
    'Favorite Corner', 'The Hub', 'Base Camp', 'Comfort Zone',
    'Point A', 'The Spot'
  ];

  const getRandomAddressName = () => {
    return randomNames[Math.floor(Math.random() * randomNames.length)];
  };

  // Hooks
  const [fullName, setFullName] = useState(isAddingNewAddress ? '' : (userData?.fullName || ''));
  const [email, setEmail] = useState(isAddingNewAddress ? '' : (userData?.email || ''));
  const [houseNumber, setHouseNumber] = useState(isAddingNewAddress ? '' : (userData?.houseNumber || ''));
  const [addressLine, setAddressLine] = useState(isAddingNewAddress ? '' : (userData?.addressLine || ''));
  const [landmark, setLandmark] = useState(isAddingNewAddress ? '' : (userData?.landmark || ''));
  const [pincode, setPincode] = useState(isAddingNewAddress ? '' : (userData?.pincode || ''));
  const [city, setCity] = useState(isAddingNewAddress ? '' : (userData?.city || ''));
  const [deliveryMessage, setDeliveryMessage] = useState(isAddingNewAddress ? '' : (userData?.deliveryMessage || ''));
  const [addressType, setAddressType] = useState('Other');
  const [saveAs, setSaveAs] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Auto-fetch profile on mount (Handles re-install case)
  useEffect(() => {
    const fetchExistingProfile = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 10000,
        });

        if (response.data.success && response.data.user) {
          const fetchedUser = response.data.user;
          
          // Populate fields
          setFullName(fetchedUser.fullName || '');
          setEmail(fetchedUser.email || '');
          setHouseNumber(fetchedUser.houseNumber || '');
          setAddressLine(fetchedUser.addressLine || '');
          setLandmark(fetchedUser.landmark || '');
          setPincode(fetchedUser.pincode || '');
          setCity(fetchedUser.city || '');
          setDeliveryMessage(fetchedUser.deliveryMessage || '');

          // NOTE: We no longer auto-skip to Home (onSuccess) here.
          // This allows the user to review their restored details and click "Save" manually.
        }
      } catch (error) {
        console.log('No existing profile found or fetch failed:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchExistingProfile();
  }, []);

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim() || !addressLine.trim() || !houseNumber.trim() || !pincode.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (isAddingNewAddress) {
        const finalSaveAs = saveAs.trim() || getRandomAddressName();

        // 1. Add as a new address entry
        const addResponse = await axios.post(
          `${BACKEND_URL}/user/addresses`,
          { 
            fullName, email, houseNumber, addressLine, landmark,
            pincode, city, deliveryMessage, addressType, saveAs: finalSaveAs,
            latitude: locationData?.latitude,
            longitude: locationData?.longitude
          },
          { headers: { Authorization: `Bearer ${userToken}` } }
        );

        if (addResponse.data.success) {
          const newAddressId = addResponse.data.address.id;
          
          // 2. Select it to make it the active one
          const selectResponse = await axios.post(
            `${BACKEND_URL}/user/addresses/select`,
            { addressId: newAddressId },
            { headers: { Authorization: `Bearer ${userToken}` } }
          );

          if (selectResponse.data.success) {
            const updatedUser = selectResponse.data.user;
            storage.setItem('userData', updatedUser);
            onSuccess(updatedUser);
          }
        }
      } else {
        const finalSaveAs = saveAs.trim() || (userData?.saveAs) || getRandomAddressName();

        // Standard profile update
        const response = await axios.put(
          `${BACKEND_URL}/user/profile`,
          { 
            fullName, email, houseNumber, addressLine, landmark,
            pincode, city, deliveryMessage, addressType, saveAs: finalSaveAs,
            latitude: locationData?.latitude,
            longitude: locationData?.longitude
          },
          {
            headers: { Authorization: `Bearer ${userToken}` },
            timeout: 15000,
          }
        );

        if (response.data.success) {
          const updatedUser = response.data.user;
          storage.setItem('userData', updatedUser);
          onSuccess(updatedUser);
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to save address';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = !!(fullName.trim() && email.trim() && addressLine.trim() && houseNumber.trim() && pincode.trim());

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0052FF" />
        <Text style={styles.loaderText}>Checking for existing profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Confirm Location</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {landmark || addressLine || "Set your delivery address"}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Receiver Details</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.checkboxMinimal}>
              <View style={styles.checkboxCheckMark} />
            </View>
            <View style={styles.receiverInfo}>
              <Text style={styles.accountLabel}>Use my account details</Text>
              <Text style={styles.accountDetails}>{fullName || "Name not set"}, {userData?.phone}</Text>
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.borderInput}
              placeholder="Full Name *"
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.borderInput}
              placeholder="Email Address *"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Location Details</Text>
        <View style={styles.card}>
          <View style={styles.tabsContainer}>
            {['House', 'Office', 'Other'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.tab, addressType === type && styles.activeTab]}
                onPress={() => setAddressType(type)}
              >
                <Text style={[styles.tabText, addressType === type && styles.activeTabText]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <View style={{ flex: 1.2 }}>
                <TextInput
                  style={styles.borderInput}
                  placeholder="Bldg/Floor *"
                  value={houseNumber}
                  onChangeText={setHouseNumber}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <TextInput
                  style={styles.borderInput}
                  placeholder="Pincode *"
                  value={pincode}
                  onChangeText={setPincode}
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <TextInput
              style={styles.borderInput}
              placeholder="Street (Recommended)"
              value={addressLine}
              onChangeText={setAddressLine}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.borderInput}
              placeholder="Landmark"
              value={landmark}
              onChangeText={setLandmark}
              placeholderTextColor="#999"
            />
            
            <View style={styles.areaDisplay}>
               <View style={{flex: 1}}>
                  <Text style={styles.areaLabel}>Area</Text>
                  <Text style={styles.areaValue}>{city || landmark || "Location confirmed via GPS"}</Text>
               </View>
               <TouchableOpacity style={styles.changeButton}>
                  <Text style={styles.changeLink}>Change</Text>
               </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.borderInput}
              placeholder="Save address as *"
              value={saveAs}
              onChangeText={setSaveAs}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Delivery Instructions</Text>
        <View style={styles.card}>
          <TextInput
            style={[styles.borderInput, styles.multilineInput]}
            placeholder="Instructions to reach location"
            value={deliveryMessage}
            onChangeText={setDeliveryMessage}
            placeholderTextColor="#999"
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, !isFormValid ? styles.disabledButton : styles.activeSaveButton]}
          onPress={handleSave}
          disabled={loading || !isFormValid}
        >
          <Text style={styles.saveButtonText}>{loading ? "Saving..." : "Save address"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6F8' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6F8' },
  loaderText: { marginTop: 15, fontSize: 16, color: '#666', fontFamily: Fonts.medium },
  header: { height: 60, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backButton: { padding: 5, marginRight: 10 },
  backArrow: { fontSize: 24, color: '#333', fontFamily: Fonts.bold, fontWeight: 'bold' },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: Fonts.bold, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 12, fontFamily: Fonts.regular, color: '#999' },
  container: { flex: 1 },
  scrollContent: { padding: 15, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontFamily: Fonts.bold, fontWeight: '800', color: '#333', marginVertical: 12, marginLeft: 5 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 5 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  checkboxMinimal: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#000', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxCheckMark: { width: 10, height: 10, backgroundColor: '#000', borderRadius: 2 },
  receiverInfo: { flex: 1 },
  accountLabel: { fontSize: 16, fontFamily: Fonts.bold, fontWeight: '800', color: '#333' },
  accountDetails: { fontSize: 14, fontFamily: Fonts.regular, color: '#999', marginTop: 2 },
  inputGroup: { gap: 12 },
  borderInput: { 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 12, 
    height: 56, 
    paddingHorizontal: 15, 
    paddingVertical: 0,
    fontSize: 15, 
    fontFamily: Fonts.regular,
    color: '#333',
    backgroundColor: '#fff'
  },
  multilineInput: { height: 80, paddingTop: 15, textAlignVertical: 'top', paddingVertical: 15 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#F0F2F5', borderRadius: 30, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 25 },
  activeTab: { backgroundColor: '#000' },
  tabText: { fontSize: 14, fontFamily: Fonts.semiBold, color: '#666', fontWeight: '600' },
  activeTabText: { color: '#fff' },
  areaDisplay: { 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 12, 
    padding: 15, 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  areaLabel: { fontSize: 12, fontFamily: Fonts.regular, color: '#999', marginBottom: 4 },
  areaValue: { fontSize: 14, fontFamily: Fonts.medium, color: '#666', fontWeight: '500' },
  changeButton: { padding: 5 },
  changeLink: { fontSize: 12, fontFamily: Fonts.bold, color: '#0052FF', fontWeight: 'bold' },
  saveButton: { height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  saveButtonText: { fontSize: 16, fontFamily: Fonts.bold, fontWeight: 'bold', color: '#fff' },
  disabledButton: { backgroundColor: '#D1D5DB' },
  activeSaveButton: { backgroundColor: '#000' },
});
