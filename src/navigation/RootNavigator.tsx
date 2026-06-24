import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useOrderStore } from '../store/useOrderStore';
import { useSettingsStore } from '../store/useSettingsStore';

import { Alertt } from '../components/Alertt';
import { API_BASE_URL } from '../config/api';

// Screens
import LoginScreen from '../screens/LoginScreen';
import LocationScreen from '../screens/LocationScreen';
import UserDetailsScreen from '../screens/UserDetailsScreen';
import HomeScreen from '../screens/HomeScreen';
import AddressSelectionScreen from '../screens/AddressSelectionScreen';
import AccountScreen from '../screens/AccountScreen';
import StoreDetailsScreen from '../screens/StoreDetailsScreen';
import CartScreen from '../screens/CartScreen';
import PaymentScreen from '../screens/PaymentScreen';
import OrderConfirmingScreen from '../screens/OrderConfirmingScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import InfoScreen from '../screens/InfoScreen';
import HelpScreen from '../screens/HelpScreen';
import TicketDetailsScreen from '../screens/TicketDetailsScreen';
import PromotionalFilterScreen from '../screens/PromotionalFilterScreen';

export type RootStackParamList = {
  Login: undefined;
  Location: { fromOnboarding?: boolean } | undefined;
  UserDetails: { isAddingNewAddress?: boolean } | undefined;
  AddressSelection: undefined;
  Home: undefined;
  StoreDetails: { store: any };
  Cart: undefined;
  Payment: {
    totalAmount: number;
    deliveryFee: number;
    deliveryTip: number;
    isSelfPickup: boolean;
    rainyFee: number;
    lateNightFee: number;
    extraStoreCharge: number;
  };
  OrderConfirming: {
    totalAmount: number;
    deliveryFee: number;
    deliveryTip: number;
    isSelfPickup: boolean;
    rainyFee: number;
    lateNightFee: number;
    extraStoreCharge: number;
    paymentMode: 'cod' | 'online';
  };
  OrderTracking: { orderId: string };
  Account: undefined;
  Help: { preAttachedOrder?: any } | undefined;
  TicketDetails: { ticketId: string | number };
  Info: { type: any };
  PromotionalFilter: { maxPrice?: number; title?: string; imageUrl?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = ({ socket }: { socket: any }) => {
  const { 
    userToken, 
    userData, 
    hasLocation, 
    isSelectingLocation, 
    isAddingNewAddress,
    setToken,
    setUserData,
    setHasLocation,
    setLocationData,
    setIsSelectingLocation,
    setIsAddingNewAddress,
    logout
  } = useAuthStore();

  const {
    cartItems,
    addItem,
    updateQuantity,
    clearCart,
  } = useCartStore();

  const {
    activeOrders,
    selectedTrackingOrderId,
    upsertActiveOrder,
    setSelectedTrackingOrderId,
  } = useOrderStore();

  // Authentication & Onboarding Guards
  if (!userToken) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login">
          {(props) => (
            <LoginScreen 
              {...props} 
              role="customer" 
              onLoginSuccess={async (token, user) => {
                setToken(token);
                setUserData(user);
                
                if (user?.currentAddressId) {
                  setHasLocation(true);
                  setIsSelectingLocation(false);
                } else {
                  setIsSelectingLocation(true);
                }
              }} 
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  // Onboarding screens presented before main App Stack
  if (isSelectingLocation) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AddressSelection">
          {(props) => (
            <AddressSelectionScreen
              {...props}
              userData={userData}
              userToken={userToken}
              onBack={() => {
                setIsSelectingLocation(false);
                if (userData?.currentAddressId) {
                  setHasLocation(true);
                }
              }}
              onAddressUpdated={(updatedUser) => {
                setUserData(updatedUser);
                if (!hasLocation) {
                  setHasLocation(true);
                }
              }}
              onAddNewAddress={() => {
                setIsSelectingLocation(false);
                setHasLocation(false);
                setIsAddingNewAddress(true);
              }}
              onUseCurrentLocation={() => {
                setIsSelectingLocation(false);
                setHasLocation(false);
                setIsAddingNewAddress(true);
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  if (!hasLocation) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Location">
          {(props) => (
            <LocationScreen
              {...props}
              existingLocation={null}
              onLocationSuccess={(loc) => {
                setLocationData(loc);
                setHasLocation(true);
              }}
              onBack={isAddingNewAddress ? () => {
                setIsAddingNewAddress(false);
                setHasLocation(true);
                setIsSelectingLocation(true);
              } : undefined}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  if (!userData?.isProfileComplete || isAddingNewAddress) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="UserDetails">
          {(props) => (
            <UserDetailsScreen
              {...props}
              userData={isAddingNewAddress ? null : userData}
              userToken={userToken}
              locationData={null}
              isAddingNewAddress={isAddingNewAddress}
              onSuccess={(updatedUser: any) => {
                setIsAddingNewAddress(false);
                setUserData(updatedUser);
              }}
              onBack={() => {
                if (isAddingNewAddress) {
                  setIsAddingNewAddress(false);
                  setIsSelectingLocation(true);
                } else {
                  setHasLocation(false);
                }
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  // Main App Stack
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home">
        {(props) => (
          <HomeScreen
            {...props}
            userData={userData}
            locationData={null}
            onLogout={logout}
            onAddressPress={() => setIsSelectingLocation(true)}
            onProfilePress={() => props.navigation.navigate('Account')}
            onStorePress={(store) => props.navigation.navigate('StoreDetails', { store })}
            onBannerPress={(actionType, payload, imageUrl) => {
              if (actionType === 'filter_price') {
                props.navigation.navigate('PromotionalFilter', {
                  maxPrice: payload.max_price,
                  title: payload.title,
                  imageUrl,
                });
              } else if (actionType === 'store_redirect') {
                const storeId = payload.store_id;
                if (storeId) {
                  fetch(`${API_BASE_URL}/stores/${storeId}`)
                    .then(res => res.json())
                    .then(data => {
                      if (data.success && data.data) {
                        props.navigation.navigate('StoreDetails', { store: data.data });
                      } else {
                        Alertt.alert("Error", "Could not load store details.");
                      }
                    })
                    .catch(err => {
                      Alertt.alert("Error", "Failed to connect to server.");
                    });
                }
              }
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="StoreDetails">
        {(props) => (
          <StoreDetailsScreen
            {...props}
            store={props.route.params.store}
            onBack={() => props.navigation.goBack()}
            cartItems={cartItems}
            addToCart={addItem}
            updateQuantity={updateQuantity}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Cart">
        {(props) => (
          <CartScreen
            {...props}
            cartItems={cartItems}
            onBack={() => props.navigation.goBack()}
            updateQuantity={updateQuantity}
            clearCart={clearCart}
            locationAddress={userData?.address?.line1}
            socket={socket}
            onProceedToCheckout={(total, fee, tip, isPickup, rainy, lateNight, extraStore) => {
              props.navigation.navigate('Payment', {
                totalAmount: total,
                deliveryFee: fee,
                deliveryTip: tip,
                isSelfPickup: !!isPickup,
                rainyFee: rainy,
                lateNightFee: lateNight,
                extraStoreCharge: extraStore || 0,
              });
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Payment">
        {(props) => (
          <PaymentScreen
            {...props}
            cartItems={cartItems}
            totalAmount={props.route.params.totalAmount}
            userData={userData}
            userToken={userToken}
            onBack={() => props.navigation.goBack()}
            onOrderConfirmed={(dummyId, mode) => {
              props.navigation.navigate('OrderConfirming', {
                ...props.route.params,
                paymentMode: mode,
              });
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="OrderConfirming">
        {(props) => (
          <OrderConfirmingScreen
            {...props}
            cartItems={cartItems}
            totalAmount={props.route.params.totalAmount}
            deliveryFee={props.route.params.deliveryFee}
            deliveryTip={props.route.params.deliveryTip}
            rainyFee={props.route.params.rainyFee}
            lateNightFee={props.route.params.lateNightFee}
            extraStoreCharge={props.route.params.extraStoreCharge}
            userData={userData}
            locationData={null}
            userToken={userToken}
            isSelfPickup={props.route.params.isSelfPickup}
            paymentMode={props.route.params.paymentMode}
            onSuccess={(id, order) => {
              upsertActiveOrder(order);
              clearCart();
              // Navigate to tracking
              props.navigation.replace('OrderTracking', { orderId: String(id) });
            }}
            onFailure={() => {
              props.navigation.goBack();
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="OrderTracking">
        {(props) => (
          <OrderTrackingScreen
            {...props}
            orderId={props.route.params.orderId}
            activeOrder={activeOrders.find(o => String(o.id) === String(props.route.params.orderId)) || null}
            userToken={userToken}
            onHome={() => {
              setSelectedTrackingOrderId(null);
              props.navigation.navigate('Home');
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Account">
        {(props) => (
          <AccountScreen
            {...props}
            userData={userData}
            userToken={userToken}
            onBack={() => props.navigation.goBack()}
            onLogout={logout}
            onSavedAddressPress={() => {
              props.navigation.goBack();
              setIsSelectingLocation(true);
            }}
            onOrderPress={(id) => {
              setSelectedTrackingOrderId(String(id));
              props.navigation.navigate('OrderTracking', { orderId: String(id) });
            }}
            onInfoPress={(type) => props.navigation.navigate('Info', { type })}
            onHelpPress={(preAttachedOrder) => props.navigation.navigate('Help', { preAttachedOrder })}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Help">
        {(props) => (
          <HelpScreen
            {...props}
            userToken={userToken}
            preAttachedOrder={props.route.params?.preAttachedOrder || null}
            onBack={() => props.navigation.goBack()}
            onViewTicketDetails={(ticketId) => props.navigation.navigate('TicketDetails', { ticketId })}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="TicketDetails">
        {(props) => (
          <TicketDetailsScreen
            {...props}
            ticketId={props.route.params.ticketId}
            userToken={userToken}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Info">
        {(props) => (
          <InfoScreen
            {...props}
            type={props.route.params.type}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="PromotionalFilter">
        {(props) => (
          <PromotionalFilterScreen
            {...props}
            route={{ params: props.route.params }}
            navigation={{ goBack: () => props.navigation.goBack() }}
            addToCart={addItem}
            cartItems={cartItems}
            updateQuantity={updateQuantity}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
