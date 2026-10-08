# Auvne

A responsive eyewear shop built with HTML, CSS, JavaScript, Vite, and Supabase. Customers can browse products and place orders; the owner signs in to edit the storefront and manage products and orders. Order totals are calculated from current product prices in Postgres before the order is saved and opened in WhatsApp.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase project's API settings. These browser variables are public; never put a Supabase secret/service-role key in a frontend environment variable.
3. In the Supabase SQL Editor, run [`supabase/migrations/202610080001_auvne_store.sql`](./supabase/migrations/202610080001_auvne_store.sql).
4. Create the shop owner's account in Supabase Dashboard → Authentication → Users. Then grant that account admin access in the SQL Editor, replacing the address:

   ```sql
   insert into public.store_admins (user_id)
   select id from auth.users where email = 'owner@example.com'
   on conflict (user_id) do nothing;
   ```

5. Run `npm install`, then `npm run dev`. Open the local URL Vite prints. The customer shop is `/`; the admin studio is `/admin.html`.

The Supabase migration enables row-level security. Customers can read active products and storefront content and can submit orders only through the database order function. Only the account explicitly listed in `store_admins` can change products/content or view/manage orders. Do not grant admin access to customer accounts.

## Deploy

Deploy the repository as a Vite static site (build command `npm run build`, output directory `dist`). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables in the hosting provider, and run the migration once against the Supabase project. Never configure `SUPABASE_SECRET_KEY` or a service-role key in the frontend or build environment.

Set the shop's WhatsApp number and currency in the admin studio after signing in. WhatsApp checkout opens a prefilled order message in a new tab; the order is stored in Supabase before the customer is redirected.

## Security

The Supabase secret key must remain private. If a secret key has been shared or exposed, rotate it in the Supabase dashboard. The publishable key is designed to be included in browser code; database access is protected by the migration's row-level security policies.
