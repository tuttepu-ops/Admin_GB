-- GODAVARI BASKET ADMIN V2 — supplemental admin indexes only.
-- Run the main Godavari Basket Supabase alignment schema first.
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_payment_status_idx on public.orders(payment_status);
create index if not exists profiles_phone_idx on public.profiles(phone);
create index if not exists order_payments_status_idx on public.order_payments(status);
create index if not exists orders_referral_code_idx on public.orders(referral_code) where referral_code is not null;
create index if not exists orders_coupon_code_idx on public.orders(coupon_code) where coupon_code is not null;

-- Example first admin (replace UUID with an Auth user UUID):
-- insert into public.admin_users (id,full_name,role,active)
-- values ('YOUR-AUTH-UUID','Godavari Basket Admin','super_admin',true)
-- on conflict (id) do update set full_name=excluded.full_name,role=excluded.role,active=true;
