/**
 * pricingUtils.ts
 * Client-side pricing calculation — mirrors pricingEngine.js on the backend.
 * All amounts in ₹, returned as plain numbers.
 */

interface Slab {
  min: number;
  max: number;
  fee: number;
}

export interface CartItem {
  id: string;
  price: number;
  quantity: number;
  discount_percent?: number;
  store_id?: string;
  storeId?: string;
  [key: string]: any;
}

export interface BillingResult {
  subtotal: number;
  totalSavings: number;
  platformFee: number;
  handlingFee: number;
  packagingFee: number;
  deliveryFee: number;
  surgeFee: number;
  lateNightFee: number;
  extraStoreCharge: number;
  deliveryTip: number;
  gstAmount: number;
  couponDiscount: number;
  platformDiscount: number;
  grandTotal: number;
  isLateNight: boolean;
}

export const DEFAULT_PRICING_CONFIG = {
  platform_fee_enabled: true,
  platform_fee_slabs: [
    { min: 1, max: 300, fee: 5 },
    { min: 301, max: 1000, fee: 10 },
    { min: 1001, max: 2000, fee: 20 },
    { min: 2001, max: 3000, fee: 30 },
    { min: 3001, max: 4000, fee: 40 },
    { min: 4001, max: 5000, fee: 50 },
  ],
  platform_fee_step_amount: 1000,
  platform_fee_step_fee: 10,

  handling_fee_enabled: true,
  handling_fee_slabs: [
    { min: 0, max: 500, fee: 5 },
    { min: 501, max: 1000, fee: 10 },
    { min: 1001, max: 1500, fee: 15 },
    { min: 1501, max: 2000, fee: 20 },
  ],
  handling_fee_step_amount: 500,
  handling_fee_step_fee: 5,

  packaging_fee_enabled: false,
  packaging_fee_type: 'fixed',
  packaging_fee_value: 10,

  gst_enabled: false,
  gst_percentage: 5,
  gst_applies_on: 'product_only',

  peak_surge_enabled: false,
  peak_surge_amount: 15,
  peak_surge_start: '12:00',
  peak_surge_end: '14:00',

  platform_discount_enabled: false,
  platform_discount_type: 'flat',
  platform_discount_value: 0,
};

function lookupSlab(value: number, slabs: Slab[], stepAmount: number, stepFee: number): number {
  if (!Array.isArray(slabs) || slabs.length === 0) return 0;
  for (const slab of slabs) {
    if (value >= slab.min && value <= slab.max) return Number(slab.fee) || 0;
  }
  const lastSlab = slabs[slabs.length - 1];
  if (value > lastSlab.max) {
    const stepsAbove = Math.ceil((value - lastSlab.max) / stepAmount);
    return (Number(lastSlab.fee) || 0) + stepsAbove * stepFee;
  }
  return 0;
}

function calcPlatformFee(items: CartItem[], config: any): number {
  const cfg = { ...DEFAULT_PRICING_CONFIG, ...config };
  if (cfg.platform_fee_enabled === false) return 0;
  const slabs: Slab[] = (Array.isArray(cfg.platform_fee_slabs) && cfg.platform_fee_slabs.length > 0)
    ? cfg.platform_fee_slabs
    : DEFAULT_PRICING_CONFIG.platform_fee_slabs;
  const stepAmount = Number(cfg.platform_fee_step_amount) || 1000;
  const stepFee = Number(cfg.platform_fee_step_fee) || 10;
  let total = 0;
  for (const item of items) {
    const discount = item.discount_percent || 0;
    const sellingPrice = item.price * (1 - discount / 100);
    const feePerUnit = lookupSlab(sellingPrice, slabs, stepAmount, stepFee);
    total += feePerUnit * (item.quantity || 1);
  }
  return Math.round(total);
}

