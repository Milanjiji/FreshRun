import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface AccountScreenProps {
  userData: any;
  onBack: () => void;
  onLogout: () => void;
}

const AccountScreen: React.FC<AccountScreenProps> = ({ userData, onBack, onLogout }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const menuItems = [
    { id: '1', title: 'Account Statement', icon: 'document-outline' },
    { id: '5', title: 'Saved by Me', icon: 'bookmark-outline' },
  ];

  const quickLinks = [
    { id: 'q1', title: 'Saved\nAddress', icon: 'location-outline' },
    { id: 'q2', title: 'Payment\nModes', icon: 'wallet-outline' },
    { id: 'q3', title: 'My\nRefunds', icon: 'refresh-circle-outline' },
    { id: 'q4', title: 'FreshRun\nMoney', icon: 'wallet-outline' },
  ];

  const handleLogout = () => {
    setMenuVisible(false);
    onLogout();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f5f9" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpText}>Help</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => setMenuVisible(true)}
          >
            <Icon name="ellipsis-vertical" size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.menuDropdown}>
              <TouchableOpacity style={styles.menuOption}>
                <Text style={styles.menuOptionText}>Edit Profile</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuOption}>
                <Text style={styles.menuOptionText}>Settings</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuOption} onPress={handleLogout}>
                <Text style={styles.menuOptionText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Details */}
        <View style={styles.userInfoSection}>
          <Text style={styles.userName}>{userData?.fullName || 'User Name'}</Text>
          <Text style={styles.userDetailText}>
            {userData?.phone?.startsWith('+') 
              ? userData.phone 
              : `+91 - ${userData?.phone || 'XXXXXXXXXX'}`}
          </Text>
          <Text style={styles.userDetailText}>{userData?.email || 'email@example.com'}</Text>
        </View>

        {/* Quick Links Grid */}
        <View style={styles.quickLinksContainer}>
          {quickLinks.map((item) => (
            <TouchableOpacity key={item.id} style={styles.quickLinkCard}>
              <View style={styles.quickLinkIconContainer}>
                <Icon name={item.icon} size={24} color="#333" />
              </View>
              <Text style={styles.quickLinkTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Menu Items List */}
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                styles.menuItem, 
                index === menuItems.length - 1 ? styles.lastMenuItem : null
              ]}
            >
              <View style={styles.menuItemLeft}>
                <Icon name={item.icon} size={22} color="#333" />
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
              <Icon name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Past Orders Section */}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>PAST ORDERS</Text>
        </View>

        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderStoreName}>FreshRun Mart</Text>
              <Text style={styles.orderLocation}>Punnapra, Alappuzha</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Delivered</Text>
              <Icon name="checkmark-circle" size={16} color="#60c547" style={styles.statusIcon} />
            </View>
          </View>
          <View style={styles.orderDivider} />
          <TouchableOpacity style={styles.viewMenuButton}>
            <Text style={styles.viewMenuText}>VIEW DETAILS</Text>
            <Icon name="chevron-forward" size={14} color="#60c547" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f5f9', // Light blueish grey background as in image
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 5,
  },
  helpButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  helpText: {
    color: '#0066FF',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  userInfoSection: {
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
  userName: {
    fontSize: 28,
    fontFamily: 'Inter-Black',
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  userDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginTop: 2,
  },
  quickLinksContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickLinkCard: {
    backgroundColor: '#fff',
    width: '23%',
    paddingVertical: 15,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  quickLinkIconContainer: {
    marginBottom: 8,
  },
  quickLinkTitle: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    color: '#444',
    lineHeight: 14,
  },
  menuCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginLeft: 15,
  },
  sectionTitleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Montserrat-Bold',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  orderCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderStoreName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  orderLocation: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#888',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#60c547',
    marginRight: 5,
  },
  statusIcon: {
    marginTop: 1,
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginVertical: 12,
  },
  viewMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  viewMenuText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#60c547',
    marginRight: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 20,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  logoutText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#FF3B30',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 50,
    paddingRight: 15,
  },
  menuDropdown: {
    backgroundColor: '#2d2d2d', // Dark background as in image
    width: 140, // Reduced from 180
    borderRadius: 12, // Slightly more compact radius
    paddingVertical: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuOption: {
    paddingVertical: 10, // Reduced from 15
    paddingHorizontal: 15, // Reduced from 20
  },
  menuOptionText: {
    color: '#fff',
    fontSize: 14, // Reduced from 16
    fontFamily: 'Inter-Medium',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#444',
    marginHorizontal: 8,
  },
});

export default AccountScreen;
