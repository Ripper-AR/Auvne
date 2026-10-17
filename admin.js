import {
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { auth, db, firebaseConfigError } from "./firebase-admin-client.js";
import { deleteStoreImage, uploadStoreImage } from "./supabase-client.js";

const BASE_SETTINGS_FIELDS = [
  "announcement", "navShop", "navStory", "navContact", "eyebrow", "title", "description",
  "heroCta", "heroNote", "heroCaption", "heroRoundel", "heroImage", "collectionEyebrow",
  "collectionTitle", "collectionIntro", "collectionLabel", "featuredBadge", "storyEyebrow",
  "storyTitle", "storyDescription", "storyImage", "storyStamp", "storyCta", "promiseOne",
  "promiseTwo", "promiseThree", "whatsapp", "footerWhatsappLabel", "footerMessage",
  "checkoutNote", "checkoutButton", "currency"
];
const IMAGE_SETTING_FIELDS = ["heroImage", "storyImage"];
const TEXT_SETTING_FIELDS = BASE_SETTINGS_FIELDS.filter(fieldName => !IMAGE_SETTING_FIELDS.includes(fieldName));
const LOCALIZED_SETTING_FIELDS = TEXT_SETTING_FIELDS.filter(fieldName => !["whatsapp", "currency"].includes(fieldName));
const SETTINGS_FIELDS = [
  ...BASE_SETTINGS_FIELDS,
  ...LOCALIZED_SETTING_FIELDS.map(fieldName => `${fieldName}Ar`)
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
  whatsapp: "201020817084",
  footerWhatsappLabel: "Say hello on WhatsApp",
  footerMessage: "Thoughtful frames for everyday people.",
  checkoutNote: "Your order will open in WhatsApp so we can help you personally.",
  checkoutButton: "Continue to WhatsApp",
  currency: "$"
};

const ARABIC_DEFAULT_SETTINGS = {
  announcement: "تفاصيل صغيرة، وإطلالة تشبهك.",
  navShop: "تسوّق النظارات",
  navStory: "قصتنا",
  navContact: "تواصل معنا",
  eyebrow: "إطلالة جديدة تناسبك",
  title: "انظر إلى العالم\nبطريقتك.",
  description: "اكتشف إطارات مختارة بعناية، مريحة وأنيقة، لترافقك في كل يوم.",
  heroCta: "اكتشف المجموعة",
  heroNote: "إطارات بعناية.\nوأناقة كل يوم.",
  heroCaption: "مصممة لتعكس أسلوبك",
  heroRoundel: "إطلالة\nأجمل\nكل يوم",
  collectionEyebrow: "تفاصيل جميلة لعينيك",
  collectionTitle: "اختر إطارك\nالمفضل الجديد.",
  collectionIntro: "إطلالات سهلة وأنيقة.\nاعثر على ما يشبهك.",
  collectionLabel: "مجموعة النظارات",
  featuredBadge: "اختيارنا المفضل",
  storyEyebrow: "أناقة واضحة لكل يوم",
  storyTitle: "إطارات جميلة.\nوشعور أجمل.",
  storyDescription: "نؤمن أن الإطار المناسب يغيّر إطلالتك بالكامل. تجمع Auvne بين التصاميم المدروسة والراحة اليومية والتفاصيل التي تجعل الإطار اختيارك أنت.",
  storyStamp: "AUVNE\nصُممت بعناية",
  storyCta: "اعثر على إطارك",
  promiseOne: "تصميم\nمدروس",
  promiseTwo: "راحة\nكل يوم",
  promiseThree: "أناقة\nتشبهك",
  footerWhatsappLabel: "راسلنا على واتساب",
  footerMessage: "إطارات أنيقة لكل يوم.",
  checkoutNote: "سيُحفظ طلبك، ثم نفتح واتساب لتأكيده معك. أرسل الرسالة لإتمام الطلب.",
  checkoutButton: "تابع إلى واتساب"
};

for (const [fieldName, value] of Object.entries(ARABIC_DEFAULT_SETTINGS)) {
  DEFAULT_SETTINGS[`${fieldName}Ar`] = value;
}

const DEFAULT_PRODUCTS = [
  { id: "sol-01", name: "The Sol", nameAr: "سول", category: "Everyday frames", categoryAr: "إطارات يومية", price: 89, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=850&q=85", description: "An easy, flattering shape made for wherever the day takes you.", descriptionAr: "تصميم أنيق ومريح يرافقك أينما يأخذك يومك.", featured: true, active: true },
  { id: "noa-02", name: "The Noa", nameAr: "نوا", category: "A little statement", categoryAr: "إطلالة مميزة", price: 105, image: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=850&q=85", description: "A little extra character, with all-day comfort built in.", descriptionAr: "لمسة مختلفة وشخصية مميزة مع راحة تدوم طوال اليوم.", featured: true, active: true },
  { id: "remi-03", name: "The Remi", nameAr: "ريمي", category: "Modern classics", categoryAr: "كلاسيكية عصرية", price: 95, image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=850&q=85", description: "A clean, timeless frame that feels like it has always been yours.", descriptionAr: "إطار أنيق وخالد تشعر وكأنه صُمم لك.", featured: true, active: true },
  { id: "cleo-04", name: "The Cleo", nameAr: "كليو", category: "Made to be noticed", categoryAr: "إطلالة لا تُنسى", price: 115, image: "https://images.unsplash.com/photo-1508243529287-e21914733111?auto=format&fit=crop&w=850&q=85", description: "An expressive silhouette for a point of view all your own.", descriptionAr: "تصميم جريء يعكس أسلوبك الخاص.", featured: true, active: true }
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
const emailVerification = document.getElementById("email-verification");
const verificationInstructions = document.getElementById("verification-instructions");
const verificationError = document.getElementById("verification-error");
const adminMain = document.getElementById("admin-main");
const signInButton = loginForm.querySelector('button[type="submit"]');
const productImageFile = productForm.elements.imageFile;
const productImagePreview = document.getElementById("product-image-preview");
let productPreviewUrl = "";
let currentProductImage = "";
let verificationResendTimeout;
addArabicSettingsFields();

function formatPrice(price) {
  return `${settings.currency || "$"}${Number(price).toFixed(2)}`;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function normalizeWhatsApp(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length === 13 && digits[2] === "0") digits = `20${digits.slice(3)}`;
  return digits;
}

function addArabicSettingsFields() {
  for (const fieldName of LOCALIZED_SETTING_FIELDS) {
    const fieldId = `setting-${fieldName.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;
    const englishField = document.getElementById(fieldId);
    const row = englishField?.closest(".form-row");
    if (!englishField || !row) continue;

    const label = makeElement("label", "arabic-setting-label", "النص بالعربية");
    label.htmlFor = `${fieldId}-ar`;
    label.lang = "ar";
    label.dir = "rtl";
    const arabicField = englishField.cloneNode(false);
    arabicField.id = `${fieldId}-ar`;
    arabicField.name = `${fieldName}Ar`;
    arabicField.lang = "ar";
    arabicField.dir = "rtl";
    arabicField.required = true;
    arabicField.value = "";
    row.append(label, arabicField);
  }
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
  loginForm.hidden = false;
  emailVerification.hidden = true;
  loginForm.reset();
  verificationError.hidden = true;
  verificationInstructions.textContent = "";
  clearTimeout(verificationResendTimeout);
  verificationResendTimeout = null;
  document.getElementById("resend-verification").hidden = true;
}

function showAuthError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

async function requireStoreAdmin(user) {
  const adminSnapshot = await getDoc(doc(db, "store_admins", user.uid));
  if (adminSnapshot.exists() && adminSnapshot.data().enabled === true) return true;
  await signOut(auth);
  return false;
}

async function enterAdmin(user) {
  document.getElementById("admin-password").value = "";
  if (!(await requireStoreAdmin(user))) {
    resetAdminPage();
    showLoginError("Sign-in failed. Check your account details and try again.");
    return;
  }
  if (!user.emailVerified) {
    loginForm.hidden = true;
    emailVerification.hidden = false;
    const emailLabel = user.email ? ` to ${user.email}` : "";
    verificationInstructions.textContent = `Verify your email before accessing the store. Check your inbox and spam folder${emailLabel}.`;
    const resendButton = document.getElementById("resend-verification");
    resendButton.hidden = false;
    try {
      await sendEmailVerification(user);
      verificationInstructions.textContent = `Firebase accepted a verification email request${emailLabel}. Check your inbox and spam folder.`;
      resendButton.disabled = true;
      verificationResendTimeout = window.setTimeout(() => {
        resendButton.disabled = false;
        verificationResendTimeout = null;
      }, 30000);
    } catch (error) {
      console.error("Could not send the Auvne admin email verification.", error);
      verificationInstructions.textContent = `Could not request a verification email${emailLabel}. Check the address and try again shortly.`;
    }
    return;
  }
  adminUser = user;
  loginForm.hidden = true;
  emailVerification.hidden = true;
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
      settings.whatsapp = normalizeWhatsApp(settings.whatsapp) || DEFAULT_SETTINGS.whatsapp;
      fillSettingsForm();
    },
    handleAdminDataError
  ));
}

function handleAdminDataError(error) {
  console.error("Could not sync the Auvne admin studio.", error);
  showToast("Could not sync the store. Please try again.");
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
        showToast("Could not remove that product. Please try again.");
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
        showToast("Could not update that order. Please try again.");
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
        showToast("Could not remove that order. Please try again.");
      }
    });
    actions.append(remove);
    card.append(details, total, actions);
    list.append(card);
  }
}

function fillSettingsForm() {
  for (const fieldName of SETTINGS_FIELDS) {
    if (IMAGE_SETTING_FIELDS.includes(fieldName)) continue;
    const field = document.getElementById(`setting-${fieldName.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`);
    if (field) field.value = settings[fieldName] ?? "";
  }
}

function showProductImagePreview(url) {
  productImagePreview.hidden = !url;
  if (url) productImagePreview.src = url;
  else productImagePreview.removeAttribute("src");
}

function openProductEditor(product) {
  if (productPreviewUrl) URL.revokeObjectURL(productPreviewUrl);
  productPreviewUrl = "";
  productForm.reset();
  document.getElementById("dialog-title").textContent = product ? "Edit product" : "Add a product";
  productForm.elements.id.value = product ? product.id : "";
  productForm.elements.name.value = product ? product.name : "";
  productForm.elements.nameAr.value = product ? product.nameAr || product.name : "";
  productForm.elements.category.value = product ? product.category : "";
  productForm.elements.categoryAr.value = product ? product.categoryAr || product.category : "";
  productForm.elements.price.value = product ? product.price : "";
  currentProductImage = product ? product.image : "";
  document.getElementById("product-image-hint").textContent = product
    ? "Choose a new image to replace the current one, or leave empty to keep it."
    : "Choose a JPEG, PNG, or WebP image (up to 5 MB).";
  showProductImagePreview(currentProductImage);
  productForm.elements.description.value = product ? product.description : "";
  productForm.elements.descriptionAr.value = product ? product.descriptionAr || product.description : "";
  productForm.elements.featured.checked = product ? Boolean(product.featured) : false;
  productDialog.showModal();
}

productImageFile.addEventListener("change", () => {
  if (productPreviewUrl) URL.revokeObjectURL(productPreviewUrl);
  productPreviewUrl = "";
  const file = productImageFile.files[0];
  if (file) {
    productPreviewUrl = URL.createObjectURL(file);
    showProductImagePreview(productPreviewUrl);
  } else {
    showProductImagePreview(currentProductImage);
  }
});

document.getElementById("add-product").addEventListener("click", () => openProductEditor(null));
document.getElementById("close-dialog").addEventListener("click", () => productDialog.close());
productDialog.addEventListener("click", event => {
  if (event.target === productDialog) productDialog.close();
});

productForm.addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(productForm);
  const id = String(form.get("id") || "");
  const imageFile = productImageFile.files[0];
  const product = {
    name: String(form.get("name")).trim(),
    nameAr: String(form.get("nameAr")).trim(),
    category: String(form.get("category")).trim(),
    categoryAr: String(form.get("categoryAr")).trim(),
    price: Number(form.get("price")),
    image: currentProductImage,
    description: String(form.get("description")).trim(),
    descriptionAr: String(form.get("descriptionAr")).trim(),
    featured: form.get("featured") === "on",
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  if (!Number.isFinite(product.price) || product.price < 0 || product.price > 1000000) {
    showToast("Product prices must be between 0 and 1,000,000.");
    return;
  }
  if (!product.name || !product.nameAr || !product.category || !product.categoryAr ||
    !product.description || !product.descriptionAr || (!imageFile && !product.image)) {
    showToast("Please check the product details and try again.");
    return;
  }
  const submitButton = productForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  let uploadedImage = null;
  let saved = false;
  const previousImage = currentProductImage;
  try {
    requireAdmin();
    if (imageFile) {
      uploadedImage = await uploadStoreImage(imageFile, "products");
      product.image = uploadedImage.url;
    }
    const productRef = doc(db, "products", id || crypto.randomUUID());
    if (id) {
      const existingProduct = products.find(existing => existing.id === id);
      product.createdAt = existingProduct?.createdAt || serverTimestamp();
    }
    await setDoc(productRef, product);
    saved = true;
    currentProductImage = product.image;
    productDialog.close();
    showToast(id ? "Product updated on your storefront." : "Your new product is on the storefront.");
  } catch (error) {
    console.error("Could not save Auvne product.", error);
    if (uploadedImage && !saved) {
      try {
        await deleteStoreImage(uploadedImage.url);
      } catch (cleanupError) {
        console.error("Could not clean up an unused Auvne product image.", cleanupError);
      }
    }
    showToast("Could not save that product. Please try again.");
  } finally {
    submitButton.disabled = false;
  }
  if (saved && uploadedImage && previousImage && previousImage !== uploadedImage.url) {
    try {
      await deleteStoreImage(previousImage);
    } catch (error) {
      console.error("Could not remove the replaced Auvne product image.", error);
      showToast("Product saved, but the previous image could not be removed.");
    }
  }
});

document.getElementById("settings-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const nextSettings = { ...settings };
  for (const fieldName of TEXT_SETTING_FIELDS) {
    const value = String(form.get(fieldName) || "").trim();
    nextSettings[fieldName] = fieldName === "whatsapp" ? normalizeWhatsApp(value) : value;
  }
  for (const fieldName of LOCALIZED_SETTING_FIELDS) {
    nextSettings[`${fieldName}Ar`] = String(form.get(`${fieldName}Ar`) || "").trim();
  }
  if (TEXT_SETTING_FIELDS.some(fieldName => fieldName !== "whatsapp" && !nextSettings[fieldName]) ||
    LOCALIZED_SETTING_FIELDS.some(fieldName => !nextSettings[`${fieldName}Ar`])) {
    showToast("Please fill out each required storefront field.");
    return;
  }
  const imageUploads = [
    ["heroImage", form.get("heroImageUpload"), "storefront"],
    ["storyImage", form.get("storyImageUpload"), "storefront"]
  ].filter(([, file]) => file instanceof File && file.size > 0);
  const saveButton = event.currentTarget.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  const uploadedImages = [];
  const previousSettings = { ...settings };
  let saved = false;
  try {
    requireAdmin();
    for (const [fieldName, file, folder] of imageUploads) {
      const uploaded = await uploadStoreImage(file, folder);
      uploadedImages.push({ fieldName, uploaded });
      nextSettings[fieldName] = uploaded.url;
    }
    await setDoc(doc(db, "store_settings", "main"), {
      ...nextSettings,
      updatedAt: serverTimestamp()
    }, { merge: true });
    saved = true;
    settings = nextSettings;
    showToast("Your storefront has been updated.");
  } catch (error) {
    console.error("Could not save Auvne storefront settings.", error);
    for (const { uploaded } of uploadedImages.filter(() => !saved)) {
      try {
        await deleteStoreImage(uploaded.url);
      } catch (cleanupError) {
        console.error("Could not clean up an unused Auvne storefront image.", cleanupError);
      }
    }
    showToast("Could not save your storefront settings. Please try again.");
  } finally {
    saveButton.disabled = false;
  }
  if (saved) {
    let cleanupFailed = false;
    for (const { fieldName } of uploadedImages) {
      try {
        await deleteStoreImage(previousSettings[fieldName]);
      } catch (error) {
        console.error(`Could not remove the replaced Auvne ${fieldName} image.`, error);
        cleanupFailed = true;
      }
    }
    if (cleanupFailed) showToast("Storefront saved, but a previous image could not be removed.");
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
    showToast("Could not clear the orders. Please try again.");
  }
});

document.getElementById("sign-out").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Could not sign out of Auvne admin.", error);
    showToast("Could not sign out. Please try again.");
  }
});

document.getElementById("password-reset").addEventListener("click", async () => {
  const email = String(new FormData(loginForm).get("email") || "").trim();
  if (!email) {
    showAuthError(loginError, "Enter your email address and we’ll send a reset link if an account matches.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Could not send the Auvne admin password reset email.", error);
  }
  showAuthError(loginError, "If an account matches that email, a password reset link has been sent.");
});

document.getElementById("resend-verification").addEventListener("click", async event => {
  const button = event.currentTarget;
  const user = auth?.currentUser;
  const instructions = verificationInstructions;
  if (!user || user.emailVerified || button.disabled) return;
  button.disabled = true;
  try {
    await sendEmailVerification(user);
    const emailLabel = user.email ? ` to ${user.email}` : "";
    instructions.textContent = `Firebase accepted a verification email request${emailLabel}. Check your inbox and spam folder.`;
    clearTimeout(verificationResendTimeout);
    verificationResendTimeout = window.setTimeout(() => {
      button.disabled = false;
      verificationResendTimeout = null;
    }, 30000);
  } catch (error) {
    console.error("Could not resend the Auvne admin email verification.", error);
    instructions.textContent = "Could not request a verification email. Wait a moment, then try again.";
    button.disabled = false;
  }
});

document.getElementById("check-email-verified").addEventListener("click", async event => {
  const user = auth?.currentUser;
  const button = event.currentTarget;
  verificationError.hidden = true;
  if (!user) {
    resetAdminPage();
    showLoginError("Your sign-in expired. Please sign in again.");
    return;
  }
  button.disabled = true;
  try {
    await reload(user);
    if (!user.emailVerified) {
      showAuthError(verificationError, "Your email is not verified yet. Open the verification link, then try again.");
      return;
    }
    await user.getIdToken(true);
    await enterAdmin(user);
  } catch (error) {
    console.error("Could not verify Auvne admin email status.", error);
    showAuthError(verificationError, "Could not confirm your email yet. Please try again.");
  } finally {
    button.disabled = false;
  }
});

document.getElementById("verification-sign-out").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Could not sign out from the Auvne email verification screen.", error);
    showAuthError(verificationError, "Could not return to sign-in. Please try again.");
  }
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!auth) {
    console.error("Auvne admin Firebase setup is unavailable.", firebaseConfigError);
    showLoginError("Sign-in is temporarily unavailable. Please try again later.");
    return;
  }
  const form = new FormData(loginForm);
  signInButton.disabled = true;
  loginError.hidden = true;
  try {
    await signInWithEmailAndPassword(auth, String(form.get("email")).trim(), String(form.get("password")));
  } catch (error) {
    console.error("Auvne admin sign-in failed.", error);
    loginError.hidden = true;
    showLoginError("Sign-in failed. Check your email and password and try again.");
  } finally {
    signInButton.disabled = false;
  }
});

if (!auth) {
  console.error("Auvne admin Firebase setup is unavailable.", firebaseConfigError);
  showLoginError("Sign-in is temporarily unavailable. Please try again later.");
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
      await signOut(auth);
      resetAdminPage();
      showLoginError("Could not open the store studio. Please try again.");
    }
  });
}
