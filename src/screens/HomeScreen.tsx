import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import HomeHeader from '../components/HomeHeader';

interface HomeScreenProps {
  userData: any;
  locationData: any;
  onLogout: () => void;
  onAddressPress?: () => void;
  onProfilePress?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ 
  userData, 
  locationData, 
  onLogout, 
  onAddressPress,
  onProfilePress
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#60c547" />
      <View style={styles.container}>
        <HomeHeader onAddressPress={onAddressPress} onProfilePress={onProfilePress} />
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.welcomeText}>Welcome to FreshRun!</Text>
            <Text style={styles.infoText}>Name: {userData?.fullName}</Text>
            <Text style={styles.infoText}>Email: {userData?.email}</Text>
            <Text style={styles.infoText}>Phone: {userData?.phone}</Text>
            <Text style={styles.infoText}>Role: {userData?.role}</Text>
            
            <View style={styles.addressBox}>
              <Text style={styles.addressTitle}>Delivery Address:</Text>
              <Text style={styles.addressText}>
                {userData?.houseNumber ? `${userData.houseNumber}, ` : ''}
                {userData?.addressLine}
              </Text>
              {userData?.landmark && (
                <Text style={styles.addressText}>Landmark: {userData.landmark}</Text>
              )}
              <Text style={styles.addressText}>
                {userData?.city}, {userData?.pincode}
              </Text>
              
              {userData?.deliveryMessage && (
                <View style={styles.messageBox}>
                  <Text style={styles.messageTitle}>Note for Delivery:</Text>
                  <Text style={styles.messageText}>"{userData.deliveryMessage}"</Text>
                </View>
              )}
            </View>

            {locationData && (
              <Text style={styles.infoText}>
                GPS: {locationData.latitude.toFixed(4)}, {locationData.longitude.toFixed(4)}
              </Text>
            )}
            
            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#60c547', // Project logo green
  },
  container: {
    flex: 1,
    backgroundColor: '#fff', // Rest of the screen is white
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 20,
    color: '#333',
  },
  infoText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 10,
  },
  addressBox: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  addressTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 5,
  },
  addressText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#444',
    lineHeight: 22,
  },
  messageBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  messageTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#888',
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
  },
});

export default HomeScreen;
