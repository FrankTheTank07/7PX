const menuButton = document.querySelector("#menuButton");
const closeButton = document.querySelector("#closeButton");
const drawer = document.querySelector("#siteDrawer");
const scrim = document.querySelector("#scrim");
const navLinks = document.querySelectorAll(".drawer-nav a");
const refreshButton = document.querySelector("#refreshButton");
const translateLink = document.querySelector("#translateLink");
const pullRefreshIndicator = document.querySelector("#pullRefreshIndicator");
const imageButtons = document.querySelectorAll(".image-preview-button");
const imageLightbox = document.querySelector("#imageLightbox");
const lightboxImage = document.querySelector("#lightboxImage");
const lightboxClose = document.querySelector("#lightboxClose");
const collapsibleSections = document.querySelectorAll(".collapsible-section");
const calendarWeek = document.querySelector("#calendarWeek");
const calendarRange = document.querySelector("#calendarRange");
const calendarStatus = document.querySelector("#calendarStatus");
const previousWeekButton = document.querySelector("#previousWeek");
const nextWeekButton = document.querySelector("#nextWeek");
const installHelpButton = document.querySelector("#installHelpButton");
const installModal = document.querySelector("#installModal");
const installClose = document.querySelector("#installClose");
const installPromptButton = document.querySelector("#installPromptButton");
let touchStartY = 0;
let pullDistance = 0;
let pullReady = false;
let refreshing = false;
let deferredInstallPrompt = null;
const siteUrl = window.location.origin + window.location.pathname;
const calendarId = "0e712efe8f4cba0226d855ee15e9e73da643302f5840cdcb26b30919007be98c@group.calendar.google.com";
const calendarApiKey = "AIzaSyBtujx3YQZ3ox4d7ndQNpJR5OWEDdMy_8Y";
const calendarTimeZone = "America/New_York";
const appleCalendarSubscribeUrl = `webcal://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
let visibleWeekStart = getWeekStart(new Date());
const translateLanguages = {
  en: { label: "Translate", target: "" },
  es: { label: "Traducir", target: "es" },
  pt: { label: "Traduzir", target: "pt" },
  ko: { label: "번역", target: "ko" },
  id: { label: "Terjemahkan", target: "id" }
};

function setTranslateLanguage() {
  if (!translateLink) {
    return;
  }

  const languageCode = (navigator.language || "en").toLowerCase().split("-")[0];
  const language = translateLanguages[languageCode] || translateLanguages.en;
  const translateUrl = new URL("https://translate.google.com/translate");

  translateUrl.searchParams.set("sl", "auto");
  if (language.target) {
    translateUrl.searchParams.set("tl", language.target);
  }
  translateUrl.searchParams.set("u", siteUrl);

  translateLink.textContent = language.label;
  translateLink.href = translateUrl.toString();
}

setTranslateLanguage();

function getWeekStart(date) {
  const start = new Date(date);
  const day = start.getDay();
  const daysSinceMonday = (day + 6) % 7;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateLabel(date, options) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: calendarTimeZone,
    ...options
  }).format(date);
}

function getEventStart(event) {
  return new Date(event.start.dateTime || `${event.start.date}T00:00:00`);
}

function getEventEnd(event) {
  return new Date(event.end.dateTime || `${event.end.date}T00:00:00`);
}

function escapeICSText(value = "") {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatICSDate(date, allDay) {
  if (allDay) {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
  }

  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildICSContent(event) {
  const allDay = Boolean(event.start.date);
  const start = getEventStart(event);
  const end = getEventEnd(event);
  const dateType = allDay ? ";VALUE=DATE" : "";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "METHOD:PUBLISH",
    "PRODID:-//7PX//Alliance Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@7px`,
    `DTSTAMP:${formatICSDate(new Date(), false)}`,
    `DTSTART${dateType}:${formatICSDate(start, allDay)}`,
    `DTEND${dateType}:${formatICSDate(end, allDay)}`,
    `SUMMARY:${escapeICSText(event.summary || "7PX Event")}`,
    event.description ? `DESCRIPTION:${escapeICSText(event.description)}` : "",
    event.location ? `LOCATION:${escapeICSText(event.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR"
  ].filter(Boolean).join("\r\n");
}

function buildICSLink(event) {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildICSContent(event))}`;
}

function getICSFilename(event) {
  const title = (event.summary || "7PX Event")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();

  return `${title || "7px-event"}.ics`;
}

async function openAppleCalendarFile(event) {
  const filename = getICSFilename(event);
  const blob = new Blob([buildICSContent(event)], { type: "text/calendar" });
  const objectUrl = URL.createObjectURL(blob);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) {
    window.location.href = objectUrl;
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    return;
  }

  if (typeof File === "function" && navigator.canShare && navigator.share) {
    const file = new File([blob], filename, { type: "text/calendar" });

    if (navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: event.summary || "7PX Event",
        files: [file]
      });
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return;
    }
  }

  const downloadLink = document.createElement("a");

  downloadLink.href = objectUrl;
  downloadLink.download = filename;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function buildGoogleEventLink(event) {
  const allDay = Boolean(event.start.date);
  const start = getEventStart(event);
  const end = getEventEnd(event);
  const dates = `${formatICSDate(start, allDay)}/${formatICSDate(end, allDay)}`;
  const url = new URL("https://calendar.google.com/calendar/render");

  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", event.summary || "7PX Event");
  url.searchParams.set("dates", dates);
  url.searchParams.set("details", event.description || "");
  url.searchParams.set("location", event.location || "");
  url.searchParams.set("ctz", calendarTimeZone);
  return url.toString();
}

