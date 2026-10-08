# Auvne

A responsive eyewear shop powered by Firebase Authentication, Cloud Firestore, Cloud Functions, and Firebase Hosting.

## Run locally

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env.local` and add the Firebase web app's configuration values. The Firebase web API key and app IDs are public browser configuration; never put a service-account private key in a `VITE_` variable.
3. In Firebase Console for project `auvne-eba39`, create a Cloud Firestore database and enable Email/Password in Authentication.
4. Install the project dependencies with `npm install` and run the storefront with `npm run dev`.
5. In Firebase Authentication, create the owner's account. Copy its UID, then add a Firestore document at `store_admins/{OWNER_UID}` with the boolean field `enabled: true`. Firestore rules deny browser clients the ability to add or change admin records.
6. Open `/admin.html` and sign in. The first authorized sign-in creates the default storefront settings and products.

Customers can read public products and storefront content, but only the server-side Cloud Function can create orders. The function validates products and computes the order total from their current Firestore prices. Only an explicitly authorized admin can read, edit, or delete orders and change products and storefront content.

## Firebase services and deployment

The Firebase CLI is installed and authenticated, and this repository is linked to `auvne-eba39`.

Run `firebase deploy` to build and deploy the Hosting site, Firestore rules, and Cloud Functions. Cloud Functions deployment requires the Firebase project to have the necessary Google Cloud APIs enabled and billing configured. The runtime uses Firebase's managed service identity; no downloaded service-account JSON key is needed.

The Functions region is `us-central1`. After setting the shop phone number and currency in the admin studio, WhatsApp checkout saves the order in Firestore and opens the customer's prepared message.

## Credentials

`.env.local`, service-account key files, and build output are excluded from Git. A Firebase web API key is public client configuration; an Admin SDK service-account private key, Firebase secret, or Web Push private key is not. If a private key or secret has been exposed, rotate or revoke it in Google Cloud/Firebase immediately. Firebase Analytics and push notifications are not initialized by this shop.
