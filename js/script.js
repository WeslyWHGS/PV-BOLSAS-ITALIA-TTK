const DEFAULT_CONFIG = {
  links: {
    checkoutPrincipal: "#offre",
    checkoutBasico: "#offre",
    checkoutVip: "#offre"
  },
  pricing: {
    enabled: true,
    currency: "EUR",
    plans: {
      basico: { sale: "10 €" },
      completo: { sale: "15 €", diff: "5 €" }
    }
  },
  socialProofNotifications: {
    enabled: false,
    firstDelaySeconds: 8,
    intervalSeconds: 22,
    visibleSeconds: 6,
    notifications: [],
    messages: []
  },
  timer: { enabled: false, mode: "endOfDay" },
  tracking: {
    googleTag: { enabled: false, id: "" },
    trackCheckoutClicks: true
  }
};

const SITE_CONFIG = mergeConfig(DEFAULT_CONFIG, window.SITE_CONFIG || {});
const SITE_CONTENT = window.SITE_CONTENT || {};

function mergeConfig(base, custom) {
  const output = { ...base };
  Object.keys(custom).forEach((key) => {
    if (custom[key] && typeof custom[key] === "object" && !Array.isArray(custom[key])) {
      output[key] = mergeConfig(base[key] || {}, custom[key]);
    } else {
      output[key] = custom[key];
    }
  });
  return output;
}

function setText(selector, value) {
  if (!value) return;
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

function getByPath(object, path) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), object);
}

function splitPrice(value) {
  const clean = String(value || "").trim();
  const match = clean.match(/^([^\d-]*)(\d+)(?:[,.](\d{1,2}))?\s*([^\d]*)$/);
  if (!match) return { whole: clean, cents: "", symbol: "" };
  return {
    prefix: match[1].trim(),
    whole: match[2],
    cents: match[3] || "",
    symbol: match[4].trim()
  };
}

function renderPrice(element, value) {
  const price = splitPrice(value);
  const prefix = price.prefix ? `<span class="price-prefix">${price.prefix}</span>` : "";
  const cents = price.cents ? `<span class="price-cents">,${price.cents.padEnd(2, "0")}</span>` : "";
  const symbol = price.symbol ? `<span class="price-symbol price-symbol-after">${price.symbol}</span>` : "";
  element.innerHTML = `${prefix}<span class="price-whole">${price.whole}</span>${cents}${symbol}<span class="price-tax-inline">+ IVA applicabile</span>`;
}

function applyPricing() {
  if (!SITE_CONFIG.pricing?.enabled) return;
  const plans = SITE_CONFIG.pricing.plans || {};

  document.querySelectorAll("[data-price-text]").forEach((element) => {
    const value = getByPath(plans, element.dataset.priceText);
    if (value) element.textContent = value;
  });

  document.querySelectorAll("[data-price-display]").forEach((element) => {
    const value = getByPath(plans, element.dataset.priceDisplay);
    if (value) renderPrice(element, value);
  });
}

function mergeTrackingParams(url) {
  if (!url || url === "#offre" || !/^https?:\/\//i.test(url)) return url;
  const currentParams = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src", "sck", "fbclid", "gclid", "ttclid"];

  try {
    const checkoutUrl = new URL(url);
    keys.forEach((key) => {
      const value = currentParams.get(key);
      if (value && !checkoutUrl.searchParams.has(key)) checkoutUrl.searchParams.set(key, value);
    });
    return checkoutUrl.toString();
  } catch (error) {
    return url;
  }
}

function applyContent() {
  setText("[data-content='hero.barra']", SITE_CONTENT.hero?.barra);
  setText("[data-content='hero.badge']", SITE_CONTENT.hero?.badge);
  setText("[data-content='hero.headline']", SITE_CONTENT.hero?.headline);
  setText("[data-content='hero.subheadline']", SITE_CONTENT.hero?.subheadline);
  setText("[data-content='hero.descripcion']", SITE_CONTENT.hero?.descripcion);
  setText("[data-content='hero.cta']", SITE_CONTENT.hero?.cta);
  setText("[data-content='hero.nota']", SITE_CONTENT.hero?.nota);
  setText("[data-content='oferta.titulo']", SITE_CONTENT.oferta?.titulo);
  setText("[data-content='oferta.subtitulo']", SITE_CONTENT.oferta?.subtitulo);
  setText("[data-content='oferta.avisoHotmart']", SITE_CONTENT.oferta?.avisoHotmart);
  setText("[data-content='garantia.titulo']", SITE_CONTENT.garantia?.titulo);
  setText("[data-content='garantia.texto']", SITE_CONTENT.garantia?.texto);
}

function isPlaceholderLink(url) {
  return !url || url === "#" || url === "#offre";
}

function applyCheckoutLinks() {
  const links = SITE_CONFIG.links || {};
  const groups = [
    [".js-cta", links.checkoutPrincipal, "Collezione"],
    [".js-basic-checkout", links.checkoutBasico, "Pacchetto Essenziale"],
    [".js-vip-checkout", links.checkoutVip, "Pacchetto Completo"]
  ];

  groups.forEach(([selector, url, plan]) => {
    document.querySelectorAll(selector).forEach((link) => {
      const finalUrl = isPlaceholderLink(url) ? "#offre" : mergeTrackingParams(url);
      link.setAttribute("href", finalUrl);
      link.addEventListener("click", () => trackCheckoutClick(plan));
    });
  });
}

function trackCheckoutClick(planName) {
  if (!SITE_CONFIG.tracking?.trackCheckoutClicks) return;
  window.dispatchEvent(new CustomEvent("checkoutClick", {
    detail: { planName }
  }));
}

function setupGoogleTag() {
  const tag = SITE_CONFIG.tracking?.googleTag;
  if (!tag?.enabled || !tag.id) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tag.id)}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", tag.id);
}

