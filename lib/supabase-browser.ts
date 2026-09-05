'use client';
import {createClient} from '@supabase/supabase-js';
let client: ReturnType<typeof createClient> | null = null;
export function supabaseBrowser(){
  if(client) return client;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key) throw new Error('Supabase browser environment variables are missing');
  client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return client;
}
