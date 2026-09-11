import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import { supabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const who = await requireAdmin(req);
    const db = supabaseAdmin();

    const [
      profiles,
      addresses,
      orders,
      items,
      payments,
      coupons,
      influencers,
      devices,
      logs,
      history,
      authUsersResult,
    ] = await Promise.all([
      db
        .from('profiles')
        .select('id,full_name,phone,created_at,updated_at')
        .order('created_at', { ascending: false }),

      db
        .from('addresses')
        .select(
          'id,user_id,label,full_name,mobile,address_line1,address_line2,landmark,pincode,city,state,is_default,created_at'
        )
        .order('created_at', { ascending: false }),

      db
        .from('orders')
        .select(
          'id,order_number,user_id,status,payment_status,subtotal,shipping_amount,total_amount,currency,delivery_name,delivery_mobile,delivery_email,delivery_address_line1,delivery_address_line2,delivery_landmark,delivery_pincode,delivery_city,delivery_state,paid_at,created_at,updated_at,discount_amount,coupon_code,referral_code,referral_commission_rate,referral_commission_amount,referral_commission_status,referral_commission_paid_at'
        )
        .order('created_at', { ascending: false }),

      db
        .from('order_items')
        .select(
          'id,order_id,product_id,product_name,product_handle,product_image,sku,unit_price,quantity,line_total,created_at'
        )
        .order('created_at', { ascending: true }),

      db
        .from('order_payments')
        .select(
          'id,order_id,provider,provider_order_id,provider_payment_id,amount,currency,status,paid_at,created_at,updated_at'
        )
        .order('created_at', { ascending: false }),

      db
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false }),

      db
        .from('influencers')
        .select('*')
        .order('created_at', { ascending: false }),

      db
        .from('admin_push_devices')
        .select('*')
        .order('created_at', { ascending: false }),

      db
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),

      db
        .from('order_status_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),

      // Server-side only. Never expose password/session data.
      db.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      }),
    ]);

    const normalResults = [
      profiles,
      addresses,
      orders,
      items,
      payments,
      coupons,
      influencers,
      devices,
      logs,
      history,
    ];

    for (const result of normalResults) {
      if (result.error) {
        throw new Error(result.error.message);
      }
    }

    if (authUsersResult.error) {
      throw new Error(authUsersResult.error.message);
    }

    const authMap = new Map(
      authUsersResult.data.users.map((user) => [
        user.id,
        {
          email: user.email || '',
          auth_phone: user.phone || '',
          last_sign_in_at: user.last_sign_in_at || null,
          email_confirmed_at: user.email_confirmed_at || null,
          auth_created_at: user.created_at || null,
        },
      ])
    );

    const customerProfiles = (profiles.data || []).map((profile) => {
      const auth = authMap.get(profile.id);

      return {
        ...profile,

        email: auth?.email || '',

        auth_phone: auth?.auth_phone || '',

        last_sign_in_at:
          auth?.last_sign_in_at || null,

        email_confirmed_at:
          auth?.email_confirmed_at || null,

        auth_created_at:
          auth?.auth_created_at || profile.created_at,
      };
    });

    return NextResponse.json({
      fetchedAt: new Date().toISOString(),

      admin: {
        id: who.admin.id,
        name:
          who.admin.full_name ||
          who.user.email ||
          'Admin',
        email: who.user.email || '',
        role: who.admin.role,
      },

      data: {
        profiles: customerProfiles,
        addresses: addresses.data || [],
        orders: orders.data || [],
        orderItems: items.data || [],
        payments: payments.data || [],
        coupons: coupons.data || [],
        influencers: influencers.data || [],
        pushDevices: devices.data || [],
        notificationLogs: logs.data || [],
        statusHistory: history.data || [],
      },
    });
  } catch (e) {
    const error = e as Error & {
      status?: number;
    };

    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: error.status || 500,
      }
    );
  }
}
