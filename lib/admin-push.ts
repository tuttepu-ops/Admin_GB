type PaidOrderNotification = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
};

export async function notifyAdminOfPaidOrder(
  payload: PaidOrderNotification
) {
  const webhookUrl = String(
    process.env.ADMIN_PUSH_WEBHOOK_URL || ""
  ).trim();

  const secret = String(
    process.env.ADMIN_PUSH_WEBHOOK_SECRET || ""
  ).trim();

  if (!webhookUrl || !secret) {
    console.warn(
      "Admin push notification skipped: webhook environment variables are missing."
    );

    return;
  }

  try {
    const response =
      await fetch(webhookUrl, {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-gb-push-secret":
            secret,
        },

        body:
          JSON.stringify(payload),

        cache: "no-store",
      });

    const text =
      await response.text();

    if (!response.ok) {
      console.error(
        "ADMIN PUSH WEBHOOK ERROR:",
        response.status,
        text
      );
    }
  } catch (error) {
    // Notification failure must NEVER
    // cause payment/order failure.
    console.error(
      "ADMIN PUSH WEBHOOK FAILED:",
      error
    );
  }
}
