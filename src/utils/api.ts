import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { storage } from './storage';

// Hard‑coded production backend URL
const PRODUCTION_API_URL = 'https://freshrun-backend.onrender.com';

console.log('[AuthTrace][API] Initializing centralized API client pointing to:', PRODUCTION_API_URL);

const api = axios.create({
  baseURL: PRODUCTION_API_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    const urlStr = config.url || '';
    console.log(`[AuthTrace][API] Intercepting outgoing request: ${config.method?.toUpperCase()} ${urlStr}`);
    
    let token = '';
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        // getIdToken(false) checks if token is expired. If yes, refreshes it.
        // If no, returns the cached token instantly.
        console.log('[AuthTrace][API] Fetching token from Firebase SDK...');
        token = await currentUser.getIdToken(false);
        if (token) {
          console.log('[AuthTrace][API] Token retrieved from Firebase SDK successfully. Updating MMKV store.');
          storage.setItem('userToken', token);
        }
      } else {
        console.log('[AuthTrace][API] No active Firebase user found in SDK.');
      }
    } catch (error: any) {
      console.warn('[AuthTrace][API] Firebase SDK getIdToken failed:', error.message || error);
    }

    // Fallback to MMKV if SDK failed or returned empty token (e.g. offline)
    if (!token) {
      token = storage.getString('userToken') || '';
      if (token) {
        console.log('[AuthTrace][API] Fallback: Using cached token from MMKV storage.');
      } else {
        console.log('[AuthTrace][API] Warning: No token found in Firebase SDK or MMKV store.');
      }
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log(`[AuthTrace][API] Authorization header injected successfully.`);
    }

    return config;
  },
  (error) => {
    console.error('[AuthTrace][API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

export default api;
