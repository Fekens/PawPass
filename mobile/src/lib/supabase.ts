import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://iywgfpzapxkusaykwzpn.supabase.co';
const defaultPublishableKey = 'sb_publishable_VnpByyNPVw3xmdX-NUipwg_5UlL-2Hm';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || defaultUrl;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || defaultPublishableKey;

export const supabase = createClient(url, key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
