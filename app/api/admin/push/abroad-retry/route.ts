import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '../../../../../lib/admin-auth';
import {supabaseAdmin} from '../../../../../lib/supabase-server';
import {sendAbroadNotification} from '../../../../../lib/abroad-push';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){try{
 await requireAdmin(req);
 const {data,error}=await supabaseAdmin().from('abroad_notification_logs').select('order_id,notification_type').neq('status','sent').order('created_at',{ascending:true}).limit(20);
 if(error)throw new Error(error.message);let completed=0,failed=0;
 for(const row of data || []){try {const result=await sendAbroadNotification(row.order_id,row.notification_type);if(result.ok)completed++;else failed++;}catch{failed++;}}
 return NextResponse.json({ok:true,completed,failed});
 }catch(e){return NextResponse.json({error:(e as Error).message},{status:(e as Error&{status?:number}).status || 500});}}