function calcHandlingFee(subtotal: number, config: any): number {
  const cfg = { ...DEFAULT_PRICING_CONFIG, ...config };
  if (cfg.handling_fee_enabled === false) return 0;
  const slabs: Slab[] = (Array.isArray(cfg.handling_fee_slabs) && cfg.handling_fee_slabs.length > 0)
    ? cfg.handling_fee_slabs
    : DEFAULT_PRICING_CONFIG.handling_fee_slabs;
  const stepAmount = Number(cfg.handling_fee_step_amount) || 500;
  const stepFee = Number(cfg.handling_fee_step_fee) || 5;
  return Math.round(lookupSlab(subtotal, slabs, stepAmount, stepFee));
}

function calcPackagingFee(config: any, subtotal: number): number {
  const cfg = { ...DEFAULT_PRICING_CONFIG, ...config };
  if (!cfg.packaging_fee_enabled) return 0;
  if (cfg.packaging_fee_type === 'percentage') {
    return Math.round((subtotal * parseFloat(cfg.packaging_fee_value || 0)) / 100);
  }
  return Math.round(parseFloat(cfg.packaging_fee_value || 0));
}

function calcDeliveryFee(
  subtotal: number,
  distanceKm: number | null,
  appSettings: any,
  isSelfPickup: boolean,
): number {
  if (isSelfPickup) return 0;
  const freeThreshold = parseFloat(appSettings?.free_delivery_threshold || 500);
  if (subtotal >= freeThreshold) return 0;
  let fee = parseFloat(appSettings?.min_delivery_fee || 30);
  const baseKm = parseFloat(appSettings?.base_delivery_radius || 5);
  const perKm = parseFloat(appSettings?.per_km_extra_charge || 10);
  if (distanceKm && distanceKm > baseKm) {
    fee += (distanceKm - baseKm) * perKm;
  }
  return Math.round(fee);
}

function calcSurgeFee(appSettings: any, config: any, isSelfPickup: boolean): number {
  if (isSelfPickup) return 0;
  let surge = 0;
  // Rain surge (existing app_settings field)
  if (appSettings?.is_rainy_condition) {
    surge += parseFloat(appSettings.rainy_condition_fee || 0);
  }
  // Peak hour surge (pricing_config)
  const cfg = { ...DEFAULT_PRICING_CONFIG, ...config };
  if (cfg.peak_surge_enabled) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = (cfg.peak_surge_start || '12:00').split(':').map(Number);
    const [eh, em] = (cfg.peak_surge_end || '14:00').split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const isPeak =
      startMins > endMins
        ? currentMins >= startMins || currentMins <= endMins
        : currentMins >= startMins && currentMins <= endMins;
    if (isPeak) surge += parseFloat(cfg.peak_surge_amount || 0);
  }
  return Math.round(surge);
}

function calcGST(subtotal: number, feesTotal: number, config: any): number {
  const cfg = { ...DEFAULT_PRICING_CONFIG, ...config };
  if (!cfg.gst_enabled) return 0;
  const pct = parseFloat(cfg.gst_percentage || 0);
  const base =
    cfg.gst_applies_on === 'product_only' ? subtotal : subtotal + feesTotal;
  return Math.round((base * pct) / 100);
}

function applyCouponDiscount(
  coupon: any | null,
  subtotal: number,
  preTaxTotal: number,
): number {
  if (!coupon || !coupon.is_active) return 0;
  if (subtotal < (coupon.min_order_value || 0)) return 0;
  if (coupon.discount_type === 'flat') {
    return Math.min(coupon.discount_value, preTaxTotal);
  }
  const discount = Math.round((preTaxTotal * coupon.discount_value) / 100);
  if (coupon.max_discount_cap) return Math.min(discount, coupon.max_discount_cap);
  return discount;
}

function calcPlatformDiscount(config: any, preTaxTotal: number): number {
  const cfg = { ...DEFAULT_PRICING_CONFIG, ...config };
  if (!cfg.platform_discount_enabled) return 0;
  if (cfg.platform_discount_type === 'flat') {
    return Math.min(parseFloat(cfg.platform_discount_value || 0), preTaxTotal);
  }
  return Math.round(
    (preTaxTotal * parseFloat(cfg.platform_discount_value || 0)) / 100,
  );
}

