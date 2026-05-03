import { MMKV } from 'react-native-mmkv';

/**
 * Global storage instance for the app.
 * react-native-mmkv is significantly faster than AsyncStorage and uses synchronous JSI.
 */
const storageInstance = new MMKV();

export const storage = {
  /**
   * Store a string, object or number
   */
  setItem: (key: string, value: string | number | boolean | object) => {
    if (typeof value === 'object') {
      storageInstance.set(key, JSON.stringify(value));
    } else {
      storageInstance.set(key, value);
    }
  },

  /**
   * Retrieve a string
   */
  getString: (key: string): string | undefined => {
    return storageInstance.getString(key);
  },

  /**
   * Retrieve an object
   */
  getObject: <T>(key: string): T | null => {
    const value = storageInstance.getString(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      console.error(`Error parsing storage key ${key}:`, e);
      return null;
    }
  },

  /**
   * Retrieve a number
   */
  getNumber: (key: string): number | undefined => {
    return storageInstance.getNumber(key);
  },

  /**
   * Retrieve a boolean
   */
  getBoolean: (key: string): boolean | undefined => {
    return storageInstance.getBoolean(key);
  },

  /**
   * Remove a specific item
   */
  removeItem: (key: string) => {
    storageInstance.delete(key);
  },

  /**
   * Clear all storage
   */
  clearAll: () => {
    storageInstance.clearAll();
  },
};
