import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_BASE_URL } from '../config/api';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { getOptimizedImageUrl } from '../utils/image';
import { storage as mmkvStorage } from '../utils/storage';
import { useSettingsStore } from '../store/useSettingsStore';
import { calculateBilling } from '../utils/pricingUtils';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  store_id: string;
  image_url?: string;
  description?: string;
  discount_percent?: number;
  unit?: string;
}

interface CartScreenProps {
  cartItems: CartItem[];
  onBack: () => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  locationAddress?: string;
  socket?: any;
  onProceedToCheckout?: (billing: {
    grandTotal: number;
    subtotal: number;
    deliveryFee: number;
    deliveryTip: number;
    isSelfPickup: boolean;
    surgeFee: number;
    lateNightFee: number;
    extraStoreCharge: number;
    platformFee: number;
    handlingFee: number;
    packagingFee: number;
    gstAmount: number;
    couponCode: string | null;
    couponDiscount: number;
    platformDiscount: number;
  }) => void;
}

const CartScreen: React.FC<CartScreenProps> = ({ 
  cartItems, 
  onBack, 
  updateQuantity, 
  clearCart,
  locationAddress,
  socket,
  onProceedToCheckout
}) => {
  const { pricingConfig, setPricingConfig } = useSettingsStore();
  const [deliveryTip, setDeliveryTip] = useState(0);
  const [storeData, setStoreData] = useState<Record<string, any>>({});
  const [productStatuses, setProductStatuses] = useState<Record<string, any>>({});
  const [appSettings, setAppSettings] = useState<any>(null);
  const [isUnserviceable, setIsUnserviceable] = useState(false);
  const [isTooFar, setIsTooFar] = useState(false);
  const [maxRadius, setMaxRadius] = useState(10);
  const [checkingServiceability, setCheckingServiceability] = useState(true);
  const [isSelfPickup, setIsSelfPickup] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<any>(null);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Haversine Distance Helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  // 1. Fetch App Settings & Pricing Config
  const fetchAppSettings = useCallback(async () => {
    try {
      const [settingsRes, pricingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/settings`),
        fetch(`${API_BASE_URL}/pricing/config/public`),
      ]);
      const settingsData = await settingsRes.json();
      const pricingData  = await pricingRes.json();
      if (settingsData.success) setAppSettings(settingsData.data);
      if (pricingData.success)  setPricingConfig(pricingData.data);
    } catch (error) {
      console.error('Error fetching app settings / pricing config:', error);
    }
  }, [setPricingConfig]);

  // 2. Check Serviceability
  const checkServiceability = useCallback(async () => {
    if (cartItems.length === 0) {
      setCheckingServiceability(false);
      return;
    }
    
    setCheckingServiceability(true);
    try {
        const baseUrl = API_BASE_URL;
        const statuses: Record<string, any> = {};
        
        const storeIds = [...new Set(cartItems.map(item => String(item.store_id || (item as any).storeId)).filter(id => id && id !== 'undefined'))];
        
        let anyStoreOffline = false;
        let anyStoreTooFar = false;
        const storeMap: Record<string, boolean> = {};

        // Location data for distance check, read from MMKV at top-of-file import
        const userLocation = mmkvStorage.getObject('locationData');

        for (const storeId of storeIds) {
          try {
            const res = await fetch(`${baseUrl}/stores/${storeId}`);
            if (!res.ok) {
              storeMap[storeId] = true;
              continue;
            }
            const data = await res.json();
            const store = data.data;
            const isActive = data.success && store ? store.is_active : true;
            storeMap[storeId] = isActive;
            
              if (data.success && store) {
                setStoreData(prev => ({ ...prev, [storeId]: store }));

                // Distance Check
                if (userLocation?.latitude && store.latitude && !isSelfPickup) {
                   const dist = calculateDistance(userLocation.latitude, userLocation.longitude, store.latitude, store.longitude);
                   setDistanceKm(prev => prev === null ? dist : Math.max(prev, dist));
                   const limit = parseFloat(appSettings?.global_max_delivery_radius || 10);
                   if (dist > limit) {
                     anyStoreTooFar = true;
                     setMaxRadius(limit);
                   }
                }
              }
            if (!isActive) anyStoreOffline = true;
          } catch (e) {
            storeMap[storeId] = true;
          }
        }

        setIsTooFar(anyStoreTooFar);

        let anyItemUnavailable = false;
        const storeGroups: Record<string, any[]> = {};
        cartItems.forEach(item => {
          const sId = String(item.store_id || (item as any).storeId);
          if (!sId || sId === 'undefined') return;
          if (!storeGroups[sId]) storeGroups[sId] = [];
          storeGroups[sId].push(item);
        });

        for (const sId in storeGroups) {
          try {
            const res = await fetch(`${baseUrl}/products?store_id=${sId}&include_inactive=true`);
            if (!res.ok) continue;
            const data = await res.json();
            
            if (data.success && Array.isArray(data.data)) {
              const storeProducts = data.data;
              const isStoreActive = storeMap[sId] !== false;

              storeGroups[sId].forEach(cartItem => {
                const itemIdStr = String(cartItem.id);
                const [prodId, varId] = itemIdStr.split('-');
                const liveProd = storeProducts.find((p: any) => String(p.id) === (prodId || itemIdStr));
                
                if (liveProd) {
                  let isProdActive = Boolean(liveProd.is_active) && isStoreActive;
                  let isProdStockOut = Boolean(liveProd.is_stock_out) || (liveProd.stock_quantity !== undefined && liveProd.stock_quantity <= 0);
                  
                  if (varId && Array.isArray(liveProd.variants)) {
                    const variant = liveProd.variants.find((v: any) => String(v.id) === varId);
                    if (variant) {
                      isProdStockOut = Boolean(variant.is_stock_out) || (variant.stock_quantity !== undefined && variant.stock_quantity <= 0);
                    } else {
                      isProdActive = false; // Variant not found anymore
                    }
                  }
                  
                  statuses[itemIdStr] = { is_active: isProdActive, is_stock_out: isProdStockOut };
                  if (!isProdActive || isProdStockOut) anyItemUnavailable = true;
                } else {
                  statuses[itemIdStr] = { is_active: false, is_stock_out: true };
                  anyItemUnavailable = true;
                }
              });
            }
          } catch (e) {}
        }
        setProductStatuses(statuses);
        setIsUnserviceable(anyStoreOffline || anyItemUnavailable);
      } catch (error) {
        console.error('Serviceability check failed:', error);
      } finally {
        setCheckingServiceability(false);
      }
  }, [cartItems]);

  // Hooks
  useEffect(() => {
    fetchAppSettings();
  }, [fetchAppSettings]);

  // WebSocket listener for real-time settings updates
  useEffect(() => {
    if (!socket) return;

    socket.on('settings_updated', (newSettings: any) => {
      console.log('[Cart] Global settings updated via socket');
      setAppSettings(newSettings);
    });

    return () => {
      socket.off('settings_updated');
    };
  }, [socket]);

  useEffect(() => {
    checkServiceability();
  }, [checkServiceability, locationAddress]);

  // ── Billing calculation via shared pricing utility ────────────────────────
  const billingInfo = React.useMemo(() => {
    return calculateBilling({
      cartItems,
      productStatuses,
      storeData,
      appSettings,
      pricingConfig,
      distanceKm,
      deliveryTip,
      isSelfPickup,
      coupon,
    });
  }, [cartItems, productStatuses, storeData, appSettings, pricingConfig, distanceKm, deliveryTip, isSelfPickup, coupon]);

  const {
    subtotal, totalSavings, platformFee, handlingFee, packagingFee,
    deliveryFee, surgeFee, lateNightFee, isLateNight, extraStoreCharge,
    deliveryTip: effectiveTip, gstAmount, couponDiscount, platformDiscount, grandTotal,
  } = billingInfo;

  // ── Coupon validation ─────────────────────────────────────────────────────
  const validateCoupon = async () => {
    if (!couponInput.trim()) return;
    if (coupon) { // remove coupon
      setCoupon(null); setCouponCode(''); setCouponInput(''); setCouponError('');
      return;
    }
    setCouponLoading(true);
    setCouponError('');
    try {
      const token = mmkvStorage.getString('userToken');
      const res = await fetch(`${API_BASE_URL}/pricing/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      });
      const data = await res.json();
      if (data.success) {
        setCoupon(data.data);
        setCouponCode(couponInput.trim().toUpperCase());
        setCouponError('');
      } else {
        setCoupon(null); setCouponCode('');
        setCouponError(data.error || 'Invalid coupon');
      }
    } catch {
      setCouponError('Could not verify coupon. Try again.');
    } finally {
      setCouponLoading(false);
    }
  };



  return (

    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Pickup Confirmation Modal */}
      <Modal
        visible={showPickupModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPickupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Icon name="walk" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Switch to Self-Pickup?</Text>
            <Text style={styles.modalDescription}>
              You will need to fetch the order from the store yourself. Delivery charges and tips will be removed from your bill.
            </Text>
            
            <View style={styles.modalActionRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setShowPickupModal(false)}
              >
                <Text style={styles.modalCancelText}>Go Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmBtn} 
                onPress={() => {
                  setIsSelfPickup(true);
                  setShowPickupModal(false);
                  setDeliveryTip(0);
                }}
              >
                <Text style={styles.modalConfirmText}>Confirm Pickup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <View style={styles.addressRow}>
              <Icon name="navigate" size={14} color="#333" />
              <Text style={styles.addressText} numberOfLines={1}>
                {locationAddress || 'Main Address'}
              </Text>
              <Icon name="chevron-down" size={14} color="#333" />
            </View>
            <Text style={styles.addressDetail} numberOfLines={1}>
              House, Bauria, Howrah...
            </Text>
          </View>
          <View style={styles.headerRight}>
             <View style={styles.incognitoToggle}>
                <Icon name="person" size={14} color="#888" />
                <View style={styles.toggleThumbSmall} />
             </View>
             <Icon name="ellipsis-vertical" size={20} color="#333" />
          </View>
        </View>

        {/* Saved Money Banner (Attached to Header) */}
        {totalSavings > 0 && (
          <View style={styles.savedBanner}>
             <Text style={styles.savedText}>
                <Text style={styles.greenTextBold}>₹{totalSavings.toFixed(0)} saved!</Text> Save more on every order with One membership
             </Text>
          </View>
        )}


        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Cart Content */}
          <View style={styles.cartSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.unserviceableTitle, !isUnserviceable && { color: '#333' }]}>
                  {isUnserviceable ? 'Currently unserviceable' : 'Your Items'}
                </Text>
                <Text style={styles.itemCountText}>{cartItems.length} items</Text>
              </View>

              <TouchableOpacity onPress={clearCart}>
                <Text style={styles.removeAllText}>Remove all <Icon name="close" size={14} /></Text>
              </TouchableOpacity>
            </View>

            {cartItems.map((item) => {
              const status = productStatuses[String(item.id)];
              const isItemUnavailable = status && (!status.is_active || status.is_stock_out);

              return (
                <View key={item.id} style={[styles.cartItem, isItemUnavailable && { opacity: 0.5 }]}>
                  <View style={styles.itemImageContainer}>
                    {item.image_url ? (
                      <View style={styles.imageWrapper}>
                        <Image 
                          source={{ uri: getOptimizedImageUrl(item.image_url, 150) }} 
                          style={[styles.itemImage, isItemUnavailable && { opacity: 0.5 }]} 
                        />
                        {isItemUnavailable && <View style={styles.grayscaleOverlay} />}
                      </View>
                    ) : (
                      <Icon name="fast-food-outline" size={24} color="#ccc" />
                    )}
                    {isItemUnavailable && (
                      <View style={styles.itemOffTag}>
                        <Text style={styles.itemOffTagText}>OFF</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, isItemUnavailable && { color: '#999' }]}>{item.name}</Text>
                    {item.unit ? (
                      <Text style={[styles.itemWeight, isItemUnavailable && { color: '#bbb' }]}>{item.unit}</Text>
                    ) : null}
                    {isItemUnavailable && (
                      <Text style={styles.itemUnavailableMsg}>
                        {status?.is_stock_out ? 'OUT OF STOCK' : 'CURRENTLY UNAVAILABLE'}
                      </Text>
                    )}
                    <TouchableOpacity style={styles.wishlistBtn} disabled={isItemUnavailable}>
                      <Icon name="bookmark-outline" size={12} color={isItemUnavailable ? '#ddd' : '#888'} />
                      <Text style={[styles.wishlistText, isItemUnavailable && { color: '#ddd' }]}>Move to wishlist</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.quantityContainer, isItemUnavailable && { borderColor: '#eee', opacity: 0.5 }]}>
                    <TouchableOpacity 
                      style={styles.qtyBtn} 
                      onPress={() => updateQuantity(item.id, -1)}
                    >
                      <Icon name="remove" size={16} color={isItemUnavailable ? '#ccc' : Colors.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, isItemUnavailable && { color: '#ccc' }]}>{item.quantity}</Text>
                    <TouchableOpacity 
                      style={styles.qtyBtn} 
                      onPress={() => updateQuantity(item.id, 1)}
                    >
                      <Icon name="add" size={16} color={isItemUnavailable ? '#ccc' : Colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={[styles.itemPrice, isItemUnavailable && { textDecorationLine: 'line-through', color: '#ddd' }]}>
                      ₹{(item.price * (1 - (item.discount_percent || 0) / 100) * item.quantity).toFixed(0)}
                    </Text>
                  </View>
                </View>

              );
            })}

          </View>



          {/* Preferences */}
          <View style={styles.prefSection}>
             <View style={styles.prefRow}>
                <View style={styles.prefTextContainer}>
                   <Text style={styles.prefTitle}>I don't need a bag! <Icon name="leaf" size={14} color="#4caf50" /></Text>
                   <Text style={styles.prefDesc}>Take the pledge for a greener future - opt for a no bag delivery!</Text>
                </View>
                <View style={styles.toggleTrack}>
                   <View style={styles.toggleThumb} />
                </View>
             </View>

             <TouchableOpacity 
               style={styles.prefRow}
               onPress={() => {
                 if (isSelfPickup) {
                   setIsSelfPickup(false);
                 } else {
                   setShowPickupModal(true);
                 }
               }}
             >
                <View style={styles.prefTextContainer}>
                   <Text style={styles.prefTitle}>Self-Pickup <Icon name="walk" size={14} color={Colors.primary} /></Text>
                   <Text style={styles.prefDesc}>I will fetch the order from the store myself.</Text>
                </View>
                <View style={[styles.toggleTrack, isSelfPickup && { backgroundColor: Colors.primary }]}>
                   <View style={[styles.toggleThumb, isSelfPickup && { alignSelf: 'flex-end' }]} />
                </View>
             </TouchableOpacity>

             {!isSelfPickup && (
               <View style={styles.tipSection}>
                  <Text style={styles.tipTitle}>DELIVERY TIP <Icon name="information-circle-outline" size={14} color="#888" /></Text>
                  <View style={styles.tipContent}>
                     <View style={styles.tipTextContainer}>
                        <Text style={styles.tipDesc}>A small tip, a big gesture! Tip your delivery partner to show your appreciation.</Text>
                        <View style={styles.tipOptions}>
                           {[10, 20, 30].map(val => (
                             <TouchableOpacity 
                               key={val} 
                               style={[styles.tipBtn, deliveryTip === val && styles.tipBtnActive]}
                               onPress={() => setDeliveryTip(deliveryTip === val ? 0 : val)}
                             >
                                <Text style={[styles.tipBtnText, deliveryTip === val && styles.tipBtnTextActive]}>₹{val}</Text>
                                {val === 20 && <View style={styles.mostTipped}><Text style={styles.mostTippedText}>Most tipped</Text></View>}
                             </TouchableOpacity>
                           ))}
                           <TouchableOpacity style={styles.tipBtn}>
                              <Text style={styles.tipBtnText}>Other</Text>
                           </TouchableOpacity>
                        </View>

                     </View>
                     <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2331/2331827.png' }} style={styles.tipImage} />
                  </View>
               </View>
             )}
          </View>

          {/* Bill Details */}
          <View style={styles.billSection}>
             <Text style={styles.billTitle}>BILL DETAILS</Text>
             <View style={styles.billContent}>
                {/* Item Total */}
                <View style={styles.billRow}>
                   <Text style={styles.billLabel}>Item Total</Text>
                   <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.billValue}>₹{subtotal.toFixed(2)}</Text>
                      {totalSavings > 0 && (
                        <Text style={[styles.feeSubtext, { color: Colors.primary, fontFamily: Fonts.bold, textDecorationLine: 'line-through' }]}>
                           ₹{(subtotal + totalSavings).toFixed(2)}
                        </Text>
                      )}
                   </View>
                </View>

                {/* Platform Fee */}
                {pricingConfig?.platform_fee_enabled !== false && (
                  <View style={styles.billRow}>
                    <View style={styles.rowInline}>
                      <Text style={styles.billLabelDashed}>Platform Fee</Text>
                      <Icon name="information-circle-outline" size={13} color="#bbb" style={{ marginLeft: 4 }} />
                    </View>
                    <Text style={styles.billValue}>₹{platformFee.toFixed(2)}</Text>
                  </View>
                )}

                {/* Handling Fee */}
                {pricingConfig?.handling_fee_enabled !== false && (
                  <View style={styles.billRow}>
                    <Text style={styles.billLabelDashed}>Order Handling Fee</Text>
                    <Text style={styles.billValue}>₹{handlingFee.toFixed(2)}</Text>
                  </View>
                )}

                {/* Packaging Fee */}
                {pricingConfig?.packaging_fee_enabled && (
                  <View style={styles.billRow}>
                    <Text style={styles.billLabelDashed}>Packaging Fee</Text>
                    <Text style={styles.billValue}>₹{packagingFee.toFixed(2)}</Text>
                  </View>
                )}

                <View style={styles.billDivider} />
                {/* Delivery Tip */}
                <View style={styles.billRow}>
                   <Text style={styles.billLabel}>Delivery Partner Tip</Text>
                   {effectiveTip > 0 ? (
                     <Text style={styles.billValue}>₹{effectiveTip.toFixed(2)}</Text>
                   ) : (
                     <TouchableOpacity><Text style={styles.addTipText}>Add a tip</Text></TouchableOpacity>
                   )}
                </View>
                <View style={styles.billDivider} />

                {/* Delivery Fee */}
                <View style={styles.billRow}>
                   <View>
                      <Text style={styles.billLabelDashed}>Delivery Partner Fee</Text>
                      {deliveryFee === 0 ? (
                        <Text style={[styles.feeSubtext, { color: '#4caf50' }]}>Free Delivery applied!</Text>
                      ) : (
                        <Text style={styles.feeSubtext}>
                          Add items worth ₹{Math.max(0, (appSettings?.free_delivery_threshold || 500) - subtotal).toFixed(0)} to avail Free Delivery
                        </Text>
                      )}
                   </View>
                   <Text style={styles.billValue}>₹{deliveryFee.toFixed(2)}</Text>
                </View>

                {/* Surge Fee (rain + peak) */}
                {surgeFee > 0 && (
                  <View style={styles.billRow}>
                    <View style={styles.rowInline}>
                      <Text style={styles.billLabelDashed}>Surge Fee</Text>
                      <Icon name="flash" size={14} color="#e65100" style={{ marginLeft: 5 }} />
                    </View>
                    <Text style={styles.billValue}>₹{surgeFee.toFixed(2)}</Text>
                  </View>
                )}

                {/* Late Night Fee */}
                <View style={styles.billRow}>
                   <View style={styles.rowInline}>
                      <Text style={styles.billLabelDashed}>Late Night Fee</Text>
                      <Icon name="moon" size={14} color="#673ab7" style={{ marginLeft: 5 }} />
                   </View>
                   <Text style={styles.billValue}>₹{lateNightFee.toFixed(2)}</Text>
                </View>

                <Text style={styles.feeSubtext}>
                  {isLateNight
                    ? `Applied for orders between ${appSettings?.late_night_start} - ${appSettings?.late_night_end}`
                    : `No late night fees on orders above ₹${appSettings?.free_delivery_threshold || 199}`
                  }
                </Text>

                {/* Extra Store Charge */}
                {extraStoreCharge > 0 && (
                  <View style={styles.billRow}>
                     <View style={styles.rowInline}>
                        <Text style={styles.billLabelDashed}>Extra Store Charge</Text>
                        <Icon name="basket" size={14} color={Colors.primary} style={{ marginLeft: 5 }} />
                     </View>
                     <Text style={styles.billValue}>₹{extraStoreCharge.toFixed(2)}</Text>
                  </View>
                )}

                {/* Coupon Input */}
                <View style={styles.billDivider} />
                <View style={[styles.billRow, { alignItems: 'center', marginBottom: 4 }]}>
                  <TextInput
                    style={styles.couponInput}
                    placeholder="Enter coupon code"
                    placeholderTextColor="#bbb"
                    value={couponInput}
                    onChangeText={setCouponInput}
                    autoCapitalize="characters"
                    editable={!coupon}
                  />
                  <TouchableOpacity
                    style={[styles.couponApplyBtn, coupon && { backgroundColor: '#e53935' }]}
                    onPress={validateCoupon}
                    disabled={couponLoading}
                  >
                    <Text style={styles.couponApplyText}>
                      {couponLoading ? '...' : coupon ? 'Remove' : 'Apply'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {!!couponError && <Text style={styles.couponErrorText}>{couponError}</Text>}

                {/* Coupon Discount */}
                {coupon && couponDiscount > 0 && (
                  <View style={styles.billRow}>
                    <View style={styles.rowInline}>
                      <Text style={[styles.billLabelDashed, { color: '#4caf50' }]}>Coupon ({couponCode})</Text>
                    </View>
                    <Text style={[styles.billValue, { color: '#4caf50' }]}>- ₹{couponDiscount.toFixed(2)}</Text>
                  </View>
                )}

                {/* Platform Discount */}
                {platformDiscount > 0 && (
                  <View style={styles.billRow}>
                    <Text style={[styles.billLabelDashed, { color: '#4caf50' }]}>Platform Offer</Text>
                    <Text style={[styles.billValue, { color: '#4caf50' }]}>- ₹{platformDiscount.toFixed(2)}</Text>
                  </View>
                )}

                {/* GST (inclusive — informational only) */}
                {gstAmount > 0 && (
                  <View style={styles.billRow}>
                    <View style={styles.rowInline}>
                      <Text style={styles.billLabelDashed}>GST ({pricingConfig?.gst_percentage}%)</Text>
                      <Icon name="information-circle-outline" size={12} color="#aaa" style={{ marginLeft: 4 }} />
                    </View>
                    <Text style={[styles.billValue, { color: '#999', fontSize: 12 }]}>incl.</Text>
                  </View>
                )}

                <View style={styles.billDividerSolid} />
                <View style={styles.totalRow}>
                   <Text style={styles.totalLabel}>To Pay</Text>
                   <Text style={styles.totalValue}>₹{grandTotal.toFixed(2)}</Text>
                </View>
             </View>
          </View>

          {/* Policy Box */}
          <View style={styles.policySection}>
             <Text style={styles.policyText}>
                <Text style={styles.policyNote}>NOTE:</Text> Orders cannot be cancelled and are non-refundable once packed for delivery.
             </Text>
             <TouchableOpacity>
                <Text style={styles.policyLink}>Read cancellation policy</Text>
             </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Sticky Footer */}
        <View style={styles.stickyFooter}>
           <View style={styles.footerHeader}>
              <View style={styles.footerPriceRow}>
                 <Text style={styles.footerToPay}>To Pay: </Text>
                 <Text style={styles.footerTotal}>₹{grandTotal.toFixed(0)} </Text>
                 {totalSavings > 0 && (
                   <Text style={styles.footerTotalStrike}>₹{(grandTotal + totalSavings).toFixed(2)}</Text>
                 )}
              </View>
              <TouchableOpacity>
                 <Text style={styles.viewDetailedBill}>View Detailed Bill</Text>
              </TouchableOpacity>
           </View>

           {isUnserviceable || (isTooFar && !isSelfPickup) ? (
             <>
               <View style={styles.unserviceableBox}>
                  <View style={styles.errorIconCircle}>
                     <Icon name="close" size={16} color="#fff" />
                  </View>
                  <View style={styles.unserviceableTextContainer}>
                     <Text style={styles.unserviceableMsgTitle}>
                       {isTooFar 
                         ? `Store is too far for delivery`
                         : (Object.values(productStatuses).some(s => !s.is_active || s.is_stock_out) 
                            ? 'Some items are currently unavailable' 
                            : 'This FreshRush store is currently unserviceable')}
                     </Text>
                     <Text style={styles.unserviceableMsgSub}>
                       {isTooFar 
                         ? `Max delivery distance is ${maxRadius}km. Try self-pickup or another store.`
                         : 'Please remove unavailable items to proceed'}
                     </Text>
                  </View>
               </View>

               <TouchableOpacity style={styles.retryBtn} onPress={checkServiceability}>
                  <Text style={styles.retryBtnText}>Retry</Text>
               </TouchableOpacity>
             </>
           ) : (
             <TouchableOpacity 
                style={styles.checkoutBtn} 
                disabled={checkingServiceability}
                onPress={() => onProceedToCheckout && onProceedToCheckout({
                   grandTotal,
                   subtotal,
                   deliveryFee,
                   deliveryTip: effectiveTip,
                   isSelfPickup,
                   surgeFee,
                   lateNightFee,
                   extraStoreCharge,
                   platformFee,
                   handlingFee,
                   packagingFee,
                   gstAmount,
                   couponCode: couponCode || null,
                   couponDiscount,
                   platformDiscount,
                 })}
              >
                 <Text style={styles.checkoutBtnText}>
                   {checkingServiceability ? 'Checking...' : 'Proceed to Checkout'}
                 </Text>
                 <Icon name="chevron-forward" size={18} color="#fff" />
              </TouchableOpacity>
           )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    fontSize: 15,
    fontFamily: Fonts.black,
    color: '#333',
    maxWidth: '80%',
  },
  addressDetail: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#888',
    marginTop: 1,
  },
  headerRight: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 15,
  },
  incognitoToggle: {
     width: 44,
     height: 24,
     borderRadius: 12,
     backgroundColor: '#f0f0f0',
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 4,
     justifyContent: 'space-between',
  },
  toggleThumbSmall: {
     width: 18,
     height: 18,
     borderRadius: 9,
     backgroundColor: '#fff',
     elevation: 2,
  },
  savedBanner: {
    backgroundColor: '#e6fff0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  savedText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#333',
  },
  greenTextBold: {
    color: '#2e7d32',
    fontFamily: Fonts.bold,
  },
  scrollContent: {
    paddingBottom: 220, // Space for sticky footer
  },
  cartSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 15,
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  unserviceableTitle: {
    fontSize: 18,
    fontFamily: Fonts.black,
    color: '#e53935',
  },
  itemCountText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#888',
    marginTop: 2,
  },
  removeAllText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#666',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  grayscaleOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#333',
  },
  itemWeight: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#999',
    marginTop: 2,
  },
  wishlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  wishlistText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#888',
    textDecorationLine: 'underline',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 4,
    marginHorizontal: 10,
    height: 36,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    paddingHorizontal: 8,
  },
  priceContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#333',
  },

  prefSection: {
     marginHorizontal: 15,
     marginBottom: 15,
     gap: 15,
  },
  prefRow: {
     backgroundColor: '#fff',
     borderRadius: 20,
     padding: 15,
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
  },
  prefTextContainer: {
     flex: 1,
     marginRight: 15,
  },
  prefTitle: {
     fontSize: 15,
     fontFamily: Fonts.black,
     color: '#333',
  },
  prefDesc: {
     fontSize: 12,
     fontFamily: Fonts.regular,
     color: '#888',
     marginTop: 4,
     lineHeight: 16,
  },
  toggleTrack: {
     width: 44,
     height: 24,
     backgroundColor: '#eee',
     borderRadius: 12,
     padding: 2,
  },
  toggleThumb: {
     width: 20,
     height: 20,
     borderRadius: 10,
     backgroundColor: '#fff',
     elevation: 2,
  },
  tipSection: {
     backgroundColor: '#fff',
     borderRadius: 20,
     padding: 15,
  },
  tipTitle: {
     fontSize: 12,
     fontFamily: Fonts.black,
     color: '#999',
     letterSpacing: 1,
     marginBottom: 15,
  },
  tipContent: {
     flexDirection: 'row',
     alignItems: 'flex-start',
  },
  tipTextContainer: {
     flex: 1,
     marginRight: 10,
  },
  tipDesc: {
     fontSize: 13,
     fontFamily: Fonts.regular,
     color: '#666',
     lineHeight: 18,
     marginBottom: 15,
  },
  tipOptions: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 8,
  },
  tipBtn: {
     paddingHorizontal: 15,
     paddingVertical: 8,
     borderRadius: 10,
     borderWidth: 1,
     borderColor: '#eee',
     alignItems: 'center',
     minWidth: 60,
  },
  tipBtnActive: {
     borderColor: '#0052cc',
     backgroundColor: '#fff',
     borderBottomWidth: 4,
     borderBottomColor: '#0052cc',
  },
  tipBtnText: {
     fontSize: 14,
     fontFamily: Fonts.bold,
     color: '#333',
  },
  tipBtnTextActive: {
     color: '#0052cc',
  },
  mostTipped: {
     position: 'absolute',
     bottom: -22,
     backgroundColor: '#0052cc',
     paddingHorizontal: 6,
     paddingVertical: 2,
     borderRadius: 4,
     width: 70,
     alignItems: 'center',
  },
  mostTippedText: {
     color: '#fff',
     fontSize: 8,
     fontFamily: Fonts.black,
  },
  tipImage: {
     width: 60,
     height: 60,
     resizeMode: 'contain',
  },
  billSection: {
     backgroundColor: '#fff',
     borderRadius: 20,
     marginHorizontal: 15,
     marginBottom: 15,
     padding: 15,
  },
  billTitle: {
     fontSize: 12,
     fontFamily: Fonts.black,
     color: '#999',
     letterSpacing: 1,
     marginBottom: 15,
  },
  billContent: {
     gap: 12,
  },
  billRow: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'flex-start',
  },
  billLabel: {
     fontSize: 14,
     fontFamily: Fonts.medium,
     color: '#333',
  },
  billLabelDashed: {
     fontSize: 14,
     fontFamily: Fonts.medium,
     color: '#333',
     textDecorationLine: 'underline',
     textDecorationStyle: 'dotted',
  },
  billValue: {
     fontSize: 14,
     fontFamily: Fonts.bold,
     color: '#333',
  },
  billDivider: {
     height: 1,
     backgroundColor: '#f0f0f0',
     borderStyle: 'dashed',
     borderWidth: 1,
     borderColor: '#eee',
     marginVertical: 4,
  },
  billDividerSolid: {
     height: 1,
     backgroundColor: '#eee',
     marginVertical: 4,
  },
  addTipText: {
     fontSize: 14,
     fontFamily: Fonts.bold,
     color: '#0052cc',
  },
  feeSubtext: {
     fontSize: 12,
     fontFamily: Fonts.regular,
     color: '#888',
     marginTop: 2,
     maxWidth: '85%',
  },
  rowInline: {
     flexDirection: 'row',
     alignItems: 'center',
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#333',
    marginRight: 8,
  },
  couponApplyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  couponApplyText: {
    color: '#fff',
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  couponErrorText: {
    color: '#e53935',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginBottom: 6,
    marginLeft: 4,
  },
  totalRow: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginTop: 5,
  },
  totalLabel: {
     fontSize: 16,
     fontFamily: Fonts.black,
     color: '#1a1a1a',
  },
  totalValue: {
     fontSize: 16,
     fontFamily: Fonts.black,
     color: '#1a1a1a',
  },
  policySection: {
     backgroundColor: '#fff',
     borderRadius: 20,
     marginHorizontal: 15,
     marginBottom: 20,
     padding: 15,
  },
  policyText: {
     fontSize: 15,
     fontFamily: Fonts.medium,
     color: '#666',
     lineHeight: 22,
  },
  policyNote: {
     color: '#f44336',
     fontFamily: Fonts.black,
  },
  policyLink: {
     fontSize: 16,
     fontFamily: Fonts.black,
     color: '#0052cc',
     marginTop: 15,
     textDecorationLine: 'underline',
  },
  stickyFooter: {
     position: 'absolute',
     bottom: 0,
     left: 0,
     right: 0,
     backgroundColor: '#fff',
     paddingHorizontal: 15,
     paddingTop: 12,
     paddingBottom: Platform.OS === 'ios' ? 30 : 15,
     borderTopWidth: 1,
     borderTopColor: '#f0f0f0',
     elevation: 20,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: -10 },
     shadowOpacity: 0.05,
     shadowRadius: 10,
  },
  footerHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: 15,
  },
  footerPriceRow: {
     flexDirection: 'row',
     alignItems: 'center',
  },
  footerToPay: {
     fontSize: 14,
     fontFamily: Fonts.medium,
     color: '#333',
  },
  footerTotal: {
     fontSize: 15,
     fontFamily: Fonts.black,
     color: '#333',
  },
  footerTotalStrike: {
     fontSize: 12,
     fontFamily: Fonts.regular,
     color: '#aaa',
     textDecorationLine: 'line-through',
     marginLeft: 5,
  },
  viewDetailedBill: {
     fontSize: 14,
     fontFamily: Fonts.black,
     color: '#0052cc',
  },
  unserviceableBox: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 15,
  },
  errorIconCircle: {
     width: 24,
     height: 24,
     borderRadius: 12,
     backgroundColor: '#f44336',
     alignItems: 'center',
     justifyContent: 'center',
  },
  unserviceableTextContainer: {
     flex: 1,
     marginLeft: 12,
  },
  unserviceableMsgTitle: {
     fontSize: 15,
     fontFamily: Fonts.black,
     color: '#333',
  },
  unserviceableMsgSub: {
     fontSize: 13,
     fontFamily: Fonts.regular,
     color: '#888',
     marginTop: 2,
  },
  retryBtn: {
     backgroundColor: '#0052cc',
     borderRadius: 12,
     height: 54,
     alignItems: 'center',
     justifyContent: 'center',
  },
  retryBtnText: {
    color: '#333',
    fontSize: 16,
    fontFamily: Fonts.black,
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 15,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.black,
  },
  itemOffTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    alignItems: 'center',
    borderRadius: 8,
  },
  itemOffTagText: {
    color: '#fff',
    fontSize: 8,
    fontFamily: Fonts.black,
  },
  itemUnavailableMsg: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#e53935',
    marginTop: 2,
  },
  serviceSelectionSection: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 6,
    gap: 8,
  },
  serviceTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  serviceTypeBtnActive: {
    backgroundColor: '#333',
  },
  serviceTypeBtnActivePickup: {
    backgroundColor: Colors.primary,
  },
  serviceTypeText: {
    fontSize: 14,
    fontFamily: Fonts.black,
    color: '#666',
  },
  serviceTypeTextActive: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff1f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.black,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#666',
  },
  modalConfirmText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
});

export default CartScreen;
