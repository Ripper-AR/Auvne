const { randomUUID } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 5 });

const db = getFirestore();

exports.placeOrder = onCall({ maxInstances: 5 }, async request => {
  const payload = request.data || {};
  const customerName = typeof payload.customerName === "string" ? payload.customerName.trim() : "";
  const customerPhone = typeof payload.customerPhone === "string" ? payload.customerPhone.trim() : "";

  if (customerName.length < 1 || customerName.length > 100) {
    throw new HttpsError("invalid-argument", "Please enter a valid name.");
  }
  if (customerPhone.length < 3 || customerPhone.length > 30) {
    throw new HttpsError("invalid-argument", "Please enter a valid phone number.");
  }
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 30) {
    throw new HttpsError("invalid-argument", "Your bag is empty or contains too many items.");
  }

  const quantities = new Map();
  for (const item of payload.items) {
    if (!item || typeof item.id !== "string" || !/^[\w-]{1,128}$/.test(item.id) ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      throw new HttpsError("invalid-argument", "A product selection is invalid.");
    }
    const quantity = (quantities.get(item.id) || 0) + item.quantity;
    if (quantity > 20) throw new HttpsError("invalid-argument", "You can order up to 20 of each frame.");
    quantities.set(item.id, quantity);
  }

  const productRefs = [...quantities.keys()].map(id => db.collection("products").doc(id));
  const productSnapshots = await db.getAll(...productRefs);
  let totalCents = 0;
  const items = productSnapshots.map(snapshot => {
    if (!snapshot.exists || snapshot.data().active !== true) {
      throw new HttpsError("failed-precondition", "One of the selected products is no longer available.");
    }
    const product = snapshot.data();
    const cents = Math.round(Number(product.price) * 100);
    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw new HttpsError("failed-precondition", "A selected product has an invalid price.");
    }
    const quantity = quantities.get(snapshot.id);
    totalCents += cents * quantity;
    return { id: snapshot.id, name: product.name, price: cents / 100, quantity };
  });

  const reference = `AUV-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  const orderRef = db.collection("orders").doc();
  await orderRef.create({
    reference,
    customerName,
    customerPhone,
    items,
    total: totalCents / 100,
    status: "new",
    createdAt: FieldValue.serverTimestamp()
  });

  return { id: orderRef.id, reference, items, total: totalCents / 100 };
});
