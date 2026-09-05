import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '../../../../../../lib/admin-auth';
import {supabaseAdmin} from '../../../../../../lib/supabase-server';
const allowed=['pending','confirmed','processing','shipped','delivered','cancelled'];
export async function PATCH(req:NextRequest,{params}:{params:{id:string}}){
 try{const who=await requireAdmin(req);const body=await req.json();if(!allowed.includes(body.status))return NextResponse.json({error:'Invalid status'},{status:400});const db=supabaseAdmin();const {data:old,error:oldErr}=await db.from('orders').select('id,status,order_number').eq('id',params.id).single();if(oldErr)throw new Error(oldErr.message);const {data,error}=await db.from('orders').update({status:body.status,updated_at:new Date().toISOString()}).eq('id',params.id).select('id,status').single();if(error)throw new Error(error.message);await db.from('order_status_history').insert({order_id:params.id,old_status:old.status,new_status:body.status,changed_by:who.user.id,note:body.note||null});return NextResponse.json(data);}catch(e){const status=(e as Error&{status?:number}).status||500;return NextResponse.json({error:(e as Error).message},{status});}
}
