import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db, firebaseConfigError } from "./firebase-client.js";

const CART_KEY = "auvne-cart-v1";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1100&q=85";

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
  heroImage: FALLBACK_IMAGE,
  collectionEyebrow: "A little something for your eyes",
  collectionTitle: "Meet your new\nfavourite frames.",
  collectionIntro: "Easy to wear, hard to forget.\nFind the pair that feels like you.",
  collectionLabel: "THE COLLECTION",
  featuredBadge: "A little favourite",
  storyEyebrow: "A clearer kind of everyday",
  storyTitle: "Good frames.\nGood feeling.",
  storyDescription: "We believe the right pair can shift your whole perspective. Auvne brings together considered shapes, everyday comfort, and the little details that make a frame feel like yours.",
  storyImage: FALLBACK_IMAGE,
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
  { id: "sol-01", name: "The Sol", category: "Everyday frames", price: 89, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=850&q=85", description: "An easy, flattering shape made for wherever the day takes you.", featured: true },
  { id: "noa-02", name: "The Noa", category: "A little statement", price: 105, image: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=850&q=85", description: "A little extra character, with all-day comfort built in.", featured: true },
  { id: "remi-03", name: "The Remi", category: "Modern classics", price: 95, image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=850&q=85", description: "A clean, timeless frame that feels like it has always been yours.", featured: true },
  { id: "cleo-04", name: "The Cleo", category: "Made to be noticed", price: 115, image: "https://images.unsplash.com/photo-1508243529287-e21914733111?auto=format&fit=crop&w=850&q=85", description: "An expressive silhouette for a point of view all your own.", featured: true }
];

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter(item => item && typeof item.id === "string" && Number.isInteger(item.quantity) && item.quantity > 0);
  } catch (error) {
    console.error("Could not read the saved shopping bag.", error);
    return [];
  }
}

let settings = { ...DEFAULT_SETTINGS };
let products = DEFAULT_PRODUCTS.map(product => ({ ...product }));
let productsLoaded = false;
let cart = readCart();
const productGrid = document.getElementById("product-grid");
const drawer = document.getElementById("cart-drawer");
const backdrop = document.getElementById("cart-backdrop");
const storeStatus = document.getElementById("store-status");

