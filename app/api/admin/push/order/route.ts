import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';
import { firebaseMessagingAdmin } from '../../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

type Payload = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
};

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function POST(req: NextRequest) {
  try {
    const configuredSecret = process.env.ADMIN_PUSH_WEBHOOK_SECRET;
    const providedSecret = req.headers.get('x-gb-push-secret');

    if (!configuredSecret) {
      return NextResponse.json(
        { error: 'ADMIN_PUSH_WEBHOOK_SECRET is not configured' },
        { status: 500 }
      );
    }

    if (!providedSecret || providedSecret !== configuredSecret) {
      return NextResponse.json(
        { error: 'Unauthorized push request' },
        { status: 401 }
      );
    }

    const body = (await req.json()) as Partial<Payload>;

    const orderId = String(body.orderId || '').trim();
    const orderNumber = String(body.orderNumber || '').trim();
    const customerName = String(
      body.customerName || 'Customer'
    ).trim();

    const totalAmount = Number(body.totalAmount || 0);
    const itemCount = Number(body.itemCount || 0);

    if (!orderId || !orderNumber) {
      return NextResponse.json(
        { error: 'Order notification data is incomplete' },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();

    const title = `New Order ${orderNumber}`;
    const notificationBody =
      `${customerName} · ${itemCount} items · ${money(totalAmount)}`;

    // Claim first so duplicate webhook calls cannot send twice.
    const { data: notificationClaim, error: claimError } =
      await db
        .from('notification_logs')
        .insert({
          notification_type: 'new_order',
          title,
          body: notificationBody,
          order_id: orderId,
          provider: 'fcm',
          status: 'processing',
          metadata: {
            order_number: orderNumber,
            customer_name: customerName,
            total_amount: totalAmount,
            item_count: itemCount,
          },
        })
        .select('id')
        .single();

    if (claimError) {
      if (claimError.code === '23505') {
        console.log(
          `Duplicate notification blocked: ${orderNumber}`
        );

        return NextResponse.json({
          ok: true,
          duplicate: true,
          sent: 0,
          failed: 0,
        });
      }

      throw new Error(claimError.message);
    }

    if (!notificationClaim?.id) {
      throw new Error('Unable to create notification claim');
    }

    const notificationLogId = notificationClaim.id;

    const { data: devices, error: deviceError } =
      await db
        .from('admin_push_devices')
        .select('id,admin_user_id,fcm_token')
        .eq('active', true);

    if (deviceError) {
      await db
        .from('notification_logs')
        .update({
          status: 'failed',
          error_message: deviceError.message,
        })
        .eq('id', notificationLogId);

      throw new Error(deviceError.message);
    }

    if (!devices?.length) {
      await db
        .from('notification_logs')
        .update({
          status: 'failed',
          error_message:
            'No active admin push devices registered',
        })
        .eq('id', notificationLogId);

      return NextResponse.json({
        ok: false,
        sent: 0,
        failed: 0,
        error: 'No active admin push devices registered',
      });
    }

    const messaging = firebaseMessagingAdmin();

    let sent = 0;
    let failed = 0;

    let firstSuccessfulMessageId: string | null = null;
    let firstSuccessfulAdminId: string | null = null;
    let firstSuccessfulDeviceId: string | null = null;

    let lastError: string | null = null;

    for (const device of devices) {
      try {
        const providerMessageId = await messaging.send({
          token: device.fcm_token,

          // IMPORTANT:
          // data-only payload.
          // Service worker will display exactly one notification.
          data: {
            title,
            body: notificationBody,
            url: '/admin',
            order_id: orderId,
            order_number: orderNumber,
            notification_type: 'new_order',
          },

          webpush: {
            headers: {
              Urgency: 'high',
            },
          },
        });

        sent += 1;

        if (!firstSuccessfulMessageId) {
          firstSuccessfulMessageId = providerMessageId;
          firstSuccessfulAdminId = device.admin_user_id;
          firstSuccessfulDeviceId = device.id;
        }

        console.log(
          `Push sent for ${orderNumber} to device ${device.id}`
        );
      } catch (error) {
        failed += 1;

        const message =
          error instanceof Error
            ? error.message
            : 'Unable to send FCM message';

        lastError = message;

        console.error(
          `Push failed for ${orderNumber} on device ${device.id}:`,
          message
        );
      }
    }

    if (sent > 0) {
      await db
        .from('notification_logs')
        .update({
          recipient_admin_id: firstSuccessfulAdminId,
          provider_message_id: firstSuccessfulMessageId,
          status: 'sent',
          sent_at: new Date().toISOString(),
          error_message: null,

          metadata: {
            device_id: firstSuccessfulDeviceId,
            order_number: orderNumber,
            customer_name: customerName,
            total_amount: totalAmount,
            item_count: itemCount,
            devices_sent: sent,
            devices_failed: failed,
          },
        })
        .eq('id', notificationLogId);
    } else {
      await db
        .from('notification_logs')
        .update({
          status: 'failed',
          error_message:
            lastError || 'Unable to send notification',

          metadata: {
            order_number: orderNumber,
            customer_name: customerName,
            total_amount: totalAmount,
            item_count: itemCount,
            devices_sent: 0,
            devices_failed: failed,
          },
        })
        .eq('id', notificationLogId);
    }

    return NextResponse.json({
      ok: sent > 0,
      duplicate: false,
      sent,
      failed,
    });
  } catch (error) {
    console.error('NEW ORDER PUSH ERROR:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to send new order notification',
      },
      { status: 500 }
    );
  }
}
