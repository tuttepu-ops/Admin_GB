import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '../../../../lib/admin-auth';
import {supabaseAdmin} from '../../../../lib/supabase-server';
function payload(raw:any,region:string): Record<string,any>{
 const code=String(raw.code || '').trim().toUpperCase();
 const percent=Number(raw.discount_percent ?? 5),minimum=Number(raw.minimum_order ?? 0);
 const maximum=raw.maximum_discount==null || raw.maximum_discount===''?null:Number(raw.maximum_discount);
 if(!/^[A-Z0-9_-]{3,32}$/.test(code) || !Number.isFinite(percent) || percent<=0 || percent>100 || !Number.isFinite(minimum) || minimum<0 || (maximum!==null && (!Number.isFinite(maximum) || maximum<0)))throw new Error('Invalid coupon code, percentage or amount');
 const common={code,active:raw.active!==false,starts_at:raw.starts_at || null};
 return region==='abroad'?{...common,percent_off:percent,min_subtotal_usd:minimum,max_discount_usd:maximum,expires_at:raw.ends_at || null}:{...common,discount_percent:percent,minimum_order:minimum,maximum_discount:maximum,ends_at:raw.ends_at || null};
}
async function save(req:NextRequest,update:boolean){try{
 await requireAdmin(req);const raw=await req.json(),region=raw.region || 'india';
 if(!['india','abroad'].includes(region))return NextResponse.json({error:'Select a region before saving'},{status:400});
 const table=region==='abroad'?'abroad_coupons':'coupons',db=supabaseAdmin(),body=payload(raw,region);
 if(update && !raw.id)return NextResponse.json({error:'Coupon identifier required'},{status:400});
 if(update && region==='abroad' && raw.id!==body.code)return NextResponse.json({error:'Abroad coupon codes cannot be renamed'},{status:400});
 const query=update?db.from(table).update(body).eq(region==='abroad'?'code':'id',raw.id):db.from(table).insert(body);
 const {data,error}=await query.select('*').single();if(error)throw new Error(error.message);return NextResponse.json(data);
 }catch(e){return NextResponse.json({error:(e as Error).message},{status:(e as Error&{status?:number}).status || 500});}}
export async function POST(req:NextRequest){return save(req,false);}
export async function PATCH(req:NextRequest){return save(req,true);}
export async function DELETE(req:NextRequest){try{await requireAdmin(req);const url=new URL(req.url),id=url.searchParams.get('id'),region=url.searchParams.get('region') || 'india';if(!id || !['india','abroad'].includes(region))return NextResponse.json({error:'Valid identifier and region required'},{status:400});const {error}=await supabaseAdmin().from(region==='abroad'?'abroad_coupons':'coupons').delete().eq(region==='abroad'?'code':'id',id);if(error)throw new Error(error.message);return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:(e as Error).message},{status:(e as Error&{status?:number}).status || 500});}}
