import { create } from 'zustand';

interface SettingsState {
  appSettings: any | null;
  setAppSettings: (settings: any) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  appSettings: null,
  setAppSettings: (settings) => set({ appSettings: settings }),
}));
