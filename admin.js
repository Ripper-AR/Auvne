import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { auth, db, firebaseConfigError } from "./firebase-admin-client.js";

const SETTINGS_FIELDS = [
  "announcement", "navShop", "navStory", "navContact", "eyebrow", "title", "description",
  "heroCta", "heroNote", "heroCaption", "heroRoundel", "heroImage", "collectionEyebrow",
  "collectionTitle", "collectionIntro", "collectionLabel", "featuredBadge", "storyEyebrow",
  "storyTitle", "storyDescription", "storyImage", "storyStamp", "storyCta", "promiseOne",
  "promiseTwo", "promiseThree", "whatsapp", "footerWhatsappLabel", "footerMessage",
  "checkoutNote", "checkoutButton", "currency"
];

const DEFAULT_SETTINGS = {
  announcement: "A little more you. A little more Auvne.",
  navShop: "Shop all",
  navStory: "Our story",
  navContact: "Contact",
  eyebrow: "A new perspective, just for you",
  title: "See things\ndifferently.",
  description: "Meet the frames that make everyday feel a little more like you. Thoughtfully chosen, easy to love, ready to go wherever you do.",
  heroCta: "Discover the collection",
  heroNote: "Thoughtful frames.\nEveryday perspective.",
  heroCaption: "Made for your point of view",
  heroRoundel: "A BETTER\nPOINT OF\nVIEW",
  heroImage: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1400&q=85",
  collectionEyebrow: "A little something for your eyes",
  collectionTitle: "Meet your new\nfavourite frames.",
  collectionIntro: "Easy to wear, hard to forget.\nFind the pair that feels like you.",
  collectionLabel: "THE COLLECTION",
  featuredBadge: "A little favourite",
  storyEyebrow: "A clearer kind of everyday",
  storyTitle: "Good frames.\nGood feeling.",
  storyDescription: "We believe the right pair can shift your whole perspective. Auvne brings together considered shapes, everyday comfort, and the little details that make a frame feel like yours.",
  storyImage: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1100&q=85",
  storyStamp: "AUVNE\nEST. WITH CARE",
  storyCta: "Find your pair",
  promiseOne: "Thoughtful\ndesign",
  promiseTwo: "Made for\neveryday",
  promiseThree: "A little more\nyou",
  whatsapp: "",
  footerWhatsappLabel: "Say hello on WhatsApp",
  footerMessage: "Thoughtful frames for everyday people.",
  checkoutNote: "Your order will open in WhatsApp so we can help you personally.",
  checkoutButton: "Continue to WhatsApp",
  currency: "$"
};