function formatToday(date) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function updateDates() {
  const today = formatToday(new Date());
  document.querySelectorAll(".js-today").forEach((element) => {
    element.textContent = today;
  });
}

function updateCountdown() {
  if (!SITE_CONFIG.timer?.enabled) return;
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const totalSeconds = Math.max(0, Math.floor((endOfDay - now) / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  setText(".js-hours", hours);
  setText(".js-minutes", minutes);
  setText(".js-seconds", seconds);
}

function setupFaq() {
  document.querySelectorAll(".faq-question").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      document.querySelectorAll(".faq-item").forEach((faq) => {
        if (faq !== item) faq.classList.remove("active");
      });
      item.classList.toggle("active");
    });
  });
}

function setupMissingImages() {
  document.querySelectorAll(".image-shell img").forEach((image) => {
    const markMissing = () => {
      const shell = image.closest(".image-shell");
      if (shell) shell.classList.add("is-missing");
    };
    image.addEventListener("error", markMissing);
    if (image.complete && image.naturalWidth === 0) markMissing();
  });
}

function setupYear() {
  setText(".js-year", String(new Date().getFullYear()));
}

function setupSocialProofNotifications() {
  const config = SITE_CONFIG.socialProofNotifications;
  const toast = document.getElementById("proofToast");
  const notifications = Array.isArray(config.notifications) && config.notifications.length > 0
    ? config.notifications
    : config.messages;
  if (!config?.enabled || !toast || !Array.isArray(notifications) || notifications.length === 0) return;

  const title = toast.querySelector(".proof-toast-title");
  const text = toast.querySelector(".proof-toast-text");
  let index = 0;
  let timerId;

  const secondsToMs = (seconds, fallbackMs) => {
    const value = Number(seconds);
    return Number.isFinite(value) && value > 0 ? value * 1000 : fallbackMs;
  };

  const intervalDelay = () => {
    if (config.intervalSeconds) return secondsToMs(config.intervalSeconds, 22000);
    const min = Number(config.minDelayMs) || 17000;
    const max = Number(config.maxDelayMs) || 28000;
    return Math.floor(min + Math.random() * Math.max(0, max - min));
  };

  const randomNumber = (message) => {
    const min = Number(message.minNumber) || 100;
    const max = Number(message.maxNumber) || min;
    return Math.floor(min + Math.random() * Math.max(1, max - min + 1));
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat("it-IT").format(number);
  };

  const renderMessageText = (message) => {
    const template = message.text || "";
    return template.replaceAll("{numero}", formatNumber(randomNumber(message)));
  };

  const hide = () => {
    toast.classList.remove("is-visible");
    timerId = window.setTimeout(show, intervalDelay());
  };

  const show = () => {
    const message = notifications[index % notifications.length];
    index += 1;
    if (title) title.textContent = message.title || "";
    if (text) text.textContent = renderMessageText(message);
    toast.hidden = false;
    window.requestAnimationFrame(() => toast.classList.add("is-visible"));
    timerId = window.setTimeout(hide, secondsToMs(config.visibleSeconds, Number(config.visibleMs) || 5200));
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && timerId) window.clearTimeout(timerId);
    if (!document.hidden && !toast.classList.contains("is-visible")) {
      timerId = window.setTimeout(show, intervalDelay());
    }
  });

  timerId = window.setTimeout(show, secondsToMs(config.firstDelaySeconds, Number(config.firstDelayMs) || 6500));
}

applyContent();
applyPricing();
applyCheckoutLinks();
setupGoogleTag();
updateDates();
setupFaq();
setupMissingImages();
setupYear();
setupSocialProofNotifications();
updateCountdown();
setInterval(updateCountdown, 1000);
