import {NextRequest} from 'next/server';
import {supabaseAdmin} from './supabase-server';
export async function requireAdmin(req:NextRequest){
  const auth=req.headers.get('authorization')||'';
  const token=auth.toLowerCase().startsWith('bearer ')?auth.slice(7):'';
  if(!token){const e=new Error('Unauthorized');(e as Error&{status?:number}).status=401;throw e;}
  const db=supabaseAdmin();
  const {data:{user},error}=await db.auth.getUser(token);
  if(error||!user){const e=new Error('Invalid or expired admin session');(e as Error&{status?:number}).status=401;throw e;}
  const {data:admin,error:adminError}=await db.from('admin_users').select('id,full_name,role,active').eq('id',user.id).maybeSingle();
  if(adminError||!admin||admin.active!==true){const e=new Error('This account is not an active admin');(e as Error&{status?:number}).status=403;throw e;}
  return {user,admin};
}
