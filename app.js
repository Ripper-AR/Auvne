import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db, firebaseConfigError } from "./firebase-client.js";

const CART_KEY = "auvne-cart-v1";
const LANGUAGE_KEY = "auvne-language-v1";
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
  whatsapp: "201020817084",
  footerWhatsappLabel: "Say hello on WhatsApp",
  footerMessage: "Thoughtful frames for everyday people.",
  checkoutNote: "Your order will open in WhatsApp so we can help you personally.",
  checkoutButton: "Continue to WhatsApp",
  currency: "$"
};

const ARABIC_DEFAULTS = {
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

const UI_TEXT = {
  en: {
    pageTitle: "Auvne — See things differently",
    navigation: "Main navigation",
    bag: "Bag",
    openBag: "Open shopping bag",
    closeBag: "Close shopping bag",
    pieces: "PIECES",
    piece: "PIECE",
    emptyProducts: "A little space for something lovely. Check back soon.",
    cartEyebrow: "YOUR SELECTION",
    cartTitle: "Your bag",
    emptyBag: "Your bag is taking a little breather.",
    findFrames: "Find your frames ↗",
    subtotal: "Subtotal",
    customerName: "Your name",
    namePlaceholder: "What should we call you?",
    customerPhone: "Your phone number",
    phonePlaceholder: "So we can get back to you",
    close: "Close",
    addToBag: "Add to your bag  +",
    addedToBag: "Added to your bag ✓",
    backToCollection: "← Back to collection",
    availableColors: "Available colors",
    noRating: "No ratings yet",
    ratingOutOf: rating => `${rating} out of 5`,
    ratingCount: count => `(${count} ${count === 1 ? "review" : "reviews"})`,
    viewDetails: name => `View ${name} details`,
    orderReference: "Order reference",
    removeOne: name => `Remove one ${name}`,
    addOne: name => `Add one ${name}`,
    removeItem: name => `Remove ${name} from bag`,
    noConfig: "The shop is temporarily unavailable. Please try again shortly.",
    storeConnect: "This part of the shop is temporarily unavailable. Please try again shortly.",
    storageError: "Your browser could not save your shopping bag. Please check your browser storage settings.",
    quantityLimit: "You can add up to 20 of each frame per order.",
    frameLimit: "You can order up to 10 different frames at a time.",
    moreThanTen: "Your bag has more than 10 different frames. Remove some frames before checking out.",
    checkoutNotReady: "Checkout is not ready. Please try again once the shop finishes connecting.",
    validCustomer: "Please enter your name and phone number.",
    productUnavailable: "One of the selected products is no longer available.",
    orderSaved: reference => `Order ${reference} is saved. Review the WhatsApp message and tap Send to place your order.`,
    orderSavedNoWhatsapp: reference => `Order ${reference} is saved, but the shop WhatsApp number is missing. Please contact the shop owner.`,
    orderError: "We couldn't save your order. Please try again.",
    whatsappFailed: "We saved your order, but couldn't open WhatsApp. Use the link below or contact the shop owner.",
    whatsappUnavailable: "WhatsApp is unavailable on this device. Contact the shop owner with your order reference.",
    openWhatsapp: "Open WhatsApp to send the order",
    whatsappGreeting: "Hello Auvne! I'd like to place an order.",
    orderName: "Name",
    orderPhone: "Phone",
    orderSelection: "My selection:",
    orderTotal: "Total",
    languageLabel: "Switch language to Arabic",
    languageButton: "العربية",
    heroImageAlt: "Auvne eyewear campaign",
    storyImageAlt: "A considered collection of eyewear"
  },
  ar: {
    pageTitle: "Auvne — نظارات تعكس أسلوبك",
    navigation: "القائمة الرئيسية",
    bag: "حقيبتي",
    openBag: "افتح حقيبة التسوق",
    closeBag: "أغلق حقيبة التسوق",
    pieces: "إطارات",
    piece: "إطار",
    emptyProducts: "نجهّز لك اختيارات جميلة. عُد إلينا قريباً.",
    cartEyebrow: "اختياراتك",
    cartTitle: "حقيبة التسوق",
    emptyBag: "حقيبتك فارغة حالياً.",
    findFrames: "اكتشف إطاراتك ↗",
    subtotal: "المجموع",
    customerName: "اسمك",
    namePlaceholder: "ما الاسم الذي نناديك به؟",
    customerPhone: "رقم هاتفك",
    phonePlaceholder: "لنتواصل معك",
    close: "إغلاق",
    addToBag: "أضف إلى الحقيبة  +",
    addedToBag: "أُضيف إلى الحقيبة ✓",
    backToCollection: "← العودة إلى المجموعة",
    availableColors: "الألوان المتوفرة",
    noRating: "لا توجد تقييمات بعد",
    ratingOutOf: rating => `${rating} من 5`,
    ratingCount: count => `(${count} تقييم)`,
    viewDetails: name => `عرض تفاصيل ${name}`,
    orderReference: "رقم الطلب",
    removeOne: name => `احذف قطعة من ${name}`,
    addOne: name => `أضف قطعة من ${name}`,
    removeItem: name => `احذف ${name} من الحقيبة`,
    noConfig: "المتجر غير متاح مؤقتاً. يرجى المحاولة بعد قليل.",
    storeConnect: "هذا الجزء من المتجر غير متاح مؤقتاً. يرجى المحاولة بعد قليل.",
    storageError: "تعذّر حفظ حقيبة التسوق. تحقق من إعدادات التخزين في المتصفح.",
    quantityLimit: "يمكنك طلب 20 قطعة كحد أقصى من كل إطار.",
    frameLimit: "يمكنك طلب 10 إطارات مختلفة كحد أقصى.",
    moreThanTen: "تحتوي حقيبتك على أكثر من 10 إطارات مختلفة. احذف بعضها قبل إتمام الطلب.",
    checkoutNotReady: "الطلب غير جاهز بعد. حاول مجدداً بعد اتصال المتجر.",
    validCustomer: "يرجى إدخال اسمك ورقم هاتفك.",
    productUnavailable: "أحد الإطارات المختارة لم يعد متوفراً.",
    orderSaved: reference => `تم حفظ الطلب ${reference}. راجع رسالة واتساب واضغط «إرسال» لتأكيد طلبك.`,
    orderSavedNoWhatsapp: reference => `تم حفظ الطلب ${reference}، لكن رقم واتساب المتجر غير متوفر. تواصل مع صاحب المتجر.`,
    orderError: "تعذّر حفظ طلبك. حاول مرة أخرى.",
    whatsappFailed: "تم حفظ طلبك، لكن تعذّر فتح واتساب. استخدم الرابط أدناه أو تواصل مع المتجر.",
    whatsappUnavailable: "واتساب غير متاح على هذا الجهاز. تواصل مع المتجر واذكر رقم الطلب.",
    openWhatsapp: "افتح واتساب لإرسال الطلب",
    whatsappGreeting: "مرحباً Auvne، أرغب في إتمام هذا الطلب.",
    orderName: "الاسم",
    orderPhone: "الهاتف",
    orderSelection: "اختياراتي:",
    orderTotal: "الإجمالي",
    languageLabel: "Switch language to English",
    languageButton: "English",
    heroImageAlt: "نظارات Auvne",
    storyImageAlt: "مجموعة مختارة بعناية من النظارات"
  }
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
let language = readLanguage();
const productGrid = document.getElementById("product-grid");
const productDetail = document.getElementById("product-detail");
const drawer = document.getElementById("cart-drawer");
const backdrop = document.getElementById("cart-backdrop");
const storeStatus = document.getElementById("store-status");
const landingSections = [...document.querySelectorAll("main > .hero, main > .collection, main > .story, main > .promise-strip")];

function formatPrice(price) {
  return `${settings.currency}${Number(price).toFixed(2)}`;
}

function readLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === "ar" ? "ar" : "en";
  } catch (error) {
    console.error("Could not read the saved Auvne language.", error);
    return "en";
  }
}

