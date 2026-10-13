# India + Abroad admin dashboard

## Setup
1. Keep the existing admin Supabase URL, public key, service-role key, admin_users access and Firebase configuration. Both stores must use the SAME Supabase project.
2. Run supabase/abroad-admin-migration.sql once in Supabase SQL Editor. It adds fulfillment_status and updated_at to abroad_orders and a separate abroad_order_status_history table plus a server-only atomic status-update function. No domestic tables or historical payment values are modified.
3. The abroad storefront migrations must already exist: abroad_customers, abroad_orders with PayPal/coupon fields and abroad_coupons. Missing abroad tables appear as a setup notice without disabling India operations. Use the storefront coupon setup migration if abroad_coupons is absent.
4. npm ci, then npm run dev. Local admin URL is http://localhost:3001. Deploy with the existing admin environment variables; no PayPal credentials are required in this dashboard.

## Views
India, Abroad and All regions are available at the top. Order/customer/payment/coupon lists, filters, export and summary cards follow the selection. Modal selections and order filters reset on switching. All labels distinguish origins, and revenue/discount totals stay separate for INR and USD. The same authenticated person may have one customer entry per store; the UI namespaces references so their region-specific orders do not mix. These namespaces are presentation-only, not changes to database user IDs.
Abroad JSON items and address fields are adapted into the existing screens. Order details include country, shipment weight and checkout method. Printing, copying and sharing preserve order currency. A displayed abroad payment row summarizes the order's current payment state; it is not a separate payment transaction history table.

## Actions
Fulfillment changes target the selected order's source table, including from All view. Abroad history is updated atomically through a service-role-only SQL function after the route verifies an active admin. Payment status is controlled by verified payment capture in the storefront; marking shipped/cancelled does not change payment status or issue a refund.
Coupons write to coupons for India and abroad_coupons for Abroad. Create a coupon in a specific region; All permits region-specific enable/disable but has no create form. The existing 5% coupon shortcut uses India minimum INR 1,000 and Abroad minimum USD 0, displayed explicitly in the UI.
India influencer/referral and push services are retained. Abroad push is now connected through a separate endpoint/log table and the same registered devices; follow ABROAD-NOTIFICATIONS-SETUP.md. International influencer attribution remains unimplemented and is labeled accordingly. Bulk clearing remains India-only and requires ALLOW_DATA_CLEAR; All/Abroad bulk clearing is blocked to preserve payment records.

## Validation
Code checks and production build are run with placeholder public Supabase values, not live customer data. A real Supabase/admin session is required to validate table access, status RPC and coupon updates. After migration: switch each region, open an order, export a list, change fulfillment status, and confirm the other region's rows and payments are unchanged. Set paid only through payment verification; do not fulfill a pending WhatsApp order based solely on checkout submission.
