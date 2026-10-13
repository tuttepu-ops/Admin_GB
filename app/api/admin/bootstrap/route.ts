import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { supabaseAdmin } from "../../../../lib/supabase-server";

import { normalizeAbroad, tagIndia, readAll } from "../../../../lib/abroad-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      authUsers,
    ] = await Promise.all([
      db
        .from("profiles")
        .select("id,full_name,phone,created_at,updated_at")
        .order("created_at", { ascending: false }),

      db
        .from("addresses")
        .select(
          "id,user_id,label,full_name,mobile,address_line1,address_line2,landmark,pincode,city,state,is_default,created_at"
        )
        .order("created_at", { ascending: false }),

      db
        .from("orders")
        .select(
          `
          id,
          order_number,
          user_id,
          status,
          payment_status,
          subtotal,
          shipping_amount,
          total_amount,
          currency,
          delivery_name,
          delivery_mobile,
          delivery_email,
          delivery_address_line1,
          delivery_address_line2,
          delivery_landmark,
          delivery_pincode,
          delivery_city,
          delivery_state,
          paid_at,
          created_at,
          updated_at,
          discount_amount,
          coupon_code,
          referral_code,
          referral_commission_rate,
          referral_commission_amount,
          referral_commission_status,
          referral_commission_paid_at
          `
        )
        .order("created_at", { ascending: false }),

      db
        .from("order_items")
        .select(
          `
          id,
          order_id,
          product_id,
          product_name,
          product_handle,
          product_image,
          sku,
          unit_price,
          quantity,
          line_total,
          created_at
          `
        )
        .order("created_at", { ascending: true }),

      db
        .from("order_payments")
        .select(
          `
          id,
          order_id,
          provider,
          provider_order_id,
          provider_payment_id,
          amount,
          currency,
          status,
          paid_at,
          created_at,
          updated_at
          `
        )
        .order("created_at", { ascending: false }),

      db
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false }),

      db
        .from("influencers")
        .select("*")
        .order("created_at", { ascending: false }),

      db
        .from("admin_push_devices")
        .select("*")
        .order("created_at", { ascending: false }),

      db
        .from("notification_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),

      db
        .from("order_status_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),

      db.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      }),
    ]);

    const queries = [
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

    for (const query of queries) {
      if (query.error) {
        console.error("Admin bootstrap query error:", query.error);

        throw new Error(query.error.message);
      }
    }

    if (authUsers.error) {
      console.error(
        "Admin bootstrap auth users error:",
        authUsers.error
      );

      throw new Error(authUsers.error.message);
    }

    const authMap = new Map(
      authUsers.data.users.map((user) => [
        user.id,
        {
          email: user.email || "",
          auth_phone: user.phone || "",
          auth_created_at: user.created_at || null,
          last_sign_in_at: user.last_sign_in_at || null,
          email_confirmed_at:
            user.email_confirmed_at || null,
        },
      ])
    );

    const enrichedProfiles = (profiles.data || []).map(
      (profile) => ({
        ...profile,

        ...(authMap.get(profile.id) || {
          email: "",
          auth_phone: "",
          auth_created_at: profile.created_at,
          last_sign_in_at: null,
          email_confirmed_at: null,
        }),
      })
    );

    const domestic=tagIndia({profiles:enrichedProfiles,addresses:addresses.data || [],orders:orders.data || [],orderItems:items.data || [],payments:payments.data || [],coupons:coupons.data || [],influencers:influencers.data || [],pushDevices:devices.data || [],notificationLogs:logs.data || [],statusHistory:history.data || []});
    const warnings:string[]=[];
    let abroad:any={profiles:[],addresses:[],orders:[],orderItems:[],payments:[],coupons:[],influencers:[],pushDevices:[],notificationLogs:[],statusHistory:[]};
    // An incomplete abroad setup must not disable the existing India dashboard.
    try {
      const [customers,abroadOrders]=await Promise.all([readAll(db,'abroad_customers'),readAll(db,'abroad_orders')]);
      let abroadCoupons:any[]=[],abroadHistory:any[]=[];
      for(const table of ['abroad_coupons','abroad_order_status_history']){try {const rows=await readAll(db,table);if(table==='abroad_coupons')abroadCoupons=rows;else abroadHistory=rows;}catch(e){warnings.push((e as Error).message);}}
      abroad=normalizeAbroad(customers,abroadOrders,abroadCoupons,abroadHistory,authMap);
      abroad.pushDevices=domestic.pushDevices;
      try {abroad.notificationLogs=(await readAll(db,'abroad_notification_logs')).map(log=>({...log,region:'abroad'})).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)));}catch(e){warnings.push((e as Error).message);}

    } catch(e){warnings.push((e as Error).message);}

    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),

        debug: {
          orderCount: orders.data?.length || 0,
          latestOrder:
            orders.data?.[0]?.order_number || null,
          latestOrderCreatedAt:
            orders.data?.[0]?.created_at || null,
        },

        admin: {
          id: who.admin.id,
          name:
            who.admin.full_name ||
            who.user.email ||
            "Admin",
          email: who.user.email || "",
          role: who.admin.role,
        },

        data: domestic,
        abroadData: abroad,
        warnings,

      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma: "no-cache",

          Expires: "0",

          "Surrogate-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[ADMIN BOOTSTRAP ERROR]",
      error
    );

    const status =
      (error as Error & { status?: number }).status ||
      500;

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Admin bootstrap failed",
      },
      {
        status,

        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
