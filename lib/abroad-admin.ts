type Row = Record<string, any>;
const num=(v:any)=>Number(v || 0);
export function normalizeAbroad(customers:Row[], orders:Row[], coupons:Row[], history:Row[], auth:Map<string,any>) {
 const region='abroad';
 const profiles=customers.map(c=>({...c,...auth.get(c.user_id),id:`abroad:${c.user_id}`,region,original_user_id:c.user_id,email:c.email || auth.get(c.user_id)?.email || ''}));
 const normalized:Row[]=orders.map(o=>{const a=o.address || {};return { ...o,region,order_number:o.id,user_id:`abroad:${o.user_id}`,original_user_id:o.user_id,status:o.fulfillment_status || 'pending',payment_status:String(o.payment_status).toLowerCase(),currency:'USD',subtotal:num(o.subtotal_usd),discount_amount:num(o.discount_usd),shipping_amount:num(o.transport_usd),total_amount:num(o.total_usd),delivery_name:a.name || '',delivery_mobile:a.phone || '',delivery_email:o.email || a.email || '',delivery_address_line1:a.address1 || '',delivery_address_line2:a.address2 || '',delivery_landmark:a.notes || '',delivery_pincode:a.postal || '',delivery_city:a.city || '',delivery_state:a.state || '',delivery_country:o.country || a.country || '',updated_at:o.updated_at || o.created_at,referral_code:null,referral_commission_rate:0,referral_commission_amount:0,referral_commission_status:'not_applicable'};});
 const addresses=normalized.map(o=>({id:`address:${o.id}`,region,user_id:o.user_id,label:`Order ${o.id}`,full_name:o.delivery_name,mobile:o.delivery_mobile,address_line1:o.delivery_address_line1,address_line2:o.delivery_address_line2,landmark:o.delivery_landmark,pincode:o.delivery_pincode,city:o.delivery_city,state:o.delivery_state,country:o.delivery_country,is_default:false,created_at:o.created_at}));
 const orderItems=orders.flatMap(o=>(Array.isArray(o.items)?o.items:[]).map((i:Row,n:number)=>({id:`${o.id}:${n}`,region,order_id:o.id,product_id:i.id,product_name:i.name,sku:`${num(i.unit_weight_kg)} kg`,unit_weight_kg:num(i.unit_weight_kg),product_handle:null,product_image:null,unit_price:num(i.unit_price_usd),quantity:num(i.quantity),line_total:num(i.unit_price_usd)*num(i.quantity),currency:'USD',created_at:o.created_at})));
 const payments=normalized.map(o=>({id:`payment:${o.id}`,region,order_id:o.id,provider:o.checkout_method || 'PAYPAL',provider_order_id:o.paypal_order_id || null,provider_payment_id:o.paypal_capture_id || null,amount:o.total_amount,currency:'USD',status:o.payment_status,paid_at:o.paid_at,created_at:o.created_at,updated_at:o.updated_at}));
 return {profiles,orders:normalized,addresses,orderItems,payments,coupons:coupons.map(c=>({...c,region,id:c.code,currency:'USD',discount_percent:num(c.percent_off),minimum_order:num(c.min_subtotal_usd),maximum_discount:c.max_discount_usd,ends_at:c.expires_at,created_at:c.created_at || null})),influencers:[],pushDevices:[],notificationLogs:[],statusHistory:history.map(h=>({...h,region}))};
}
export function tagIndia(data:Record<string,Row[]>) {
 return Object.fromEntries(Object.entries(data).map(([key,rows])=>[key,rows.map(row=>({...row,region:'india',...(key==='profiles'?{id:`india:${row.id}`,original_user_id:row.id}:{}),...(['orders','addresses'].includes(key)?{user_id:`india:${row.user_id}`,original_user_id:row.user_id}:{}),...(['orders','payments','coupons','orderItems'].includes(key)?{currency:row.currency || 'INR'}:{})}))]));
}
export async function readAll(db:any, table:string) {
 const rows:Row[]=[];
 for(let start=0;;start+=1000){const {data,error}=await db.from(table).select('*').order(table==='abroad_coupons'?'code':'created_at',{ascending:true}).range(start,start+999);if(error)throw new Error(`${table}: ${error.message}`);rows.push(...(data || []));if(!data || data.length<1000)break;}
 return rows;
}