function localizedSetting(field) {
  return language === "ar" ? settings[`${field}Ar`] || ARABIC_DEFAULTS[field] || settings[field] : settings[field];
}

function localizedProduct(product, field) {
  return language === "ar" ? product[`${field}Ar`] || product[field] : product[field];
}

function normalizeWhatsapp(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length === 13 && digits[2] === "0") digits = `20${digits.slice(3)}`;
  return digits;
}

function applyLanguage() {
  const text = UI_TEXT[language];
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.title = text.pageTitle;
  document.querySelector(".main-nav").setAttribute("aria-label", text.navigation);
  document.getElementById("language-toggle").textContent = text.languageButton;
  document.getElementById("language-toggle").setAttribute("aria-label", text.languageLabel);
  document.getElementById("cart-trigger-label").textContent = text.bag;
  document.getElementById("cart-trigger").setAttribute("aria-label", text.openBag);
  document.getElementById("cart-drawer").setAttribute("aria-label", text.bag);
  document.getElementById("cart-eyebrow").textContent = text.cartEyebrow;
  document.getElementById("cart-title").textContent = text.cartTitle;
  document.getElementById("close-cart").setAttribute("aria-label", text.closeBag);
  document.getElementById("cart-empty-message").textContent = text.emptyBag;
  document.getElementById("empty-shop-link").textContent = text.findFrames;
  document.getElementById("subtotal-label").textContent = text.subtotal;
  document.getElementById("customer-name-label").textContent = text.customerName;
  document.getElementById("customer-name").placeholder = text.namePlaceholder;
  document.getElementById("customer-phone-label").textContent = text.customerPhone;
  document.getElementById("customer-phone").placeholder = text.phonePlaceholder;
  document.querySelector("#checkout-button-label span").textContent = localizedSetting("checkoutButton");
  document.getElementById("hero-image").alt = text.heroImageAlt;
  document.getElementById("story-image").alt = text.storyImageAlt;
  renderStorefront();
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
  const text = UI_TEXT[language];
  document.getElementById("announcement-bar").textContent = localizedSetting("announcement");
  document.getElementById("nav-shop").textContent = localizedSetting("navShop");
  document.getElementById("nav-story").textContent = localizedSetting("navStory");
  document.getElementById("nav-contact").textContent = localizedSetting("navContact");
  document.getElementById("hero-eyebrow").textContent = localizedSetting("eyebrow");
  document.getElementById("hero-title").textContent = localizedSetting("title");
  document.getElementById("hero-description").textContent = localizedSetting("description");
  document.getElementById("hero-cta").textContent = localizedSetting("heroCta");
  document.getElementById("hero-note").textContent = localizedSetting("heroNote");
  document.getElementById("hero-caption").textContent = localizedSetting("heroCaption");
  document.getElementById("hero-roundel").textContent = localizedSetting("heroRoundel");
  document.getElementById("collection-eyebrow").textContent = localizedSetting("collectionEyebrow");
  document.getElementById("collection-title").textContent = localizedSetting("collectionTitle");
  document.getElementById("collection-intro").textContent = localizedSetting("collectionIntro");
  document.getElementById("collection-label").textContent = localizedSetting("collectionLabel");
  document.getElementById("story-eyebrow").textContent = localizedSetting("storyEyebrow");
  document.getElementById("story-title").textContent = localizedSetting("storyTitle");
  document.getElementById("story-description").textContent = localizedSetting("storyDescription");
  setImage(document.getElementById("story-image"), settings.storyImage);
  document.getElementById("story-stamp").textContent = localizedSetting("storyStamp");
  document.getElementById("story-cta").textContent = localizedSetting("storyCta");
  document.getElementById("promise-one").textContent = localizedSetting("promiseOne");
  document.getElementById("promise-two").textContent = localizedSetting("promiseTwo");
  document.getElementById("promise-three").textContent = localizedSetting("promiseThree");
  setImage(document.getElementById("hero-image"), settings.heroImage);
  document.getElementById("footer-message").textContent = localizedSetting("footerMessage");
  document.getElementById("footer-whatsapp-label").textContent = localizedSetting("footerWhatsappLabel");
  document.getElementById("checkout-note").textContent = localizedSetting("checkoutNote");
  document.querySelector("#checkout-button-label span").textContent = localizedSetting("checkoutButton");
  document.getElementById("footer-year").textContent = new Date().getFullYear();
  const whatsappLink = document.getElementById("footer-whatsapp");
  const whatsapp = normalizeWhatsapp(settings.whatsapp);
  whatsappLink.href = whatsapp ? `https://wa.me/${whatsapp}` : "#collection";
  whatsappLink.onclick = whatsapp ? null : event => event.preventDefault();
  document.getElementById("product-total").textContent = `${String(products.length).padStart(2, "0")} ${products.length === 1 ? text.piece : text.pieces}`;
  renderProducts();
  renderProductDetail();
  renderCart();
}

