# Godavari Basket Admin v2

Separate private operations dashboard for the Godavari Basket Supabase project.

## Included
- Supabase email/password admin login using `admin_users`
- Dashboard KPIs
- Orders with search, date range, status/payment filters and sorting
- Customer view
- Payment view
- Coupon control
- Influencer management and hidden referral performance
- 5% commission visibility
- Delivery address copy/print + WhatsApp contact
- Order status history
- CSV export
- Controlled data clearing
- FCM admin push device registration + test notifications
- Responsive desktop/mobile UI

## Run
```bash
npm install
npm run dev
```
Open http://localhost:3001

## Admin access
Create/sign up the admin user in Supabase Auth, then insert the user's UUID into `public.admin_users` as `super_admin`.

## Push notifications
The dashboard works without Firebase values. Fill the Firebase web and service-account env variables when you are ready to enable push. Each admin device must press **Enable on this device** once.

The actual new-order push trigger should be called from the Godavari Basket checkout/payment-success backend after the order is safely stored in Supabase.
