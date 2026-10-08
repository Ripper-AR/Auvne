import { supabase, supabaseConfigError } from "./supabase-client.js";

const SETTINGS_FIELDS = [
  ["announcement", "announcement"],
  ["navShop", "nav_shop"],
  ["navStory", "nav_story"],
  ["navContact", "nav_contact"],
  ["eyebrow", "eyebrow"],
  ["title", "title"],
  ["description", "description"],
  ["heroCta", "hero_cta"],
  ["heroNote", "hero_note"],
  ["heroCaption", "hero_caption"],
  ["heroRoundel", "hero_roundel"],
  ["heroImage", "hero_image"],
  ["collectionEyebrow", "collection_eyebrow"],
  ["collectionTitle", "collection_title"],
  ["collectionIntro", "collection_intro"],
  ["collectionLabel", "collection_label"],
  ["featuredBadge", "featured_badge"],
  ["storyEyebrow", "story_eyebrow"],
  ["storyTitle", "story_title"],
  ["storyDescription", "story_description"],
  ["storyImage", "story_image"],
  ["storyStamp", "story_stamp"],
  ["storyCta", "story_cta"],
  ["promiseOne", "promise_one"],
  ["promiseTwo", "promise_two"],
  ["promiseThree", "promise_three"],
  ["whatsapp", "whatsapp"],
  ["footerWhatsappLabel", "footer_whatsapp_label"],
  ["footerMessage", "footer_message"],
  ["checkoutNote", "checkout_note"],
  ["checkoutButton", "checkout_button"],
  ["currency", "currency"]
];

let store = { settings: {}, products: [] };
let toastTimeout;
let currentSession = null;
const productDialog = document.getElementById("product-dialog");
const productForm = document.getElementById("product-form");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const adminMain = document.getElementById("admin-main");

function formatPrice(price) {
  return `${store.settings.currency || "$"}${Number(price).toFixed(2)}`;
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

function resetAdminPage() {
  currentSession = null;
  adminMain.hidden = true;
  document.getElementById("admin-nav").hidden = true;
  document.getElementById("login-gate").hidden = false;
  loginForm.reset();
}

async function enterAdmin(session) {
  if (!session || !supabase) {
    resetAdminPage();
    return;
  }
  const { data, error } = await supabase.rpc("is_store_admin");
  if (error) throw error;
  if (data !== true) {
    await supabase.auth.signOut();
    resetAdminPage();
    showLoginError("This account does not have store-admin access. Ask the owner to grant it in Supabase.");
    return;
  }
  currentSession = session;
  document.getElementById("login-gate").hidden = true;
  adminMain.hidden = false;
  document.getElementById("admin-nav").hidden = false;
  loginError.hidden = true;
  await Promise.all([loadProducts(), loadOrders(), loadSettings()]);
}

async function requireAdmin() {
  if (!supabase || !currentSession) throw new Error("Please sign in with an authorized store-admin account.");
}

async function loadProducts() {
  const { data, error } = await supabase.from("products")
    .select("id, name, category, price, image, description, featured, active")
    .order("created_at");
  if (error) throw error;
  store.products = data || [];
  renderProducts();
}

async function loadSettings() {
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", true).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Storefront settings are missing. Run the Supabase setup migration.");
  store.settings = data;
  fillSettingsForm();
}

async function loadOrders() {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  renderOrders(data || []);
}