function loadStorefront() {
  if (!db) {
    console.error("Auvne storefront connection is unavailable.", firebaseConfigError);
    showStoreError(UI_TEXT[language].storeConnect);
    return;
  }
  const handleError = error => {
    console.error("Could not load the Auvne storefront.", error);
    showStoreError(UI_TEXT[language].storeConnect);
  };
  onSnapshot(doc(db, "store_settings", "main"), snapshot => {
    if (snapshot.exists()) {
      settings = { ...DEFAULT_SETTINGS, ...snapshot.data() };
      settings.whatsapp = normalizeWhatsapp(settings.whatsapp) || DEFAULT_SETTINGS.whatsapp;
    }
    renderStorefront();
  }, handleError);
  onSnapshot(query(collection(db, "products"), where("active", "==", true)), snapshot => {
    products = snapshot.docs
      .map(product => ({ id: product.id, ...product.data() }))
      .sort((first, second) => (first.createdAt?.seconds || 0) - (second.createdAt?.seconds || 0));
    productsLoaded = true;
    renderProducts();
    renderProductDetail();
    renderCart();
  }, handleError);
}

function renderProducts() {
  const text = UI_TEXT[language];
  productGrid.replaceChildren();
  if (products.length === 0) {
    productGrid.append(makeElement("p", "empty-products", UI_TEXT[language].emptyProducts));
    return;
  }
  for (const product of products) {
    const card = makeElement("article", "product-card");
    const detailUrl = `#product/${encodeURIComponent(product.id)}`;
    const photo = makeElement("a", "product-photo");
    photo.href = detailUrl;
    photo.setAttribute("aria-label", text.viewDetails(localizedProduct(product, "name")));
    const image = document.createElement("img");
    image.alt = localizedProduct(product, "name");
    image.loading = "lazy";
    setImage(image, product.image);
    photo.append(image);
    if (product.featured) photo.append(makeElement("span", "product-tag", localizedSetting("featuredBadge")));
    const addButton = makeElement("button", "quick-add", text.addToBag);
    addButton.type = "button";
    addButton.addEventListener("click", () => {
      if (!changeQuantity(product.id, 1)) return;
      addButton.textContent = text.addedToBag;
      window.setTimeout(() => {
        if (addButton.isConnected) addButton.textContent = UI_TEXT[language].addToBag;
      }, 1800);
    });
    const info = makeElement("div", "product-info");
    const line = makeElement("div", "product-name-line");
    const nameLink = makeElement("a", "product-name-link");
    nameLink.href = detailUrl;
    nameLink.append(makeElement("h3", "product-name", localizedProduct(product, "name")));
    line.append(nameLink, makeElement("span", "product-price", formatPrice(product.price)));
    info.append(line, makeElement("p", "product-category", localizedProduct(product, "category")));
    if (localizedProduct(product, "description")) info.append(makeElement("p", "product-description", localizedProduct(product, "description")));
    card.append(photo, addButton, info);
    productGrid.append(card);
  }
}

