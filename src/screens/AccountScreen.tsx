import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  Linking,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { API_BASE_URL } from '../config/api';

const PRIVACY_POLICY_URL = 'https://freshrun-admin.vercel.app/privacy';

interface AccountScreenProps {
  userData: any;
  userToken: string;
  onBack: () => void;
  onLogout: () => void;
  onSavedAddressPress?: () => void;
  onOrderPress?: (orderId: string) => void;
  onInfoPress: (type: 'about' | 'privacy' | 'terms' | 'refund' | 'shipping' | 'contact') => void;
}

const AccountScreen: React.FC<AccountScreenProps> = ({ 
  userData, 
  userToken,
  onBack, 
  onLogout,
  onSavedAddressPress,
  onOrderPress,
  onInfoPress
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/user`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const menuItems = [
    { id: 'about', title: 'About Us', icon: 'information-circle-outline' },
    { id: 'privacy', title: 'Privacy Policy', icon: 'shield-checkmark-outline' },
    { id: 'terms', title: 'Terms & Conditions', icon: 'document-text-outline' },
    { id: 'refund', title: 'Refund Policy', icon: 'refresh-circle-outline' },
    { id: 'shipping', title: 'Shipping Policy', icon: 'truck-outline' },
    { id: 'contact', title: 'Contact Us', icon: 'mail-outline' },
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

  const handleDeleteAccount = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure you want to delete your account? This action cannot be undone and all your data, including order history, will be permanently erased.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/user/account`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${userToken}`,
                },
              });
              const data = await response.json();
              if (data.success) {
                onLogout(); // This will clear storage and sign out
              } else {
                Alert.alert('Error', data.error || 'Failed to delete account');
              }
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert('Error', 'Something went wrong. Please try again later.');
            }
          }
        }
      ]
    );
  };

  const renderOrder = (order: any) => {
    const isDelivered = order.status === 'delivered' || order.is_completed;
    const isCancelled = order.status === 'cancelled' || order.status === 'declined';
    
    return (
      <View key={order.id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderStoreName}>{order.store_name || 'FreshRun Store'}</Text>
            <Text style={styles.orderLocation}>{order.store_address || 'Punnapra, Alappuzha'}</Text>
            <Text style={styles.orderAmount}>₹{order.total_amount}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={[
              styles.statusText,
              isCancelled && { color: Colors.error }
            ]}>
              {order.status?.toUpperCase() || (order.is_completed ? 'DELIVERED' : 'PENDING')}
            </Text>
            <Icon 
              name={isDelivered ? "checkmark-circle" : (isCancelled ? "close-circle" : "time")} 
              size={16} 
              color={isCancelled ? Colors.error : Colors.primary} 
              style={styles.statusIcon} 
            />
          </View>
        </View>
        <View style={styles.orderDivider} />
        <TouchableOpacity 
          style={styles.viewMenuButton}
          onPress={() => onOrderPress && onOrderPress(order.id)}
        >
          <Text style={styles.viewMenuText}>VIEW DETAILS</Text>
          <Icon name="chevron-forward" size={14} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
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
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuOption} onPress={handleDeleteAccount}>
                <Text style={[styles.menuOptionText, { color: Colors.error }]}>Delete Account</Text>
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
            <TouchableOpacity 
              key={item.id} 
              style={styles.quickLinkCard}
              onPress={item.id === 'q1' ? onSavedAddressPress : undefined}
            >
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
              onPress={() => onInfoPress(item.id as any)}
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
          <Text style={styles.sectionTitle}>ORDERS</Text>
        </View>

        {loadingOrders ? (
          <View style={{ padding: 20 }}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : orders.length > 0 ? (
          orders.map(order => renderOrder(order))
        ) : (
          <View style={styles.emptyOrdersContainer}>
            <Text style={styles.emptyOrdersText}>No orders yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.surface,
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
    color: Colors.secondary,
    fontSize: 14,
    fontFamily: Fonts.bold,
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
    fontFamily: Fonts.black,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  userDetailText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
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
    backgroundColor: Colors.surface,
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
    fontFamily: Fonts.bold,
    textAlign: 'center',
    color: '#444',
    lineHeight: 14,
  },
  menuCard: {
    backgroundColor: Colors.surface,
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
    fontFamily: Fonts.medium,
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
    fontFamily: Fonts.bold,
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  orderCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderStoreName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#333',
  },
  orderLocation: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#888',
    marginTop: 2,
  },
  orderAmount: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#333',
    marginTop: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.primary,
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
    fontFamily: Fonts.bold,
    color: Colors.primary,
    marginRight: 4,
  },
  emptyOrdersContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyOrdersText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#999',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 15,
    marginBottom: 20,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  logoutText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.error,
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
    backgroundColor: '#2d2d2d',
    width: 140,
    borderRadius: 12,
    paddingVertical: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  menuOptionText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#444',
    marginHorizontal: 8,
  },
});

export default AccountScreen;
