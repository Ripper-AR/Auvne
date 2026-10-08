# Auvne

A responsive eyewear shop powered by Firebase Authentication, Cloud Firestore, Supabase Storage, and Firebase Hosting.

## Run locally

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env.local` and add the Firebase web app's configuration values and the Supabase project URL/publishable key. These are public browser configuration; never put a Firebase service-account key or Supabase secret/service-role key in a `VITE_` variable.
3. In Firebase Console for project `auvne-eba39`, create a Cloud Firestore database and enable Email/Password in Authentication.
4. Install the project dependencies with `npm install` and run the storefront with `npm run dev`.
5. In Firebase Authentication, create the owner's account. Copy its UID, then add a Firestore document at `store_admins/{OWNER_UID}` with the boolean field `enabled: true`. Firestore rules deny browser clients the ability to add or change admin records.
6. Set up Supabase image storage as described below.
7. Open `/admin.html` and sign in. The first authorized sign-in creates the default storefront settings and products.

Customers can read public products and storefront content and submit orders. Firestore rules validate each ordered product against its current active status and price, check quantities, and verify the total before accepting an order. Only an explicitly authorized admin can read, edit, or delete orders and change products and storefront content. Order checkout works on Firebase's free plan; each order can include up to 10 different frames, with up to 20 of each frame.

## Firebase services and deployment

The Firebase CLI is installed and authenticated, and this repository is linked to `auvne-eba39`.

Run `firebase deploy --only firestore:rules,hosting` to deploy the security rules and Hosting site. The shop does not use Cloud Functions or Firebase Storage and can run on the Firebase free plan. As with any public order form, protect the project quotas from abuse and monitor Firestore usage.

After setting the shop phone number and currency in the admin studio, WhatsApp checkout saves the order in Firestore and opens the customer's prepared message.

## Image uploads

Images are uploaded directly from the admin studio to the public `auvne-images` Supabase Storage bucket. Customer pages can display the resulting public image URLs. Uploads are limited to JPEG, PNG, and WebP files up to 5 MB; a row-level security policy restricts writes and deletes to the configured Firebase project and shop-owner UID. Only the Supabase project URL and publishable key are used in the browser.

1. In Supabase Dashboard, open **Authentication → Sign In / Providers → Third-Party Auth**, add Firebase, and enter project ID `auvne-eba39`.
2. Open **SQL Editor**. Copy [`supabase/storage-setup.sql`](./supabase/storage-setup.sql), replace both occurrences of `REPLACE_WITH_FIREBASE_ADMIN_UID` with the UID of the authorized owner account from Firebase Authentication, and run the SQL. It creates/configures the public image bucket and owner-only storage policies.
3. Copy `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from Supabase project settings into `.env.local`. Restart the development server and rebuild/redeploy Hosting after changing these values.
4. In the admin studio, choose an image file when adding a product. When editing a product or storefront, selecting a new file replaces the current image; leaving the picker empty keeps the existing image.

## Credentials

`.env.local`, service-account key files, and build output are excluded from Git. Firebase and Supabase publishable keys are public client configuration; an Admin SDK service-account private key, Supabase secret/service-role key, or Web Push private key is not. If a private key or secret has been exposed, rotate or revoke it in Google Cloud/Firebase or Supabase immediately. Firebase Analytics and push notifications are not initialized by this shop.
