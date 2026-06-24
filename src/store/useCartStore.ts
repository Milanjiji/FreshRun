import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { storage } from '../utils/storage';

const mmkvStorage: StateStorage = {
  setItem: (name, value) => {
    storage.setItem(name, value);
  },
  getItem: (name) => {
    return storage.getString(name) ?? null;
  },
  removeItem: (name) => {
    storage.removeItem(name);
  },
};

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  store_id: string;
  storeId?: string;
  image_url?: string;
  description?: string;
  discount_percent?: number;
  unit?: string;
}

interface CartState {
  cartItems: CartItem[];
  
  addItem: (product: any) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  setCartItems: (items: CartItem[]) => void;
  
  // Helpers
  getCartItemCount: () => number;
  getCartTotalPrice: () => number;
  isDifferentStore: (product: any) => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartItems: [],

      addItem: (product) => {
        set((state) => {
          const existing = state.cartItems.find((item) => item.id === product.id);
          let newCart;
          const storeId = product.store_id || product.storeId;
          
          if (existing) {
            newCart = state.cartItems.map((item) =>
              item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            );
          } else {
            newCart = [...state.cartItems, { ...product, store_id: storeId, quantity: 1 }];
          }
          return { cartItems: newCart };
        });
      },

      updateQuantity: (id, delta) => {
        set((state) => {
          const newCart = state.cartItems
            .map((item) => {
              if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
              }
              return item;
            })
            .filter((item) => item.quantity > 0);
          return { cartItems: newCart };
        });
      },

      clearCart: () => set({ cartItems: [] }),
      
      setCartItems: (items) => set({ cartItems: items }),

      getCartItemCount: () => {
        return get().cartItems.reduce((sum, item) => sum + item.quantity, 0);
      },

      getCartTotalPrice: () => {
        return get().cartItems.reduce((sum, item) => {
          const discount = item.discount_percent || 0;
          const discountedPrice = item.price * (1 - discount / 100);
          return sum + discountedPrice * item.quantity;
        }, 0);
      },

      isDifferentStore: (product) => {
        const items = get().cartItems;
        if (items.length === 0) return false;
        const newStoreId = String(product.store_id || product.storeId);
        return items.some((item) => String(item.store_id || item.storeId) !== newStoreId);
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