const DEFAULT_PRODUCTS = [
  { id: "sol-01", name: "The Sol", category: "Everyday frames", price: 89, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=850&q=85", description: "An easy, flattering shape made for wherever the day takes you.", featured: true, active: true },
  { id: "noa-02", name: "The Noa", category: "A little statement", price: 105, image: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=850&q=85", description: "A little extra character, with all-day comfort built in.", featured: true, active: true },
  { id: "remi-03", name: "The Remi", category: "Modern classics", price: 95, image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=850&q=85", description: "A clean, timeless frame that feels like it has always been yours.", featured: true, active: true },
  { id: "cleo-04", name: "The Cleo", category: "Made to be noticed", price: 115, image: "https://images.unsplash.com/photo-1508243529287-e21914733111?auto=format&fit=crop&w=850&q=85", description: "An expressive silhouette for a point of view all your own.", featured: true, active: true }
];

let settings = { ...DEFAULT_SETTINGS };
let products = [];
let toastTimeout;
let subscriptions = [];
let adminUser = null;

const productDialog = document.getElementById("product-dialog");
const productForm = document.getElementById("product-form");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const adminMain = document.getElementById("admin-main");
const signInButton = loginForm.querySelector('button[type="submit"]');

function formatPrice(price) {
  return `${settings.currency || "$"}${Number(price).toFixed(2)}`;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function showLoginError(message) {
  loginError.textContent = message;
  loginError.hidden = false;
}

function stopSubscriptions() {
  for (const unsubscribe of subscriptions) unsubscribe();
  subscriptions = [];
}

function resetAdminPage() {
  stopSubscriptions();
  adminUser = null;
  settings = { ...DEFAULT_SETTINGS };
  products = [];
  adminMain.hidden = true;
  document.getElementById("admin-nav").hidden = true;
  document.getElementById("login-gate").hidden = false;
  loginForm.reset();
}

async function enterAdmin(user) {
  const adminSnapshot = await getDoc(doc(db, "store_admins", user.uid));
  if (!adminSnapshot.exists() || adminSnapshot.data().enabled !== true) {
    await signOut(auth);
    showLoginError("This account does not have store-admin access. Ask the owner to grant it in Firebase.");
    return;
  }
  adminUser = user;
  document.getElementById("login-gate").hidden = true;
  adminMain.hidden = false;
  document.getElementById("admin-nav").hidden = false;
  loginError.hidden = true;
  await initializeStoreIfNeeded();
  subscribeToStore();
}

async function initializeStoreIfNeeded() {
  const settingsRef = doc(db, "store_settings", "main");
  if ((await getDoc(settingsRef)).exists()) return;

  const existingProductIds = new Set((await getDocs(collection(db, "products"))).docs.map(product => product.id));
  const batch = writeBatch(db);
  batch.set(settingsRef, { ...DEFAULT_SETTINGS, updatedAt: serverTimestamp() });
  for (const product of DEFAULT_PRODUCTS) {
    if (!existingProductIds.has(product.id)) {
      const { id, ...fields } = product;
      batch.set(doc(db, "products", id), {
        ...fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  }
  await batch.commit();
}

function requireAdmin() {
  if (!adminUser || !auth.currentUser || auth.currentUser.uid !== adminUser.uid) {
    throw new Error("Please sign in with an authorized store-admin account.");
  }
}

function subscribeToStore() {
  stopSubscriptions();
  subscriptions.push(onSnapshot(
    collection(db, "products"),
    snapshot => {
      products = snapshot.docs
        .map(product => ({ id: product.id, ...product.data() }))
        .sort((first, second) => (first.createdAt?.seconds || 0) - (second.createdAt?.seconds || 0));
      renderProducts();
    },
    handleAdminDataError
  ));
  subscriptions.push(onSnapshot(
    query(collection(db, "orders"), orderBy("createdAt", "desc")),
    snapshot => renderOrders(snapshot.docs.map(order => ({ id: order.id, ...order.data() }))),
    handleAdminDataError
  ));
  subscriptions.push(onSnapshot(
    doc(db, "store_settings", "main"),
    snapshot => {
      settings = snapshot.exists() ? { ...DEFAULT_SETTINGS, ...snapshot.data() } : { ...DEFAULT_SETTINGS };
      fillSettingsForm();
    },
    handleAdminDataError
  ));
}

function handleAdminDataError(error) {
  console.error("Could not sync the Auvne admin studio.", error);
  showToast(error.message || "Could not sync the store. Check Firebase setup and access.");
}

function renderProducts() {
  const list = document.getElementById("admin-product-list");
  list.replaceChildren();
  if (products.length === 0) {
    list.append(makeElement("p", "orders-empty", "No products yet. Add your first one whenever you're ready."));
    return;
  }
  for (const product of products) {
    const row = makeElement("article", "admin-product");
    const image = document.createElement("img");
    image.src = product.image;
    image.alt = "";
    const details = makeElement("div", "");
    details.append(makeElement("h3", "", product.name));
    details.append(makeElement("p", "", `${product.category} · ${formatPrice(product.price)}${product.featured ? " · Featured" : ""}${product.active ? "" : " · Hidden"}`));
    const actions = makeElement("div", "admin-product-actions");
    const edit = makeElement("button", "", "Edit");
    edit.type = "button";
    edit.addEventListener("click", () => openProductEditor(product));
    const remove = makeElement("button", "", "Remove");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`Remove "${product.name}" from your storefront?`)) return;
      try {
        requireAdmin();
        await deleteDoc(doc(db, "products", product.id));
        showToast("Product removed from your storefront.");
      } catch (error) {
        console.error("Could not remove Auvne product.", error);
        showToast(error.message || "Could not remove that product.");
      }
    });
    actions.append(edit, remove);
    row.append(image, details, actions);
    list.append(row);
  }
}

function renderOrders(orders) {
  const list = document.getElementById("orders-list");
  document.getElementById("order-count").textContent = orders.length;
  list.replaceChildren();
  if (orders.length === 0) {
    list.append(makeElement("p", "orders-empty", "No orders just yet. Orders submitted by customers are saved here and also sent to your WhatsApp."));
    return;
  }
  for (const order of orders) {
    const card = makeElement("article", "order-card");
    const details = makeElement("div", "");
    details.append(makeElement("h3", "order-title", order.customerName || "Customer"));
    const date = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : "Date unavailable";
    details.append(makeElement("p", "order-meta", `${order.reference} · ${date} · ${order.customerPhone || "No phone number"}`));
    const items = Array.isArray(order.items) ? order.items : [];
    details.append(makeElement("p", "order-products", items.map(item =>
      `${item.name} × ${item.quantity} (${formatPrice(item.priceCents / 100 * item.quantity)})`
    ).join(" · ")));
    const total = makeElement("div", "order-total", formatPrice(order.totalCents / 100));
    const actions = makeElement("div", "order-card-actions");
    const digits = String(order.customerPhone || "").replace(/\D/g, "");
    if (digits) {
      const messageLink = document.createElement("a");
      messageLink.href = `https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${order.customerName || "there"}, thanks for your Auvne order ${order.reference}!`)}`;
      messageLink.target = "_blank";
      messageLink.rel = "noopener noreferrer";
      messageLink.textContent = "Message customer on WhatsApp ↗";
      actions.append(messageLink);
    }
    const status = document.createElement("select");
    status.className = "order-status";
    status.setAttribute("aria-label", `Order ${order.reference} status`);
    for (const [value, label] of [["new", "New"], ["contacted", "Contacted"], ["completed", "Completed"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      status.append(option);
    }
    status.value = order.status || "new";
    status.addEventListener("change", async () => {
      try {
        requireAdmin();
        await updateDoc(doc(db, "orders", order.id), { status: status.value });
        showToast("Order status updated.");
      } catch (error) {
        console.error("Could not update Auvne order status.", error);
        showToast(error.message || "Could not update that order.");
        status.value = order.status || "new";
      }
    });
    actions.append(status);
    const remove = makeElement("button", "", "Remove order");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`Remove order ${order.reference}?`)) return;
      try {
        requireAdmin();
        await deleteDoc(doc(db, "orders", order.id));
        showToast("Order removed.");
      } catch (error) {
        console.error("Could not remove Auvne order.", error);
        showToast(error.message || "Could not remove that order.");
      }
    });
    actions.append(remove);
    card.append(details, total, actions);
    list.append(card);
  }
}

function fillSettingsForm() {
  for (const fieldName of SETTINGS_FIELDS) {
    const field = document.getElementById(`setting-${fieldName.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`);
    if (field) field.value = settings[fieldName] ?? "";
  }
}

function openProductEditor(product) {
  productForm.reset();
  document.getElementById("dialog-title").textContent = product ? "Edit product" : "Add a product";
  productForm.elements.id.value = product ? product.id : "";
  productForm.elements.name.value = product ? product.name : "";
  productForm.elements.category.value = product ? product.category : "";
  productForm.elements.price.value = product ? product.price : "";
  productForm.elements.image.value = product ? product.image : "";
  productForm.elements.description.value = product ? product.description : "";
  productForm.elements.featured.checked = product ? Boolean(product.featured) : false;
  productDialog.showModal();
}

document.getElementById("add-product").addEventListener("click", () => openProductEditor(null));
document.getElementById("close-dialog").addEventListener("click", () => productDialog.close());
productDialog.addEventListener("click", event => {
  if (event.target === productDialog) productDialog.close();
});

productForm.addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(productForm);
  const id = String(form.get("id") || "");
  const product = {
    name: String(form.get("name")).trim(),
    category: String(form.get("category")).trim(),
    price: Number(form.get("price")),
    image: String(form.get("image")).trim(),
    description: String(form.get("description")).trim(),
    featured: form.get("featured") === "on",
    active: true,
    updatedAt: serverTimestamp()
  };
  if (!Number.isFinite(product.price) || product.price < 0 || product.price > 1000000) {
    showToast("Product prices must be between 0 and 1,000,000.");
    return;
  }
  if (!product.name || !product.category || !product.image || !product.description) {
    showToast("Please check the product details and try again.");
    return;
  }
  try {
    requireAdmin();
    const productRef = doc(db, "products", id || crypto.randomUUID());
    if (!id) product.createdAt = serverTimestamp();
    await setDoc(productRef, product, { merge: true });
    productDialog.close();
    showToast(id ? "Product updated on your storefront." : "Your new product is on the storefront.");
  } catch (error) {
    console.error("Could not save Auvne product.", error);
    showToast(error.message || "Could not save that product.");
  }
});

document.getElementById("settings-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const nextSettings = {};
  for (const fieldName of SETTINGS_FIELDS) {
    const value = String(form.get(fieldName) || "").trim();
    nextSettings[fieldName] = fieldName === "whatsapp" ? value.replace(/\D/g, "") : value;
  }
  if (SETTINGS_FIELDS.some(fieldName => fieldName !== "whatsapp" && !nextSettings[fieldName])) {
    showToast("Please fill out each required storefront field.");
    return;
  }
  try {
    requireAdmin();
    await setDoc(doc(db, "store_settings", "main"), {
      ...nextSettings,
      updatedAt: serverTimestamp()
    }, { merge: true });
    settings = nextSettings;
    showToast("Your storefront has been updated.");
  } catch (error) {
    console.error("Could not save Auvne storefront settings.", error);
    showToast(error.message || "Could not save your storefront settings.");
  }
});

document.getElementById("clear-orders").addEventListener("click", async () => {
  if (!window.confirm("Remove all saved orders? This cannot be undone.")) return;
  try {
    requireAdmin();
    const snapshot = await getDocs(collection(db, "orders"));
    for (let index = 0; index < snapshot.docs.length; index += 450) {
      const batch = writeBatch(db);
      for (const order of snapshot.docs.slice(index, index + 450)) batch.delete(order.ref);
      await batch.commit();
    }
    showToast("Saved orders cleared.");
  } catch (error) {
    console.error("Could not clear Auvne orders.", error);
    showToast(error.message || "Could not clear the orders.");
  }
});

document.getElementById("sign-out").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Could not sign out of Auvne admin.", error);
    showToast(error.message || "Could not sign out.");
  }
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!auth) {
    showLoginError(firebaseConfigError);
    return;
  }
  const form = new FormData(loginForm);
  signInButton.disabled = true;
  loginError.hidden = true;
  try {
    await signInWithEmailAndPassword(auth, String(form.get("email")).trim(), String(form.get("password")));
  } catch (error) {
    console.error("Auvne admin sign-in failed.", error);
    showLoginError(error.message || "Sign-in failed. Please try again.");
  } finally {
    signInButton.disabled = false;
  }
});

if (!auth) {
  showLoginError(firebaseConfigError);
  loginForm.querySelectorAll("input, button").forEach(field => { field.disabled = true; });
} else {
  onAuthStateChanged(auth, async user => {
    if (!user) {
      resetAdminPage();
      return;
    }
    try {
      await enterAdmin(user);
    } catch (error) {
      console.error("Could not load the Auvne admin studio.", error);
      resetAdminPage();
      showLoginError(error.message || "Could not load the admin studio.");
    }
  });
}
