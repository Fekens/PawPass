import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import {AppState,Platform} from 'react-native';
import {createClient} from '@supabase/supabase-js';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL; const key=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key) throw new Error('Missing PawPass Supabase environment variables.');
export const supabase=createClient(url,key,{auth:{storage:localStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
if(Platform.OS!=='web'){AppState.addEventListener('change',state=>{if(state==='active')supabase.auth.startAutoRefresh();else supabase.auth.stopAutoRefresh();});}