function renderProducts() {
  const list = document.getElementById("admin-product-list");
  list.replaceChildren();
  if (store.products.length === 0) {
    list.append(makeElement("p", "orders-empty", "No products yet. Add your first one whenever you're ready."));
    return;
  }
  for (const product of store.products) {
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
        await requireAdmin();
        const { error } = await supabase.from("products").delete().eq("id", product.id);
        if (error) throw error;
        await loadProducts();
        showToast("Product removed from your storefront.");
      } catch (error) {
        showToast(error.message || "Could not remove that product.");
        console.error("Could not remove Auvne product.", error);
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
    details.append(makeElement("h3", "order-title", order.customer_name || "Customer"));
    const date = order.created_at ? new Date(order.created_at).toLocaleString() : "Date unavailable";
    details.append(makeElement("p", "order-meta", `${order.reference} · ${date} · ${order.customer_phone}`));
    const items = Array.isArray(order.items) ? order.items : [];
    details.append(makeElement("p", "order-products", items.map(item =>
      `${item.name} × ${item.quantity} (${formatPrice(Number(item.price) * item.quantity)})`
    ).join(" · ")));
    const total = makeElement("div", "order-total", formatPrice(order.total));
    const actions = makeElement("div", "order-card-actions");
    const digits = String(order.customer_phone || "").replace(/\D/g, "");
    if (digits) {
      const messageLink = document.createElement("a");
      messageLink.href = `https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${order.customer_name || "there"}, thanks for your Auvne order ${order.reference}!`)}`;
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
        await requireAdmin();
        const { error } = await supabase.from("orders").update({ status: status.value }).eq("id", order.id);
        if (error) throw error;
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
        await requireAdmin();
        const { error } = await supabase.from("orders").delete().eq("id", order.id);
        if (error) throw error;
        await loadOrders();
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
  for (const [formName, column] of SETTINGS_FIELDS) {
    const field = document.getElementById(`setting-${formName.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`);
    if (field) field.value = store.settings[column] ?? "";
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
    id: id || `product-${crypto.randomUUID()}`,
    name: String(form.get("name")).trim(),
    category: String(form.get("category")).trim(),
    price: Number(form.get("price")),
    image: String(form.get("image")).trim(),
    description: String(form.get("description")).trim(),
    featured: form.get("featured") === "on",
    active: true
  };
  if (!product.name || !product.category || !product.description || !Number.isFinite(product.price) || product.price < 0) {
    showToast("Please check the product details and try again.");
    return;
  }
  try {
    await requireAdmin();
    const { error } = await supabase.from("products").upsert(product);
    if (error) throw error;
    await loadProducts();
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
  const settings = { id: true };
  for (const [formName, column] of SETTINGS_FIELDS) {
    const value = String(form.get(formName) || "").trim();
    settings[column] = formName === "whatsapp" ? value.replace(/\D/g, "") : value;
  }
  if (SETTINGS_FIELDS.some(([formName, column]) => formName !== "whatsapp" && !settings[column])) {
    showToast("Please fill out each required storefront field.");
    return;
  }
  try {
    await requireAdmin();
    const { error } = await supabase.from("store_settings").upsert(settings);
    if (error) throw error;
    store.settings = settings;
    showToast("Your storefront has been updated.");
  } catch (error) {
    console.error("Could not save Auvne storefront settings.", error);
    showToast(error.message || "Could not save your storefront settings.");
  }
});

document.getElementById("clear-orders").addEventListener("click", async () => {
  if (!window.confirm("Remove all saved orders? This cannot be undone.")) return;
  try {
    await requireAdmin();
    const { error } = await supabase.from("orders").delete().not("id", "is", null);
    if (error) throw error;
    await loadOrders();
    showToast("Saved orders cleared.");
  } catch (error) {
    console.error("Could not clear Auvne orders.", error);
    showToast(error.message || "Could not clear the orders.");
  }
});

document.getElementById("sign-out").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Could not sign out of Auvne admin.", error);
    showToast(error.message || "Could not sign out.");
  } else {
    resetAdminPage();
  }
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!supabase) {
    showLoginError(supabaseConfigError);
    return;
  }
  const form = new FormData(loginForm);
  const email = String(form.get("email")).trim();
  const password = String(form.get("password"));
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  loginError.hidden = true;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (error) {
    console.error("Auvne admin sign-in failed.", error);
    showLoginError(error.message || "Sign-in failed. Please try again.");
  } finally {
    submitButton.disabled = false;
  }
});

async function initializeAdmin() {
  if (!supabase) {
    showLoginError(supabaseConfigError);
    loginForm.querySelectorAll("input, button").forEach(field => { field.disabled = true; });
    return;
  }
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") resetAdminPage();
    if (event === "SIGNED_IN" && session) {
      setTimeout(() => enterAdmin(session).catch(error => {
        console.error("Could not load the Auvne admin studio.", error);
        resetAdminPage();
        showLoginError(error.message || "Could not load the admin studio.");
      }), 0);
    }
  });
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) await enterAdmin(data.session);
  else resetAdminPage();
}

initializeAdmin().catch(error => {
  console.error("Could not initialize the Auvne admin studio.", error);
  showLoginError(error.message || "Could not connect to Supabase.");
});
