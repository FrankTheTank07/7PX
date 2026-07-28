const menuButton = document.querySelector("#menuButton");
const closeButton = document.querySelector("#closeButton");
const drawer = document.querySelector("#siteDrawer");
const scrim = document.querySelector("#scrim");
const navLinks = document.querySelectorAll(".drawer-nav a");
const refreshButton = document.querySelector("#refreshButton");
const pullRefreshIndicator = document.querySelector("#pullRefreshIndicator");
const imageButtons = document.querySelectorAll(".image-preview-button");
const imageLightbox = document.querySelector("#imageLightbox");
const lightboxImage = document.querySelector("#lightboxImage");
const lightboxClose = document.querySelector("#lightboxClose");
const collapsibleSections = document.querySelectorAll(".collapsible-section");
let touchStartY = 0;
let pullDistance = 0;
let pullReady = false;
let refreshing = false;

function setDrawer(open) {
  drawer.classList.toggle("open", open);
  drawer.setAttribute("aria-hidden", String(!open));
  menuButton.setAttribute("aria-expanded", String(open));
  scrim.hidden = !open;
  document.body.style.overflow = open ? "hidden" : "";
}

menuButton.addEventListener("click", () => setDrawer(true));
closeButton.addEventListener("click", () => setDrawer(false));
scrim.addEventListener("click", () => setDrawer(false));
navLinks.forEach((link) => link.addEventListener("click", () => setDrawer(false)));

function setSectionOpen(section, open) {
  const trigger = section.querySelector(".collapsible-trigger");
  const content = section.querySelector(".collapsible-content");

  if (!trigger || !content) {
    return;
  }

  trigger.setAttribute("aria-expanded", String(open));
  section.classList.toggle("is-collapsed", !open);
  content.hidden = !open;
}

function openLinkedSection(hash) {
  if (!hash) {
    return;
  }

  const section = document.querySelector(hash);
  if (section?.classList.contains("collapsible-section")) {
    setSectionOpen(section, true);
  }
}

collapsibleSections.forEach((section) => {
  const trigger = section.querySelector(".collapsible-trigger");

  trigger?.addEventListener("click", () => {
    const isOpen = trigger.getAttribute("aria-expanded") === "true";
    setSectionOpen(section, !isOpen);
  });
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => openLinkedSection(link.hash));
});

window.addEventListener("hashchange", () => openLinkedSection(window.location.hash));
openLinkedSection(window.location.hash);

function closeLightbox() {
  imageLightbox.classList.remove("open");
  imageLightbox.setAttribute("aria-hidden", "true");
  lightboxImage.removeAttribute("src");
  lightboxImage.alt = "";
  document.body.style.overflow = "";
}

imageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    lightboxImage.src = button.dataset.fullImage;
    lightboxImage.alt = button.dataset.fullAlt || "";
    imageLightbox.classList.add("open");
    imageLightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });
});

lightboxClose.addEventListener("click", closeLightbox);
imageLightbox.addEventListener("click", (event) => {
  if (event.target === imageLightbox) {
    closeLightbox();
  }
});

async function refreshSiteFiles() {
  if (refreshing) {
    return;
  }

  refreshing = true;
  refreshButton.disabled = true;
  refreshButton.textContent = "Updating";
  pullRefreshIndicator.textContent = "Refreshing";
  pullRefreshIndicator.classList.add("visible");

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  const nextUrl = new URL(window.location.origin + window.location.pathname);
  nextUrl.searchParams.set("refresh", String(Date.now()));
  nextUrl.hash = window.location.hash;
  window.location.replace(nextUrl.toString());
}

refreshButton.addEventListener("click", () => {
  refreshSiteFiles().catch(() => {
    window.location.reload();
  });
});

window.addEventListener(
  "touchstart",
  (event) => {
    if (window.scrollY === 0 && !refreshing) {
      touchStartY = event.touches[0].clientY;
      pullDistance = 0;
      pullReady = false;
    }
  },
  { passive: true }
);

window.addEventListener(
  "touchmove",
  (event) => {
    if (window.scrollY !== 0 || refreshing || touchStartY === 0) {
      return;
    }

    pullDistance = event.touches[0].clientY - touchStartY;
    if (pullDistance > 36) {
      pullRefreshIndicator.textContent = pullDistance > 86 ? "Release to refresh" : "Pull to refresh";
      pullRefreshIndicator.classList.add("visible");
      pullReady = pullDistance > 86;
    }
  },
  { passive: true }
);

window.addEventListener("touchend", () => {
  if (pullReady && !refreshing) {
    refreshSiteFiles().catch(() => {
      window.location.reload();
    });
  } else {
    pullRefreshIndicator.classList.remove("visible");
  }

  touchStartY = 0;
  pullDistance = 0;
  pullReady = false;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (imageLightbox.classList.contains("open")) {
      closeLightbox();
    } else {
      setDrawer(false);
    }
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js?v=25").catch(() => {});
  });
}
