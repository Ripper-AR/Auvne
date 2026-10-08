create table if not exists public.store_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.store_admins enable row level security;
revoke all on table public.store_admins from anon, authenticated;

create or replace function public.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_store_admin() from public;
grant execute on function public.is_store_admin() to anon, authenticated;

create table if not exists public.products (
  id text primary key,
  name text not null check (char_length(name) between 1 and 80),
  category text not null check (char_length(category) between 1 and 50),
  price numeric(10, 2) not null check (price >= 0),
  image text not null,
  description text not null default '',
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
create policy "Anyone can read active products"
  on public.products for select to anon, authenticated
  using (active or (select public.is_store_admin()));
create policy "Admins can add products"
  on public.products for insert to authenticated
  with check ((select public.is_store_admin()));
create policy "Admins can edit products"
  on public.products for update to authenticated
  using ((select public.is_store_admin()))
  with check ((select public.is_store_admin()));
create policy "Admins can remove products"
  on public.products for delete to authenticated
  using ((select public.is_store_admin()));

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

create table if not exists public.store_settings (
  id boolean primary key default true check (id),
  announcement text not null default '',
  nav_shop text not null default '',
  nav_story text not null default '',
  nav_contact text not null default '',
  eyebrow text not null default '',
  title text not null default '',
  description text not null default '',
  hero_cta text not null default '',
  hero_note text not null default '',
  hero_caption text not null default '',
  hero_roundel text not null default '',
  hero_image text not null default '',
  collection_eyebrow text not null default '',
  collection_title text not null default '',
  collection_intro text not null default '',
  collection_label text not null default '',
  featured_badge text not null default '',
  story_eyebrow text not null default '',
  story_title text not null default '',
  story_description text not null default '',
  story_image text not null default '',
  story_stamp text not null default '',
  story_cta text not null default '',
  promise_one text not null default '',
  promise_two text not null default '',
  promise_three text not null default '',
  whatsapp text not null default '',
  footer_whatsapp_label text not null default '',
  footer_message text not null default '',
  checkout_note text not null default '',
  checkout_button text not null default '',
  currency text not null default '$',
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;
create policy "Anyone can read storefront settings"
  on public.store_settings for select to anon, authenticated
  using (true);
create policy "Admins can create storefront settings"
  on public.store_settings for insert to authenticated
  with check ((select public.is_store_admin()));
create policy "Admins can edit storefront settings"
  on public.store_settings for update to authenticated
  using ((select public.is_store_admin()))
  with check ((select public.is_store_admin()));

grant select on public.store_settings to anon, authenticated;
grant insert, update on public.store_settings to authenticated;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'AUV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  customer_name text not null check (char_length(customer_name) between 1 and 100),
  customer_phone text not null check (char_length(customer_phone) between 3 and 30),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  total numeric(10, 2) not null check (total >= 0),
  status text not null default 'new' check (status in ('new', 'contacted', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
create policy "Admins can read orders"
  on public.orders for select to authenticated
  using ((select public.is_store_admin()));
create policy "Admins can update orders"
  on public.orders for update to authenticated
  using ((select public.is_store_admin()))
  with check ((select public.is_store_admin()));
create policy "Admins can delete orders"
  on public.orders for delete to authenticated
  using ((select public.is_store_admin()));

grant select, update, delete on public.orders to authenticated;

create or replace function public.place_order(
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product_id text;
  v_quantity integer;
  v_product public.products%rowtype;
  v_items jsonb := '[]'::jsonb;
  v_total numeric(10, 2) := 0;
  v_order public.orders%rowtype;
begin
  if char_length(trim(coalesce(p_customer_name, ''))) not between 1 and 100 then
    raise exception 'Please enter a valid name.';
  end if;
  if char_length(trim(coalesce(p_customer_phone, ''))) not between 3 and 30 then
    raise exception 'Please enter a valid phone number.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Your bag is empty or contains too many items.';
  end if;
  if jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Your bag is empty or contains too many items.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as item(value)
  loop
    if jsonb_typeof(v_item) is distinct from 'object'
      or coalesce(v_item ->> 'id', '') = ''
      or coalesce(v_item ->> 'quantity', '') !~ '^[0-9]{1,2}$' then
      raise exception 'A product selection is invalid.';
    end if;
    v_product_id := v_item ->> 'id';
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity not between 1 and 20 then
      raise exception 'Product quantities must be between 1 and 20.';
    end if;

    select * into v_product
    from public.products
    where id = v_product_id and active;
    if not found then
      raise exception 'One of the selected products is no longer available.';
    end if;

    v_total := v_total + v_product.price * v_quantity;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'id', v_product.id,
      'name', v_product.name,
      'price', v_product.price,
      'quantity', v_quantity
    ));
  end loop;

  insert into public.orders (customer_name, customer_phone, items, total)
  values (trim(p_customer_name), trim(p_customer_phone), v_items, v_total)
  returning * into v_order;

  return jsonb_build_object(
    'id', v_order.id,
    'reference', v_order.reference,
    'items', v_order.items,
    'total', v_order.total
  );
end;
$$;

revoke all on function public.place_order(text, text, jsonb) from public;
grant execute on function public.place_order(text, text, jsonb) to anon, authenticated;

insert into public.store_settings (
  id, announcement, nav_shop, nav_story, nav_contact, eyebrow, title, description,
  hero_cta, hero_note, hero_caption, hero_roundel, hero_image,
  collection_eyebrow, collection_title, collection_intro, collection_label, featured_badge,
  story_eyebrow, story_title, story_description, story_image, story_stamp, story_cta,
  promise_one, promise_two, promise_three, whatsapp, footer_whatsapp_label,
  footer_message, checkout_note, checkout_button, currency
)
values (
  true,
  'A little more you. A little more Auvne.',
  'Shop all',
  'Our story',
  'Contact',
  'A new perspective, just for you',
  'See things' || E'\n' || 'differently.',
  'Meet the frames that make everyday feel a little more like you. Thoughtfully chosen, easy to love, ready to go wherever you do.',
  'Discover the collection',
  'Thoughtful frames.' || E'\n' || 'Everyday perspective.',
  'Made for your point of view',
  'A BETTER' || E'\n' || 'POINT OF' || E'\n' || 'VIEW',
  'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1400&q=85',
  'A little something for your eyes',
  'Meet your new' || E'\n' || 'favourite frames.',
  'Easy to wear, hard to forget.' || E'\n' || 'Find the pair that feels like you.',
  'THE COLLECTION',
  'A little favourite',
  'A clearer kind of everyday',
  'Good frames.' || E'\n' || 'Good feeling.',
  'We believe the right pair can shift your whole perspective. Auvne brings together considered shapes, everyday comfort, and the little details that make a frame feel like yours.',
  'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1100&q=85',
  'AUVNE' || E'\n' || 'EST. WITH CARE',
  'Find your pair',
  'Thoughtful' || E'\n' || 'design',
  'Made for' || E'\n' || 'everyday',
  'A little more' || E'\n' || 'you',
  '',
  'Say hello on WhatsApp',
  'Thoughtful frames for everyday people.',
  'Your order will open in WhatsApp so we can help you personally.',
  'Continue to WhatsApp',
  '$'
)
on conflict (id) do nothing;

insert into public.products (id, name, category, price, image, description, featured)
values
  ('sol-01', 'The Sol', 'Everyday frames', 89,
   'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=850&q=85',
   'An easy, flattering shape made for wherever the day takes you.', true),
  ('noa-02', 'The Noa', 'A little statement', 105,
   'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=850&q=85',
   'A little extra character, with all-day comfort built in.', true),
  ('remi-03', 'The Remi', 'Modern classics', 95,
   'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=850&q=85',
   'A clean, timeless frame that feels like it has always been yours.', true),
  ('cleo-04', 'The Cleo', 'Made to be noticed', 115,
   'https://images.unsplash.com/photo-1508243529287-e21914733111?auto=format&fit=crop&w=850&q=85',
   'An expressive silhouette for a point of view all your own.', true)
on conflict (id) do nothing;