function formatPrice(price) {
  return `${settings.currency}${Number(price).toFixed(2)}`;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function setImage(image, url) {
  image.src = url || FALLBACK_IMAGE;
  image.onerror = () => {
    image.onerror = null;
    image.src = FALLBACK_IMAGE;
  };
}

function showStoreError(message) {
  storeStatus.textContent = message;
  storeStatus.hidden = false;
}

function renderStorefront() {
  document.title = `Auvne — ${settings.eyebrow}`;
  document.getElementById("announcement-bar").textContent = settings.announcement;
  document.getElementById("nav-shop").textContent = settings.navShop;
  document.getElementById("nav-story").textContent = settings.navStory;
  document.getElementById("nav-contact").textContent = settings.navContact;
  document.getElementById("hero-eyebrow").textContent = settings.eyebrow;
  document.getElementById("hero-title").textContent = settings.title;
  document.getElementById("hero-description").textContent = settings.description;
  document.getElementById("hero-cta").textContent = settings.heroCta;
  document.getElementById("hero-note").textContent = settings.heroNote;
  document.getElementById("hero-caption").textContent = settings.heroCaption;
  document.getElementById("hero-roundel").textContent = settings.heroRoundel;
  document.getElementById("collection-eyebrow").textContent = settings.collectionEyebrow;
  document.getElementById("collection-title").textContent = settings.collectionTitle;
  document.getElementById("collection-intro").textContent = settings.collectionIntro;
  document.getElementById("collection-label").textContent = settings.collectionLabel;
  document.getElementById("story-eyebrow").textContent = settings.storyEyebrow;
  document.getElementById("story-title").textContent = settings.storyTitle;
  document.getElementById("story-description").textContent = settings.storyDescription;
  setImage(document.getElementById("story-image"), settings.storyImage);
  document.getElementById("story-stamp").textContent = settings.storyStamp;
  document.getElementById("story-cta").textContent = settings.storyCta;
  document.getElementById("promise-one").textContent = settings.promiseOne;
  document.getElementById("promise-two").textContent = settings.promiseTwo;
  document.getElementById("promise-three").textContent = settings.promiseThree;
  setImage(document.getElementById("hero-image"), settings.heroImage);
  document.getElementById("footer-message").textContent = settings.footerMessage;
  document.getElementById("footer-whatsapp-label").textContent = settings.footerWhatsappLabel;
  document.getElementById("checkout-note").textContent = settings.checkoutNote;
  document.querySelector("#checkout-button-label span").textContent = settings.checkoutButton;
  document.getElementById("footer-year").textContent = new Date().getFullYear();
  const whatsappLink = document.getElementById("footer-whatsapp");
  whatsappLink.href = settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : "#collection";
  whatsappLink.onclick = settings.whatsapp ? null : event => event.preventDefault();
  renderProducts();
  renderCart();
}

function loadStorefront() {
  if (!db) {
    showStoreError(firebaseConfigError);
    return;
  }
  const handleError = error => {
    console.error("Could not load the Auvne storefront.", error);
    showStoreError("The shop could not connect to Firebase. Check the Firebase setup steps, then reload this page.");
  };
  onSnapshot(doc(db, "store_settings", "main"), snapshot => {
    if (snapshot.exists()) settings = { ...DEFAULT_SETTINGS, ...snapshot.data() };
    renderStorefront();
  }, handleError);
  onSnapshot(query(collection(db, "products"), where("active", "==", true)), snapshot => {
    products = snapshot.docs
      .map(product => ({ id: product.id, ...product.data() }))
      .sort((first, second) => (first.createdAt?.seconds || 0) - (second.createdAt?.seconds || 0));
    productsLoaded = true;
    renderProducts();
    renderCart();
  }, handleError);
}

function renderProducts() {
  productGrid.replaceChildren();
  document.getElementById("product-total").textContent = `${String(products.length).padStart(2, "0")} PIECES`;
  if (products.length === 0) {
    productGrid.append(makeElement("p", "empty-products", "A little space for something lovely. Check back soon."));
    return;
  }
  for (const product of products) {
    const card = makeElement("article", "product-card");
    const photo = makeElement("div", "product-photo");
    const image = document.createElement("img");
    image.alt = product.name;
    image.loading = "lazy";
    setImage(image, product.image);
    photo.append(image);
    if (product.featured) photo.append(makeElement("span", "product-tag", settings.featuredBadge));
    const addButton = makeElement("button", "quick-add", "Add to your bag  +");
    addButton.type = "button";
    addButton.addEventListener("click", () => changeQuantity(product.id, 1));
    photo.append(addButton);
    const info = makeElement("div", "product-info");
    const line = makeElement("div", "product-name-line");
    line.append(makeElement("h3", "product-name", product.name), makeElement("span", "product-price", formatPrice(product.price)));
    info.append(line, makeElement("p", "product-category", product.category));
    if (product.description) info.append(makeElement("p", "product-description", product.description));
    card.append(photo, info);
    productGrid.append(card);
  }
}

function persistCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error("Could not save the shopping bag.", error);
    showStoreError("Your browser could not save your shopping bag. Please check your browser storage settings.");
  }
}

function changeQuantity(id, amount) {
  const current = cart.find(item => item.id === id);
  if (current && current.quantity + amount > 20) {
    showStoreError("You can add up to 20 of each frame per order.");
    return;
  }
  if (!current && amount > 0 && cart.length >= 10) {
    showStoreError("You can order up to 10 different frames at a time.");
    return;
  }
  if (current) current.quantity += amount;
  else if (amount > 0) cart.push({ id, quantity: amount });
  cart = cart.filter(item => item.quantity > 0);
  persistCart();
  renderCart();
  if (amount > 0) openCart();
}

