const menuButton = document.querySelector("#menuButton");
const closeButton = document.querySelector("#closeButton");
const drawer = document.querySelector("#siteDrawer");
const scrim = document.querySelector("#scrim");
const navLinks = document.querySelectorAll(".drawer-nav a");

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
