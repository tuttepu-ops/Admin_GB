import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  requireAdmin,
} from '../../../../../lib/admin-auth';

import {
  supabaseAdmin,
} from '../../../../../lib/supabase-server';

import {
  firebaseMessagingAdmin,
} from '../../../../../lib/firebase-admin';

export const dynamic =
  'force-dynamic';

export async function POST(
  req: NextRequest
) {
  try {
    const who =
      await requireAdmin(req);

    const db =
      supabaseAdmin();

    const {
      data: devices,
      error,
    } =
      await db
        .from(
          'admin_push_devices'
        )
        .select(
          'id,fcm_token'
        )
        .eq(
          'admin_user_id',
          who.user.id
        )
        .eq(
          'active',
          true
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    if (!devices?.length) {
      return NextResponse.json(
        {
          error:
            'No active push device registered',
        },
        {
          status: 400,
        }
      );
    }

    const messaging =
      firebaseMessagingAdmin();

    const title =
      'Godavari Basket Admin';

    const notificationBody =
      'Push notifications are working correctly.';

    let sent = 0;
    let failed = 0;

    for (const device of devices) {
      try {
        const providerMessageId =
          await messaging.send({
            token:
              device.fcm_token,

            notification: {
              title,
              body:
                notificationBody,
            },

            data: {
              url: '/admin',

              notification_type:
                'test',
            },

            webpush: {
              fcmOptions: {
                link: '/admin',
              },
            },
          });

        sent += 1;

        await db
          .from(
            'notification_logs'
          )
          .insert({
            notification_type:
              'test',

            title,

            body:
              notificationBody,

            recipient_admin_id:
              who.user.id,

            provider: 'fcm',

            provider_message_id:
              providerMessageId,

            status: 'sent',

            sent_at:
              new Date().toISOString(),

            metadata: {
              device_id:
                device.id,
            },
          });
      } catch (error) {
        failed += 1;

        const message =
          error instanceof Error
            ? error.message
            : 'Unable to send FCM message';

        await db
          .from(
            'notification_logs'
          )
          .insert({
            notification_type:
              'test',

            title,

            body:
              notificationBody,

            recipient_admin_id:
              who.user.id,

            provider: 'fcm',

            status: 'failed',

            error_message:
              message,

            metadata: {
              device_id:
                device.id,
            },
          });
      }
    }

    return NextResponse.json({
      ok: sent > 0,
      sent,
      failed,
    });
  } catch (error) {
    const status =
      (
        error as Error & {
          status?: number;
        }
      ).status || 500;

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to send test notification',
      },
      {
        status,
      }
    );
  }
}