function formatEventTime(event) {
  if (event.start.date) {
    return "All day";
  }

  const start = getEventStart(event);
  const end = getEventEnd(event);
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone: calendarTimeZone,
    hour: "numeric",
    minute: "2-digit"
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function renderCalendar(events) {
  if (!calendarWeek || !calendarRange) {
    return;
  }

  const weekEnd = addDays(visibleWeekStart, 6);
  calendarRange.textContent = `${formatDateLabel(visibleWeekStart, { month: "short", day: "numeric" })} - ${formatDateLabel(weekEnd, { month: "short", day: "numeric" })}`;
  calendarWeek.textContent = "";

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const day = addDays(visibleWeekStart, dayIndex);
    const nextDay = addDays(day, 1);
    const dayEvents = events.filter((event) => {
      const start = getEventStart(event);
      return start >= day && start < nextDay;
    });
    const dayCard = document.createElement("section");
    const header = document.createElement("div");
    const eventList = document.createElement("div");

    dayCard.className = "calendar-day";
    header.className = "calendar-day-header";
    eventList.className = "calendar-event-list";
    header.innerHTML = `<strong>${formatDateLabel(day, { weekday: "long" })}</strong><span>${formatDateLabel(day, { month: "short", day: "numeric" })}</span>`;

    if (dayEvents.length === 0) {
      const empty = document.createElement("p");
      empty.className = "calendar-empty";
      empty.textContent = "No events scheduled.";
      eventList.append(empty);
    } else {
      dayEvents.forEach((event) => {
        const eventCard = document.createElement("article");
        const title = document.createElement("h3");
        const time = document.createElement("div");
        const actions = document.createElement("div");
        const googleLink = document.createElement("a");

        eventCard.className = "calendar-event";
        time.className = "calendar-event-time";
        actions.className = "calendar-event-actions";
        title.textContent = event.summary || "7PX Event";
        time.textContent = formatEventTime(event);
        googleLink.href = buildGoogleEventLink(event);
        googleLink.target = "_blank";
        googleLink.rel = "noopener";
        googleLink.textContent = "Add to Google";
        actions.append(googleLink);
        eventCard.append(title, time);

        if (event.description) {
          const description = document.createElement("p");
          description.className = "calendar-event-description";
          description.textContent = event.description;
          eventCard.append(description);
        }

        eventCard.append(actions);
        eventList.append(eventCard);
      });
    }

    dayCard.append(header, eventList);
    calendarWeek.append(dayCard);
  }
}

async function loadCalendarEvents() {
  if (!calendarWeek || !calendarRange || !calendarStatus) {
    return;
  }

  const weekEnd = addDays(visibleWeekStart, 7);
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);

  calendarStatus.textContent = "Loading calendar events...";
  url.searchParams.set("key", calendarApiKey);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", visibleWeekStart.toISOString());
  url.searchParams.set("timeMax", weekEnd.toISOString());
  url.searchParams.set("timeZone", calendarTimeZone);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Calendar request failed");
    }

    const data = await response.json();
    renderCalendar(data.items || []);
    calendarStatus.textContent = "";
  } catch {
    calendarStatus.textContent = "Calendar events could not be loaded. Use the Google Calendar button below as a fallback.";
  }
}

previousWeekButton?.addEventListener("click", () => {
  visibleWeekStart = addDays(visibleWeekStart, -7);
  loadCalendarEvents();
});

nextWeekButton?.addEventListener("click", () => {
  visibleWeekStart = addDays(visibleWeekStart, 7);
  loadCalendarEvents();
});

loadCalendarEvents();

document.querySelectorAll("[data-apple-calendar-subscribe]").forEach((link) => {
  link.href = appleCalendarSubscribeUrl;
});

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

function setInstallModal(open) {
  installModal?.classList.toggle("open", open);
  installModal?.setAttribute("aria-hidden", String(!open));
  document.body.style.overflow = open ? "hidden" : "";
}

installHelpButton?.addEventListener("click", () => {
  setDrawer(false);
  setInstallModal(true);
});

installClose?.addEventListener("click", () => setInstallModal(false));
installModal?.addEventListener("click", (event) => {
  if (event.target === installModal) {
    setInstallModal(false);
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installPromptButton.hidden = false;
});

installPromptButton?.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installPromptButton.hidden = true;
});

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
    } else if (installModal?.classList.contains("open")) {
      setInstallModal(false);
    } else {
      setDrawer(false);
    }
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(document.body.dataset.serviceWorker || "service-worker.js?v=41").catch(() => {});
  });
}
