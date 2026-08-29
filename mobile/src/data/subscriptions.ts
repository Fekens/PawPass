import {supabase} from '@/lib/supabase';

const ACTIVE_STATUSES=new Set(['active','trialing']);

export async function hasPawPassPlus(){
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)return false;
  const {data,error}=await supabase.from('subscriptions').select('status').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  return ACTIVE_STATUSES.has(String(data?.status||'').toLowerCase());
}
