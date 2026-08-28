import {Session} from '@supabase/supabase-js';
import {createContext,PropsWithChildren,useContext,useEffect,useMemo,useState} from 'react';
import {supabase} from '@/lib/supabase';
const AuthContext=createContext<{session:Session|null;loading:boolean}>({session:null,loading:true});
export function AuthProvider({children}:PropsWithChildren){const[session,setSession]=useState<Session|null>(null);const[loading,setLoading]=useState(true);useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const{data}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));return()=>data.subscription.unsubscribe()},[]);const value=useMemo(()=>({session,loading}),[session,loading]);return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>}
export const useAuth=()=>useContext(AuthContext);
