import {supabase} from '@/lib/supabase';

const BUCKET='pet-photos';
const MAX_BYTES=5*1024*1024;
const ALLOWED=new Set(['image/jpeg','image/png','image/webp','image/gif']);

export type PickedPetPhoto={uri:string;fileName?:string|null;mimeType?:string|null;fileSize?:number|null};

export function validatePetPhoto(photo:PickedPetPhoto){
  const type=photo.mimeType||'image/jpeg';
  if(!ALLOWED.has(type))throw new Error('Please choose a JPG, PNG, WEBP, or GIF image.');
  if(photo.fileSize&&photo.fileSize>MAX_BYTES)throw new Error('Pet photos can be up to 5 MB.');
}

export async function uploadPetPhoto(petId:number,photo:PickedPetPhoto){
  validatePetPhoto(photo);
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)throw new Error('Please sign in again before uploading a photo.');
  const fallbackExt=(photo.mimeType||'image/jpeg').split('/')[1]||'jpg';
  const ext=(photo.fileName?.split('.').pop()||fallbackExt).replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg';
  const path=`${user.id}/${petId}-${Date.now()}.${ext}`;
  const response=await fetch(photo.uri);
  if(!response.ok)throw new Error('We could not read that photo from your device.');
  const body=await response.arrayBuffer();
  const {error:uploadError}=await supabase.storage.from(BUCKET).upload(path,body,{cacheControl:'3600',upsert:false,contentType:photo.mimeType||'image/jpeg'});
  if(uploadError)throw uploadError;
  const {data}=supabase.storage.from(BUCKET).getPublicUrl(path);
  if(!data?.publicUrl)throw new Error('The photo uploaded but no URL was returned.');
  return data.publicUrl;
}
