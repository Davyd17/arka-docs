/* ======================================================================
   ARKA — DOCUMENTATION SITE BEHAVIOR
   ======================================================================
   Three independent pieces:
   1. Section navigation  — show the page matching the clicked nav button
   2. Theme toggle         — switch data-theme on <html>, remember choice
   3. Sidebar toggle       — collapse it on desktop, slide it in/out as a
                             drawer on mobile; remembers the desktop choice
   ====================================================================== */

const MOBILE_BREAKPOINT = "(max-width: 860px)";

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initThemeToggle();
  initSidebarToggle();
});


/* ----------------------------------------------------------------------
   1. SECTION NAVIGATION
   Every sidebar button has data-section="some-id" matching the id of
   the <section> it should reveal. Only one .page has .active at a time.
---------------------------------------------------------------------- */
function initNavigation() {
  const navButtons = document.querySelectorAll(".nav-item");
  const pages = document.querySelectorAll(".page");

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-section");

      // Toggle the active nav button
      navButtons.forEach((b) => b.classList.remove("active"));
      button.classList.add("active");

      // Toggle the matching page
      pages.forEach((page) => {
        page.classList.toggle("active", page.id === targetId);
      });

      // Scroll content back to top when switching pages
      document.querySelector(".content").scrollTo({ top: 0 });

      // On mobile, picking a page should close the drawer.
      // (On desktop, "collapsed" is a separate, user-controlled choice —
      // navigating shouldn't undo it.)
      if (window.matchMedia(MOBILE_BREAKPOINT).matches) {
        document.getElementById("sidebar").classList.remove("open");
      }
    });
  });
}


/* ----------------------------------------------------------------------
   2. THEME TOGGLE
   Theme is stored on <html data-theme="dark|light"> and persisted in
   localStorage so it survives a page reload.
---------------------------------------------------------------------- */
function initThemeToggle() {
  const root = document.documentElement;
  const toggleButton = document.getElementById("themeToggle");

  // Restore saved preference, if any
  const savedTheme = localStorage.getItem("arka-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    root.setAttribute("data-theme", savedTheme);
  }

  toggleButton.addEventListener("click", () => {
    const current = root.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("arka-theme", next);
  });
}


/* ----------------------------------------------------------------------
   3. SIDEBAR TOGGLE
   Same button, two behaviors depending on viewport width:
   - Desktop: toggles .collapsed (sidebar shrinks to width 0 in place).
     The choice is remembered in localStorage across reloads.
   - Mobile (<=860px): toggles .open (sidebar slides in as a drawer,
     see the media query in styles.css). Never persisted — a drawer
     should always start closed.
---------------------------------------------------------------------- */
function initSidebarToggle() {
  const toggleButton = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");

  // Restore the desktop collapse preference on load.
  const isCollapsed = localStorage.getItem("arka-sidebar-collapsed") === "true";
  if (isCollapsed && !window.matchMedia(MOBILE_BREAKPOINT).matches) {
    sidebar.classList.add("collapsed");
  }

  toggleButton.addEventListener("click", () => {
    if (window.matchMedia(MOBILE_BREAKPOINT).matches) {
      sidebar.classList.toggle("open");
    } else {
      const collapsed = sidebar.classList.toggle("collapsed");
      localStorage.setItem("arka-sidebar-collapsed", collapsed);
    }
  });
}

// zoom image modal
let scale = 1;
let panning = false;
let pointX = 0;
let pointY = 0;
let startX = 0;
let startY = 0;
let initialDistance = null; // Used for mobile pinch-to-zoom

const img = document.getElementById("expandedImg");
const modal = document.getElementById("diagramModal");
const viewport = document.getElementById("modalViewport");

// Prevent native browser image dragging
img.addEventListener('dragstart', (e) => e.preventDefault());

function openModal(imageSrc) {
  img.src = imageSrc;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  resetZoom();
}

function closeModal() {
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

function setTransform() {
  img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

function resetZoom() {
  scale = 1;
  pointX = 0;
  pointY = 0;
  if (viewport) viewport.style.cursor = 'default';
  setTransform();
}

function zoomIn() {
  scale = Math.min(scale + 0.4, 4);
  if (viewport) viewport.style.cursor = 'grab';
  setTransform();
}

function zoomOut() {
  scale = Math.max(scale - 0.4, 1);
  if (scale === 1) {
    pointX = 0;
    pointY = 0;
    if (viewport) viewport.style.cursor = 'default';
  }
  setTransform();
}

// ==================== DESKTOP ZOOM & PAN ====================
if (viewport) {
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomIntensity = 0.15;
    if (e.deltaY < 0) {
      scale = Math.min(scale + zoomIntensity, 4);
    } else {
      scale = Math.max(scale - zoomIntensity, 1);
      if (scale === 1) {
        pointX = 0;
        pointY = 0;
      }
    }
    viewport.style.cursor = scale > 1 ? 'grab' : 'default';
    setTransform();
  }, { passive: false });

  viewport.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (scale > 1) {
      panning = true;
      startX = e.clientX - pointX;
      startY = e.clientY - pointY;
      viewport.style.cursor = 'grabbing';
    }
  });
}

window.addEventListener('mousemove', (e) => {
  if (!panning) return;
  e.preventDefault();
  pointX = e.clientX - startX;
  pointY = e.clientY - startY;
  setTransform();
});

window.addEventListener('mouseup', () => {
  panning = false;
  if (viewport) {
    viewport.style.cursor = scale > 1 ? 'grab' : 'default';
  }
});

// ==================== MOBILE TOUCH SUPPORT ====================
function getTouchDistance(touches) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
}

if (viewport) {
  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      // Two fingers: Start Pinch-to-Zoom
      initialDistance = getTouchDistance(e.touches);
    } else if (e.touches.length === 1 && scale > 1) {
      // One finger: Pan/Drag (only if zoomed in)
      panning = true;
      startX = e.touches[0].clientX - pointX;
      startY = e.touches[0].clientY - pointY;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialDistance) {
      // Handling Pinch-to-Zoom
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const zoomFactor = currentDistance / initialDistance;
      
      let newScale = scale * zoomFactor;
      scale = Math.min(Math.max(newScale, 1), 4);
      initialDistance = currentDistance;
      setTransform();
    } else if (e.touches.length === 1 && panning) {
      // Handling Single-Finger Dragging
      e.preventDefault();
      pointX = e.touches[0].clientX - startX;
      pointY = e.touches[0].clientY - startY;
      setTransform();
    }
  }, { passive: false });

  viewport.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      initialDistance = null;
    }
    if (e.touches.length === 0) {
      panning = false;
    }
  });
}

// ESC key listener for desktop closing
document.addEventListener('keydown', (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});