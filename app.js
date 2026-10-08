import { supabase, supabaseConfigError } from "./supabase-client.js";

const CART_KEY = "auvne-cart-v1";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1100&q=85";

const DEFAULT_SETTINGS = {
  announcement: "A little more you. A little more Auvne.",
  nav_shop: "Shop all",
  nav_story: "Our story",
  nav_contact: "Contact",
  eyebrow: "A new perspective, just for you",
  title: "See things\ndifferently.",
  description: "Meet the frames that make everyday feel a little more like you. Thoughtfully chosen, easy to love, ready to go wherever you do.",
  hero_cta: "Discover the collection",
  hero_note: "Thoughtful frames.\nEveryday perspective.",
  hero_caption: "Made for your point of view",
  hero_roundel: "A BETTER\nPOINT OF\nVIEW",
  hero_image: FALLBACK_IMAGE,
  collection_eyebrow: "A little something for your eyes",
  collection_title: "Meet your new\nfavourite frames.",
  collection_intro: "Easy to wear, hard to forget.\nFind the pair that feels like you.",
  collection_label: "THE COLLECTION",
  featured_badge: "A little favourite",
  story_eyebrow: "A clearer kind of everyday",
  story_title: "Good frames.\nGood feeling.",
  story_description: "We believe the right pair can shift your whole perspective. Auvne brings together considered shapes, everyday comfort, and the little details that make a frame feel like yours.",
  story_image: FALLBACK_IMAGE,
  story_stamp: "AUVNE\nEST. WITH CARE",
  story_cta: "Find your pair",
  promise_one: "Thoughtful\ndesign",
  promise_two: "Made for\neveryday",
  promise_three: "A little more\nyou",
  whatsapp: "",
  footer_whatsapp_label: "Say hello on WhatsApp",
  footer_message: "Thoughtful frames for everyday people.",
  checkout_note: "Your order will open in WhatsApp so we can help you personally.",
  checkout_button: "Continue to WhatsApp",
  currency: "$"
};

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
let products = [];
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
  document.getElementById("nav-shop").textContent = settings.nav_shop;
  document.getElementById("nav-story").textContent = settings.nav_story;
  document.getElementById("nav-contact").textContent = settings.nav_contact;
  document.getElementById("hero-eyebrow").textContent = settings.eyebrow;
  document.getElementById("hero-title").textContent = settings.title;
  document.getElementById("hero-description").textContent = settings.description;
  document.getElementById("hero-cta").textContent = settings.hero_cta;
  document.getElementById("hero-note").textContent = settings.hero_note;
  document.getElementById("hero-caption").textContent = settings.hero_caption;
  document.getElementById("hero-roundel").textContent = settings.hero_roundel;
  document.getElementById("collection-eyebrow").textContent = settings.collection_eyebrow;
  document.getElementById("collection-title").textContent = settings.collection_title;
  document.getElementById("collection-intro").textContent = settings.collection_intro;
  document.getElementById("collection-label").textContent = settings.collection_label;
  document.getElementById("story-eyebrow").textContent = settings.story_eyebrow;
  document.getElementById("story-title").textContent = settings.story_title;
  document.getElementById("story-description").textContent = settings.story_description;
  setImage(document.getElementById("story-image"), settings.story_image);
  document.getElementById("story-stamp").textContent = settings.story_stamp;
  document.getElementById("story-cta").textContent = settings.story_cta;
  document.getElementById("promise-one").textContent = settings.promise_one;
  document.getElementById("promise-two").textContent = settings.promise_two;
  document.getElementById("promise-three").textContent = settings.promise_three;
  setImage(document.getElementById("hero-image"), settings.hero_image);
  document.getElementById("footer-message").textContent = settings.footer_message;
  document.getElementById("footer-whatsapp-label").textContent = settings.footer_whatsapp_label;
  document.getElementById("checkout-note").textContent = settings.checkout_note;
  document.querySelector("#checkout-button-label span").textContent = settings.checkout_button;
  document.getElementById("footer-year").textContent = new Date().getFullYear();
  const whatsappLink = document.getElementById("footer-whatsapp");
  whatsappLink.href = settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : "#collection";
  whatsappLink.onclick = settings.whatsapp ? null : event => event.preventDefault();
  renderProducts();
  renderCart();
}

async function loadStorefront() {
  if (!supabase) {
    showStoreError(supabaseConfigError);
    return;
  }
  const [settingsResult, productsResult] = await Promise.all([
    supabase.from("store_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("products").select("id, name, category, price, image, description, featured").eq("active", true).order("created_at")
  ]);
  if (settingsResult.error) throw settingsResult.error;
  if (productsResult.error) throw productsResult.error;
  if (settingsResult.data) settings = { ...DEFAULT_SETTINGS, ...settingsResult.data };
  products = productsResult.data || [];
  productsLoaded = true;
  renderStorefront();
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
    if (product.featured) photo.append(makeElement("span", "product-tag", settings.featured_badge));
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
  if (!supabase || cart.length === 0) return;
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
    const { data, error } = await supabase.rpc("place_order", {
      p_customer_name: name,
      p_customer_phone: phone,
      p_items: cart.map(item => ({ id: item.id, quantity: item.quantity }))
    });
    if (error) throw error;
    const message = [
      "Hello Auvne! I'd love to place an order.",
      `Name: ${name}`,
      `Phone: ${phone}`,
      "",
      "My selection:",
      ...data.items.map(item => `• ${item.name} × ${item.quantity} — ${formatPrice(Number(item.price) * item.quantity)}`),
      "",
      `Total: ${formatPrice(data.total)}`,
      `Order reference: ${data.reference}`
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
loadStorefront().catch(error => {
  console.error("Could not load the Auvne storefront.", error);
  showStoreError(error.message || "The shop could not connect to Supabase. Please try again later.");
});