export function calculateBilling(params: {
  cartItems: CartItem[];
  productStatuses: Record<string, any>;
  storeData: Record<string, any>;
  appSettings: any;
  pricingConfig: any;
  distanceKm: number | null;
  deliveryTip: number;
  isSelfPickup: boolean;
  coupon: any | null;
}): BillingResult {
  const {
    cartItems,
    productStatuses,
    appSettings,
    pricingConfig,
    distanceKm,
    deliveryTip,
    isSelfPickup,
    coupon,
  } = params;

  const cfg = { ...DEFAULT_PRICING_CONFIG, ...pricingConfig };

  // Active items only (exclude out-of-stock / inactive)
  const activeItems = cartItems.filter(item => {
    const status = productStatuses[String(item.id)];
    return !status || (status.is_active && !status.is_stock_out);
  });

  // Subtotal and savings
  const subtotal = activeItems.reduce((sum, item) => {
    const discount = item.discount_percent || 0;
    return sum + item.price * (1 - discount / 100) * item.quantity;
  }, 0);

  const totalSavings = cartItems.reduce((sum, item) => {
    const status = productStatuses[String(item.id)];
    if (status && (!status.is_active || status.is_stock_out)) return sum;
    return sum + item.price * ((item.discount_percent || 0) / 100) * item.quantity;
  }, 0);

  const platformFee  = calcPlatformFee(activeItems, cfg);
  const handlingFee  = calcHandlingFee(subtotal, cfg);
  const packagingFee = calcPackagingFee(cfg, subtotal);
  const deliveryFee  = calcDeliveryFee(subtotal, distanceKm, appSettings, isSelfPickup);
  const surgeFee     = calcSurgeFee(appSettings, cfg, isSelfPickup);

  // Late night fee
  let lateNightFee = 0;
  let isLateNight = false;
  if (!isSelfPickup && appSettings?.late_night_start && appSettings?.late_night_end) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = appSettings.late_night_start.split(':').map(Number);
    const [eh, em] = appSettings.late_night_end.split(':').map(Number);
    const st = sh * 60 + sm;
    const et = eh * 60 + em;
    isLateNight = st > et
      ? currentMins >= st || currentMins <= et
      : currentMins >= st && currentMins <= et;
    if (isLateNight) lateNightFee = parseFloat(appSettings.late_night_fee || 0);
  }

  // Extra store charge
  const storeIds = [
    ...new Set(
      cartItems
        .map(item => String(item.store_id || item.storeId))
        .filter(id => id && id !== 'undefined' && id !== 'null'),
    ),
  ];
  const extraStoreChargeSetting = parseFloat(appSettings?.extra_store_charge || 20);
  const extraStoreCharge =
    storeIds.length > 1 ? (storeIds.length - 1) * extraStoreChargeSetting : 0;

  const effectiveTip        = isSelfPickup ? 0 : deliveryTip;
  const effectiveLateNight  = isSelfPickup ? 0 : lateNightFee;
  const effectiveExtraStore = isSelfPickup ? 0 : extraStoreCharge;
  const effectiveDelivery   = isSelfPickup ? 0 : deliveryFee;
  const effectiveSurge      = isSelfPickup ? 0 : surgeFee;

  const feesTotal =
    platformFee + handlingFee + packagingFee +
    effectiveDelivery + effectiveSurge + effectiveLateNight +
    effectiveTip + effectiveExtraStore;

  const gstAmount       = calcGST(subtotal, feesTotal, cfg);
  const preTaxTotal     = subtotal + feesTotal;
  const couponDiscount  = applyCouponDiscount(coupon, subtotal, preTaxTotal);
  const platformDiscount = calcPlatformDiscount(cfg, preTaxTotal - couponDiscount);
  const grandTotal      = Math.max(0, preTaxTotal - couponDiscount - platformDiscount);

  return {
    subtotal,
    totalSavings,
    platformFee,
    handlingFee,
    packagingFee,
    deliveryFee: effectiveDelivery,
    surgeFee: effectiveSurge,
    lateNightFee: effectiveLateNight,
    extraStoreCharge: effectiveExtraStore,
    deliveryTip: effectiveTip,
    gstAmount,
    couponDiscount,
    platformDiscount,
    grandTotal,
    isLateNight,
  };
}
