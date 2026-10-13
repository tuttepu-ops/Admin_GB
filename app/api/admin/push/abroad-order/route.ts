import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {sendAbroadNotification} from '../../../../../lib/abroad-push';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){try{
 const configured=process.env.ADMIN_PUSH_WEBHOOK_SECRET?.trim(),provided=req.headers.get('x-gb-push-secret') || '';
 if(!configured)return NextResponse.json({error:'Push secret not configured'},{status:503});
 const a=Buffer.from(provided),b=Buffer.from(configured);
 if(a.length!==b.length || !timingSafeEqual(a,b))return NextResponse.json({error:'Unauthorized'},{status:401});
 const body=await req.json();
 if(!/^GBA-[A-Z0-9]{20}$/.test(String(body.orderId || '')))return NextResponse.json({error:'Invalid abroad order reference'},{status:400});
 const result=await sendAbroadNotification(body.orderId,body.notificationType);
 return NextResponse.json(result,{status:result.ok?200:503});
 }catch(e){console.error('Abroad notification failed',e);return NextResponse.json({error:e instanceof Error?e.message:'Push failed'},{status:500});}}
