import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { storage } from '../utils/storage';
import auth from '@react-native-firebase/auth';

// MMKV adapter for Zustand persistence
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

interface LocationData {
  latitude: number;
  longitude: number;
  isFromAddress?: boolean;
  addressId?: string | number;
}

interface AuthState {
  userToken: string | null;
  userData: any | null;
  hasLocation: boolean;
  locationData: LocationData | null;
  isSelectingLocation: boolean;
  isAddingNewAddress: boolean;
  
  setToken: (token: string | null) => void;
  setUserData: (data: any | null) => void;
  setHasLocation: (val: boolean) => void;
  setLocationData: (data: LocationData | null) => void;
  setIsSelectingLocation: (val: boolean) => void;
  setIsAddingNewAddress: (val: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userToken: null,
      userData: null,
      hasLocation: false,
      locationData: null,
      isSelectingLocation: false,
      isAddingNewAddress: false,

      setToken: (token) => set({ userToken: token }),
      setUserData: (data) => set({ userData: data }),
      setHasLocation: (val) => set({ hasLocation: val }),
      setLocationData: (data) => set({ locationData: data }),
      setIsSelectingLocation: (val) => set({ isSelectingLocation: val }),
      setIsAddingNewAddress: (val) => set({ isAddingNewAddress: val }),
      
      logout: () => {
        auth().signOut().catch(err => console.warn('Firebase logout error:', err));
        set({
          userToken: null,
          userData: null,
          hasLocation: false,
          locationData: null,
          isSelectingLocation: false,
          isAddingNewAddress: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        userToken: state.userToken,
        userData: state.userData,
        hasLocation: state.hasLocation,
        locationData: state.locationData,
      }),
    }
  )
);
