import { create } from 'zustand';

interface OrderState {
  activeOrders: any[];
  selectedTrackingOrderId: string | null;
  
  setActiveOrders: (orders: any[]) => void;
  setSelectedTrackingOrderId: (orderId: string | null) => void;
  upsertActiveOrder: (order: any) => void;
  removeActiveOrder: (orderId: string | number) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  activeOrders: [],
  selectedTrackingOrderId: null,

  setActiveOrders: (orders) => set({ activeOrders: orders }),
  setSelectedTrackingOrderId: (orderId) => set({ selectedTrackingOrderId: orderId }),
  
  upsertActiveOrder: (order) => {
    set((state) => {
      const idx = state.activeOrders.findIndex((o) => String(o.id) === String(order.id));
      if (idx === -1) {
        return { activeOrders: [order, ...state.activeOrders] };
      }
      const updated = [...state.activeOrders];
      updated[idx] = order;
      return { activeOrders: updated };
    });
  },

  removeActiveOrder: (orderId) => {
    set((state) => ({
      activeOrders: state.activeOrders.filter((o) => String(o.id) !== String(orderId)),
    }));
  },
}));
