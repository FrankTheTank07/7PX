const menuButton = document.querySelector("#menuButton");
const closeButton = document.querySelector("#closeButton");
const drawer = document.querySelector("#siteDrawer");
const scrim = document.querySelector("#scrim");
const navLinks = document.querySelectorAll(".drawer-nav a");
const refreshButton = document.querySelector("#refreshButton");

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

async function refreshSiteFiles() {
  refreshButton.disabled = true;
  refreshButton.textContent = "Updating";

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.update()));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("7px-hub-")).map((key) => caches.delete(key)));
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("refresh", String(Date.now()));
  window.location.replace(nextUrl.toString());
}

refreshButton.addEventListener("click", () => {
  refreshSiteFiles().catch(() => {
    window.location.reload();
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setDrawer(false);
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
