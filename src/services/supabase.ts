import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Access environment variables through @env and Constants
// First try to get from @env (direct from .env file)
// Then fallback to Constants.expoConfig.extra (from app.config.js)
// Finally use hardcoded values as a last resort
const supabaseUrl = SUPABASE_URL || 
                   Constants.expoConfig?.extra?.supabaseUrl || 
                   'https://hrebaipozaiujvcynsnb.supabase.co';

const supabaseAnonKey = SUPABASE_ANON_KEY || 
                       Constants.expoConfig?.extra?.supabaseAnonKey || 
                       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZWJhaXBvemFpdWp2Y3luc25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyOTM3MjgsImV4cCI6MjA1Njg2OTcyOH0.ykVlMwdd2mMWtTh_Y3h6wNNDk49AXqtTzDZ0NGy3zZo';

// Add a warning if using development credentials in production
if (__DEV__) {
  console.log('Using Supabase URL:', supabaseUrl);
} else if (!SUPABASE_URL && !Constants.expoConfig?.extra?.supabaseUrl) {
  console.warn('Production build is using development Supabase credentials. This is not recommended.');
}

// Custom storage implementation for React Native using Expo's SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

// Use custom storage implementation only on mobile platforms
const storage = Platform.OS !== 'web' ? ExpoSecureStoreAdapter : undefined;

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 