function renderCart() {
  if (productsLoaded) {
    cart = cart.filter(item => products.some(product => product.id === item.id));
    persistCart();
  }
  const totalCount = productsLoaded ? cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
  document.getElementById("cart-count").textContent = totalCount;
  document.getElementById("drawer-count").textContent = `(${totalCount})`;
  const itemsContainer = document.getElementById("cart-items");
  itemsContainer.replaceChildren();
  let total = 0;
  for (const item of cart) {
    const product = products.find(candidate => candidate.id === item.id);
    if (!product) continue;
    total += Number(product.price) * item.quantity;
    const row = makeElement("article", "cart-line");
    const image = document.createElement("img");
    image.alt = "";
    setImage(image, product.image);
    const description = makeElement("div", "");
    description.append(makeElement("h3", "cart-line-name", product.name), makeElement("p", "cart-line-category", product.category));
    const controls = makeElement("div", "quantity-controls");
    const minus = makeElement("button", "", "−");
    minus.type = "button";
    minus.setAttribute("aria-label", `Remove one ${product.name}`);
    minus.addEventListener("click", () => changeQuantity(product.id, -1));
    const quantity = makeElement("span", "", item.quantity);
    const plus = makeElement("button", "", "+");
    plus.type = "button";
    plus.setAttribute("aria-label", `Add one ${product.name}`);
    plus.addEventListener("click", () => changeQuantity(product.id, 1));
    controls.append(minus, quantity, plus);
    description.append(controls);
    const remove = makeElement("button", "remove-item", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${product.name} from bag`);
    remove.addEventListener("click", () => {
      cart = cart.filter(cartItem => cartItem.id !== product.id);
      persistCart();
      renderCart();
    });
    row.append(image, description, remove);
    itemsContainer.append(row);
  }
  document.getElementById("cart-total").textContent = formatPrice(total);
  document.getElementById("cart-empty").hidden = totalCount !== 0;
  document.getElementById("cart-bottom").hidden = totalCount === 0;
}

function openCart() {
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  backdrop.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeCart() {
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  backdrop.hidden = true;
  document.body.style.overflow = "";
}

document.getElementById("cart-trigger").addEventListener("click", openCart);
document.getElementById("close-cart").addEventListener("click", closeCart);
backdrop.addEventListener("click", closeCart);
document.getElementById("empty-shop-link").addEventListener("click", closeCart);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeCart();
});

document.getElementById("checkout-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!db || !productsLoaded || cart.length === 0) {
    showStoreError("Checkout is not ready. Please try again once the shop finishes connecting.");
    return;
  }
  if (cart.length > 10) {
    showStoreError("Your bag has more than 10 different frames. Remove some frames before checking out.");
    return;
  }
  if (!settings.whatsapp) {
    showStoreError("The shop owner has not added a WhatsApp number yet. Please contact them directly.");
    return;
  }
  const form = new FormData(event.currentTarget);
  const name = String(form.get("name")).trim();
  const phone = String(form.get("phone")).trim();
  if (!name || !phone) return;
  const whatsappTab = window.open("about:blank", "_blank");
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const items = cart.map(item => {
      const product = products.find(candidate => candidate.id === item.id);
      if (!product || product.active !== true) throw new Error("One of the selected products is no longer available.");
      return {
        id: product.id,
        name: product.name,
        priceCents: Math.round(Number(product.price) * 100),
        quantity: item.quantity
      };
    });
    const totalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    const orderId = doc(collection(db, "orders")).id;
    const reference = `AUV-${orderId.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
    await setDoc(doc(db, "orders", orderId), {
      reference,
      customerName: name,
      customerPhone: phone,
      items,
      totalCents,
      status: "new",
      createdAt: serverTimestamp()
    });
    const message = [
      "Hello Auvne! I'd love to place an order.",
      `Name: ${name}`,
      `Phone: ${phone}`,
      "",
      "My selection:",
      ...items.map(item => `• ${item.name} × ${item.quantity} — ${formatPrice(item.priceCents / 100 * item.quantity)}`),
      "",
      `Total: ${formatPrice(totalCents / 100)}`,
      `Order reference: ${reference}`
    ].join("\n");
    const whatsappUrl = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(message)}`;
    cart = [];
    persistCart();
    renderCart();
    closeCart();
    if (whatsappTab) {
      whatsappTab.location.href = whatsappUrl;
    } else {
      window.location.assign(whatsappUrl);
    }
  } catch (error) {
    console.error("Could not place the Auvne order.", error);
    if (whatsappTab) whatsappTab.close();
    showStoreError(error.message || "We couldn't save your order. Please try again.");
  } finally {
    submitButton.disabled = false;
  }
});

renderStorefront();
loadStorefront();
