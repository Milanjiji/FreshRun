import { create } from 'zustand';

interface SettingsState {
  appSettings: any | null;
  pricingConfig: any | null;
  setAppSettings: (settings: any) => void;
  setPricingConfig: (config: any) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  appSettings: null,
  pricingConfig: null,
  setAppSettings: (settings) => set({ appSettings: settings }),
  setPricingConfig: (config) => set({ pricingConfig: config }),
}));