function productRouteId() {
  const match = window.location.hash.match(/^#product\/(.+)$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch (error) {
    console.error("Could not read the Auvne product link.", error);
    return null;
  }
}

function productImages(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  const normalized = images.map(image => typeof image === "string"
    ? { url: image, color: "", position: "" }
    : {
      url: image?.url || image?.image || "",
      color: image?.color || image?.name || "",
      position: image?.position || image?.view || ""
    }).filter(image => image.url);
  if (normalized.length) return normalized;

  const variants = Array.isArray(product.colors) ? product.colors : Array.isArray(product.variants) ? product.variants : [];
  const variantImages = variants.map(variant => {
    if (!variant || typeof variant !== "object") return null;
    return {
      url: variant.image || variant.imageUrl || variant.photo || "",
      color: language === "ar"
        ? variant.nameAr || variant.colorAr || variant.name || variant.color || ""
        : variant.name || variant.color || variant.nameAr || variant.colorAr || "",
      position: variant.position || variant.view || ""
    };
  }).filter(image => image?.url);
  if (variantImages.length) return variantImages;

  if (product.image) normalized.push({ url: product.image, color: "", position: "" });
  return normalized;
}

function renderProductDetail() {
  const routeId = productRouteId();
  const product = products.find(candidate => candidate.id === routeId);
  const showingDetail = Boolean(routeId && product);
  landingSections.forEach(section => { section.hidden = showingDetail; });
  productDetail.hidden = !showingDetail;
  productDetail.replaceChildren();
  if (!showingDetail) return;

  const text = UI_TEXT[language];
  const backLink = makeElement("a", "detail-back", text.backToCollection);
  backLink.href = "#collection";
  const layout = makeElement("div", "detail-layout");
  const gallery = makeElement("div", "detail-gallery");
  const image = document.createElement("img");
  image.className = "detail-image";
  const thumbnails = makeElement("div", "detail-thumbnails");
  const galleryImages = productImages(product);
  let activeColor = "";
  let activeGalleryImages = galleryImages;
  const showGalleryImage = (galleryImage, selectedButton) => {
    setImage(image, galleryImage.url);
    image.alt = [localizedProduct(product, "name"), galleryImage.color, galleryImage.position].filter(Boolean).join(" — ");
    thumbnails.querySelectorAll(".detail-thumbnail").forEach(button => button.setAttribute("aria-pressed", "false"));
    selectedButton.setAttribute("aria-pressed", "true");
  };
  if (galleryImages.length) {
    setImage(image, galleryImages[0].url);
    image.alt = [localizedProduct(product, "name"), galleryImages[0].color, galleryImages[0].position].filter(Boolean).join(" — ");
  } else {
    setImage(image, product.image);
    image.alt = localizedProduct(product, "name");
  }
  gallery.append(image);
  if (galleryImages.length > 1) {
    galleryImages.forEach((galleryImage, index) => {
      const thumbnail = makeElement("button", "detail-thumbnail");
      thumbnail.type = "button";
      thumbnail.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      const thumbImage = document.createElement("img");
      thumbImage.alt = "";
      setImage(thumbImage, galleryImage.url);
      thumbnail.append(thumbImage);
      thumbnail.title = [galleryImage.color, galleryImage.position].filter(Boolean).join(" — ") || `Photo ${index + 1}`;
      thumbnail.setAttribute("aria-label", thumbnail.title);
      thumbnail.addEventListener("click", () => showGalleryImage(galleryImage, thumbnail));
      thumbnails.append(thumbnail);
    });
    gallery.append(thumbnails);
  }

  const info = makeElement("div", "detail-info");
  info.append(
    makeElement("p", "eyebrow", localizedProduct(product, "category")),
    makeElement("h1", "detail-name", localizedProduct(product, "name")),
    makeElement("p", "detail-price", formatPrice(product.price))
  );
  const rating = Number(product.rating ?? product.averageRating);
  const reviewCount = Number(product.reviewCount ?? product.ratingsCount ?? product.reviewsCount);
  const ratingRow = makeElement("div", "product-rating");
  if (Number.isFinite(rating) && rating >= 0 && rating <= 5) {
    const roundedRating = Math.round(rating);
    const stars = makeElement("span", "rating-stars", `${"★".repeat(roundedRating)}${"☆".repeat(5 - roundedRating)}`);
    stars.setAttribute("aria-hidden", "true");
    ratingRow.append(stars, makeElement("span", "rating-value", text.ratingOutOf(rating.toFixed(1))));
    if (Number.isInteger(reviewCount) && reviewCount > 0) ratingRow.append(makeElement("span", "rating-count", text.ratingCount(reviewCount)));
    ratingRow.setAttribute("aria-label", text.ratingOutOf(rating.toFixed(1)));
  } else {
    ratingRow.append(makeElement("span", "rating-empty", text.noRating));
  }
  info.append(ratingRow);
  if (localizedProduct(product, "description")) info.append(makeElement("p", "detail-description", localizedProduct(product, "description")));

  const colors = [...new Set(galleryImages.map(galleryImage => galleryImage.color).filter(Boolean))];
  if (colors.length > 1) {
    const colorSection = makeElement("div", "detail-colors");
    colorSection.append(makeElement("p", "detail-colors-label", text.availableColors));
    const colorOptions = makeElement("div", "color-options");
    colors.forEach((color, index) => {
      const colorButton = makeElement("button", "color-option");
      colorButton.type = "button";
      colorButton.setAttribute("aria-label", color);
      colorButton.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      colorButton.title = color;
      colorButton.textContent = color;
      colorButton.addEventListener("click", () => {
        activeColor = color;
        activeGalleryImages = galleryImages.filter(galleryImage => galleryImage.color === color);
        colorOptions.querySelectorAll(".color-option").forEach(button => button.setAttribute("aria-pressed", "false"));
        colorButton.setAttribute("aria-pressed", "true");
        const firstImageIndex = galleryImages.indexOf(activeGalleryImages[0]);
        thumbnails.querySelectorAll(".detail-thumbnail").forEach((button, thumbnailIndex) => {
          button.hidden = galleryImages[thumbnailIndex].color !== color;
          if (thumbnailIndex === firstImageIndex) showGalleryImage(activeGalleryImages[0], button);
        });
        if (!thumbnails.childElementCount) {
          const firstImage = activeGalleryImages[0];
          setImage(image, firstImage.url);
          image.alt = [localizedProduct(product, "name"), firstImage.color, firstImage.position].filter(Boolean).join(" — ");
        }
      });
      colorOptions.append(colorButton);
      if (index === 0) {
        activeColor = color;
        activeGalleryImages = galleryImages.filter(galleryImage => galleryImage.color === color);
      }
    });
    if (colors.length > 1 && thumbnails.childElementCount) {
      thumbnails.querySelectorAll(".detail-thumbnail").forEach((button, thumbnailIndex) => {
        button.hidden = galleryImages[thumbnailIndex].color !== activeColor;
      });
    }
    if (colorOptions.childElementCount) colorSection.append(colorOptions);
    if (colorOptions.childElementCount) info.append(colorSection);
  }

  const addButton = makeElement("button", "button button-dark detail-add", text.addToBag);
  addButton.type = "button";
  addButton.addEventListener("click", () => {
    if (!changeQuantity(product.id, 1)) return;
    addButton.textContent = text.addedToBag;
    window.setTimeout(() => {
      if (addButton.isConnected) addButton.textContent = UI_TEXT[language].addToBag;
    }, 1800);
  });
  info.append(addButton);
  layout.append(gallery, info);
  productDetail.append(backLink, layout);
}

function persistCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error("Could not save the shopping bag.", error);
    showStoreError(UI_TEXT[language].storageError);
  }
}

function changeQuantity(id, amount) {
  const current = cart.find(item => item.id === id);
  if (current && current.quantity + amount > 20) {
    showStoreError(UI_TEXT[language].quantityLimit);
    return false;
  }
  if (!current && amount > 0 && cart.length >= 10) {
    showStoreError(UI_TEXT[language].frameLimit);
    return false;
  }
  if (current) current.quantity += amount;
  else if (amount > 0) cart.push({ id, quantity: amount });
  cart = cart.filter(item => item.quantity > 0);
  persistCart();
  renderCart();
  return true;
}

function renderCart() {
  const text = UI_TEXT[language];
  if (productsLoaded) {
    cart = cart.filter(item => products.some(product => product.id === item.id));
    persistCart();
  }
  const totalCount = cart.reduce((sum, item) => (
    products.some(product => product.id === item.id) ? sum + item.quantity : sum
  ), 0);
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
    const productName = localizedProduct(product, "name");
    description.append(makeElement("h3", "cart-line-name", productName), makeElement("p", "cart-line-category", localizedProduct(product, "category")));
    const controls = makeElement("div", "quantity-controls");
    const minus = makeElement("button", "", "−");
    minus.type = "button";
    minus.setAttribute("aria-label", text.removeOne(productName));
    minus.addEventListener("click", () => changeQuantity(product.id, -1));
    const quantity = makeElement("span", "", item.quantity);
    const plus = makeElement("button", "", "+");
    plus.type = "button";
    plus.setAttribute("aria-label", text.addOne(productName));
    plus.addEventListener("click", () => changeQuantity(product.id, 1));
    controls.append(minus, quantity, plus);
    description.append(controls);
    const remove = makeElement("button", "remove-item", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", text.removeItem(productName));
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

window.addEventListener("hashchange", () => {
  renderProductDetail();
  if (productRouteId()) window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("language-toggle").addEventListener("click", () => {
  language = language === "en" ? "ar" : "en";
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error("Could not save the selected Auvne language.", error);
  }
  document.getElementById("checkout-status").hidden = true;
  applyLanguage();
});

function showCheckoutStatus(message, whatsappUrl = "") {
  const status = document.getElementById("checkout-status");
  status.replaceChildren(document.createTextNode(message));
  if (whatsappUrl) {
    const link = document.createElement("a");
    link.href = whatsappUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = UI_TEXT[language].openWhatsapp;
    status.append(document.createElement("br"), link);
  }
  status.hidden = false;
}

document.getElementById("checkout-form").addEventListener("submit", async event => {
  event.preventDefault();
  const text = UI_TEXT[language];
  if (!db || !productsLoaded || cart.length === 0) {
    showStoreError(text.checkoutNotReady);
    return;
  }
  if (cart.length > 10) {
    showStoreError(text.moreThanTen);
    return;
  }
  const form = new FormData(event.currentTarget);
  const name = String(form.get("name")).trim();
  const phone = String(form.get("phone")).trim();
  if (!name || !phone) {
    showStoreError(text.validCustomer);
    return;
  }
  const whatsapp = normalizeWhatsapp(settings.whatsapp);
  const whatsappTab = whatsapp ? window.open("about:blank", "_blank") : null;
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  let orderReference;
  let message;
  try {
    const items = cart.map(item => {
      const product = products.find(candidate => candidate.id === item.id);
      if (!product || product.active !== true) throw new Error(text.productUnavailable);
      return {
        id: product.id,
        name: product.name,
        nameAr: product.nameAr || product.name,
        priceCents: Math.round(Number(product.price) * 100),
        quantity: item.quantity
      };
    });
    const totalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    const orderId = doc(collection(db, "orders")).id;
    orderReference = `AUV-${orderId.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
    await setDoc(doc(db, "orders", orderId), {
      reference: orderReference,
      customerName: name,
      customerPhone: phone,
      items,
      totalCents,
      status: "new",
      createdAt: serverTimestamp()
    });
    message = [
      text.whatsappGreeting,
      `${text.orderName}: ${name}`,
      `${text.orderPhone}: ${phone}`,
      "",
      text.orderSelection,
      ...items.map(item => `• ${language === "ar" ? item.nameAr : item.name} × ${item.quantity} — ${formatPrice(item.priceCents / 100 * item.quantity)}`),
      "",
      `${text.orderTotal}: ${formatPrice(totalCents / 100)}`,
      `${text.orderReference}: ${orderReference}`
    ].join("\n");
  } catch (error) {
    console.error("Could not place the Auvne order.", error);
    if (whatsappTab) whatsappTab.close();
    showStoreError(text.orderError);
    return;
  } finally {
    submitButton.disabled = false;
  }

  cart = [];
  persistCart();
  renderCart();

  if (!whatsapp) {
    showCheckoutStatus(text.orderSavedNoWhatsapp(orderReference));
    return;
  }

  const whatsappUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
  if (whatsappTab) {
    try {
      whatsappTab.location.replace(whatsappUrl);
      showCheckoutStatus(text.orderSaved(orderReference));
    } catch (error) {
      console.error("Could not open WhatsApp for the saved Auvne order.", error);
      whatsappTab.close();
      showCheckoutStatus(text.whatsappFailed, whatsappUrl);
    }
  } else {
    showCheckoutStatus(text.whatsappFailed, whatsappUrl);
  }
});

applyLanguage();
loadStorefront();
