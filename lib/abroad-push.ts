import 'server-only';
import {supabaseAdmin} from './supabase-server';
import {firebaseMessagingAdmin} from './firebase-admin';
export const notificationTypes=['abroad_order_paid','abroad_whatsapp_order'] as const;
export async function sendAbroadNotification(orderId:string,type:string) {
 if(!notificationTypes.includes(type as any))throw new Error('Invalid notification type');
 const db=supabaseAdmin();
 const {data:order,error}=await db.from('abroad_orders').select('id,address,items,total_usd,payment_status,checkout_method').eq('id',orderId).single();
 if(error || !order)throw new Error(error?.message || 'Abroad order not found');
 if(type==='abroad_order_paid' && order.payment_status!=='PAID')throw new Error('Payment has not been verified');
 if(type==='abroad_whatsapp_order' && order.checkout_method!=='WHATSAPP')throw new Error('Not a WhatsApp order');
 const {data:claim,error:claimError}=await db.rpc('claim_abroad_notification',{p_order_id:orderId,p_type:type});
 if(claimError)throw new Error(claimError.message);
 if(!claim){const {data:existing,error:readError}=await db.from('abroad_notification_logs').select('status').eq('order_id',orderId).eq('notification_type',type).single();if(readError)throw new Error(readError.message);return {ok:existing?.status==='sent',duplicate:existing?.status==='sent',processing:existing?.status==='processing',sent:0,failed:0};}
 const sentIds:string[]=Array.isArray(claim.sent_device_ids)?claim.sent_device_ids:[];
 const title=type==='abroad_order_paid'?`Abroad order paid · ${orderId}`:`Abroad WhatsApp order · ${orderId}`;
 const count=(Array.isArray(order.items)?order.items:[]).reduce((sum:number,item:any)=>sum+Number(item.quantity || 0),0);
 const body=`${order.address?.name || 'Customer'} · ${count} items · ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(order.total_usd))}${type==='abroad_whatsapp_order'?' · Payment pending':''}`;
 const update=async(fields:Record<string,unknown>)=>{const {error}=await db.from('abroad_notification_logs').update({...fields,updated_at:new Date().toISOString()}).eq('id',claim.id).eq('lock_token',claim.lock_token);if(error)throw new Error(error.message);};
 let sent=0,failed=0;
 try {
 const {data:devices,error:deviceError}=await db.from('admin_push_devices').select('id,fcm_token').eq('active',true);
 if(deviceError)throw new Error(deviceError.message);
 if(!devices?.length)throw new Error('No active admin push devices. Enable notifications on the admin dashboard.');
 const messaging=firebaseMessagingAdmin();let lastError='';
 await update({title,body});
 for(const device of devices){
  if(sentIds.includes(device.id))continue;
  try {
   await messaging.send({token:device.fcm_token,notification:{title,body},data:{url:'https://admin-gb.vercel.app/admin?region=abroad',region:'abroad',order_id:orderId,notification_type:type},webpush:{fcmOptions:{link:'https://admin-gb.vercel.app/admin?region=abroad'},notification:{tag:`${type}-${orderId}`}}});
   sentIds.push(device.id);sent++;
   // Remember successful devices before retrying any failed devices.
   await update({sent_device_ids:sentIds});
  }catch(e){failed++;lastError=e instanceof Error?e.message:'FCM delivery failed';}
 }
 await update({title,body,status:failed?'failed':'sent',sent_device_ids:sentIds,error_message:failed?lastError:null,sent_at:failed?null:new Date().toISOString(),locked_until:null,lock_token:null,metadata:{region:'abroad',currency:'USD',devices_sent:sentIds.length,devices_failed:failed}});
 return {ok:failed===0,sent,failed};
 }catch(e){await update({title,body,status:'failed',sent_device_ids:sentIds,error_message:e instanceof Error?e.message:'Push failed',locked_until:null,lock_token:null});throw e;}
}
