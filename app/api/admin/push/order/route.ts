import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-server";
import { firebaseMessagingAdmin } from "../../../../../lib/firebase-admin";

export const dynamic = "force-dynamic";

type Payload = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
};

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function POST(req: NextRequest) {
  try {
    const configuredSecret =
      process.env.ADMIN_PUSH_WEBHOOK_SECRET;

    const providedSecret =
      req.headers.get("x-gb-push-secret");

    if (!configuredSecret) {
      return NextResponse.json(
        {
          error:
            "ADMIN_PUSH_WEBHOOK_SECRET is not configured",
        },
        { status: 500 }
      );
    }

    if (
      !providedSecret ||
      providedSecret !== configuredSecret
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized push request",
        },
        { status: 401 }
      );
    }

    const body =
      (await req.json()) as Partial<Payload>;

    const orderId =
      String(body.orderId || "").trim();

    const orderNumber =
      String(body.orderNumber || "").trim();

    const customerName =
      String(body.customerName || "Customer").trim();

    const totalAmount =
      Number(body.totalAmount || 0);

    const itemCount =
      Number(body.itemCount || 0);

    if (!orderId || !orderNumber) {
      return NextResponse.json(
        {
          error:
            "Order notification data is incomplete",
        },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();

    // Prevent duplicate notification for same order
    const {
      data: existingSent,
      error: existingError,
    } = await db
      .from("notification_logs")
      .select("id")
      .eq("notification_type", "new_order")
      .eq("order_id", orderId)
      .eq("status", "sent")
      .limit(1);

    if (existingError) {
      console.warn(
        "PUSH DUPLICATE CHECK ERROR:",
        existingError.message
      );
    }

    if (existingSent?.length) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        sent: 0,
        failed: 0,
      });
    }

    // Get all active admin devices
    const {
      data: devices,
      error: deviceError,
    } = await db
      .from("admin_push_devices")
      .select("id,admin_user_id,fcm_token")
      .eq("active", true);

    if (deviceError) {
      throw new Error(deviceError.message);
    }

    if (!devices?.length) {
      await db
        .from("notification_logs")
        .insert({
          notification_type: "new_order",

          title:
            `New Order ${orderNumber}`,

          body:
            `${customerName} · ${itemCount} items · ${money(
              totalAmount
            )}`,

          order_id: orderId,

          provider: "fcm",

          status: "failed",

          error_message:
            "No active admin push devices registered",

          metadata: {
            order_number: orderNumber,
            customer_name: customerName,
            total_amount: totalAmount,
            item_count: itemCount,
          },
        });

      return NextResponse.json({
        ok: false,
        sent: 0,
        failed: 0,
        error:
          "No active admin push devices registered",
      });
    }

    const messaging =
      firebaseMessagingAdmin();

    let sent = 0;
    let failed = 0;

    for (const device of devices) {
      try {
        const providerMessageId =
          await messaging.send({
            token: device.fcm_token,

            notification: {
              title:
                `New Order ${orderNumber}`,

              body:
                `${customerName} · ${itemCount} items · ${money(
                  totalAmount
                )}`,
            },

            data: {
              url: "/admin",
              order_id: orderId,
              order_number: orderNumber,
            },

            webpush: {
              fcmOptions: {
                link: "/admin",
              },
            },
          });

        sent += 1;

        await db
          .from("notification_logs")
          .insert({
            notification_type: "new_order",

            title:
              `New Order ${orderNumber}`,

            body:
              `${customerName} · ${itemCount} items · ${money(
                totalAmount
              )}`,

            order_id: orderId,

            recipient_admin_id:
              device.admin_user_id,

            provider: "fcm",

            provider_message_id:
              providerMessageId,

            status: "sent",

            sent_at:
              new Date().toISOString(),

            metadata: {
              device_id: device.id,
              order_number: orderNumber,
              customer_name: customerName,
              total_amount: totalAmount,
              item_count: itemCount,
            },
          });
      } catch (error) {
        failed += 1;

        const message =
          error instanceof Error
            ? error.message
            : "Unable to send FCM message";

        await db
          .from("notification_logs")
          .insert({
            notification_type: "new_order",

            title:
              `New Order ${orderNumber}`,

            body:
              `${customerName} · ${itemCount} items · ${money(
                totalAmount
              )}`,

            order_id: orderId,

            recipient_admin_id:
              device.admin_user_id,

            provider: "fcm",

            status: "failed",

            error_message: message,

            metadata: {
              device_id: device.id,
              order_number: orderNumber,
              customer_name: customerName,
              total_amount: totalAmount,
              item_count: itemCount,
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
    console.error(
      "NEW ORDER PUSH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send new order notification",
      },
      { status: 500 }
    );
  }
}
