"use strict";
(function() {
  let unreadRefreshInFlight = false;
  let unreadWatchersBound = false;
  function conveneUnreadSuffix(hasUnread) {
    return hasUnread ? " (*)" : "";
  }
  function draggableConveneHeaderEl() {
    let panel = document.getElementById("draggable-div");
    if (!panel) return null;
    let iframe = panel.querySelector("#draggable-div-content iframe");
    if (!iframe) return null;
    let src2 = iframe.getAttribute("src") || iframe.src || "";
    try {
      if (new URL(src2, location.href).pathname !== "/chat") return null;
    } catch (e) {
      return null;
    }
    return panel.querySelector("#draggable-div-header-text");
  }
  function setConveneMarker(hasUnread) {
    let link = document.querySelector('.sidenav a[href="/chat"]');
    if (link) link.textContent = "convene" + conveneUnreadSuffix(hasUnread);
    let titleBase = (document.title || "").replace(/\s*\(\*\)\s*$/, "");
    document.title = titleBase + conveneUnreadSuffix(hasUnread);
    let hdr = draggableConveneHeaderEl();
    if (hdr) {
      if (!hdr.dataset.conveneTitleBase) {
        hdr.dataset.conveneTitleBase = (hdr.textContent || "").replace(/\s*\(\*\)\s*$/, "") || "Convene";
      }
      hdr.textContent = hdr.dataset.conveneTitleBase + conveneUnreadSuffix(hasUnread);
    }
  }
  function refreshConveneUnreadMarker() {
    if (unreadRefreshInFlight) return;
    unreadRefreshInFlight = true;
    fetch("/api/conversations", { credentials: "include", cache: "no-store" }).then(function(r) {
      if (!r.ok) return null;
      return r.json();
    }).then(function(data) {
      let conversations = data && Array.isArray(data.conversations) ? data.conversations : [];
      let hasUnread = conversations.some(function(c) {
        return Number(c && c.unreadChatCount) > 0;
      });
      setConveneMarker(hasUnread);
    }).catch(function() {
      setConveneMarker(false);
    }).finally(function() {
      unreadRefreshInFlight = false;
    });
  }
  window.applyConveneNavUnreadMarker = refreshConveneUnreadMarker;
  function addWindowControls() {
    if (document.documentElement.classList.contains("chat-embed")) return;
    if ((window.location.pathname || "") !== "/chat") return;
    if (document.getElementById("chat-window-controls")) return;
    let wrap = document.createElement("div");
    wrap.id = "chat-window-controls";
    wrap.className = "window-controls";
    wrap.setAttribute("aria-label", "Open journey, ship, or botanic gardens in a panel");
    wrap.innerHTML = `<button type="button" class="window-control-button" id="window-control-open-journey" data-draggable-src="/journey?embed=1" data-draggable-title="Journey">J</button><button type="button" class="window-control-button" id="window-control-open-tzadkiels-ship" data-draggable-src="/tzadkiels-ship?embed=1" data-draggable-title="Tzadkiel's Ship">T</button><button type="button" class="window-control-button" id="window-control-open-botanic-gardens" data-draggable-src="/botanic-gardens?embed=1" data-draggable-title="Botanic Gardens">B</button>`;
    document.body.appendChild(wrap);
    let opening = false;
    wrap.addEventListener("click", function(e) {
      let btn = e.target && e.target.closest && e.target.closest("button[data-draggable-src]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      if (opening) return;
      opening = true;
      let src2 = btn.getAttribute("data-draggable-src");
      let title = btn.getAttribute("data-draggable-title") || "";
      import("/assets/javascript/draggable-div.js").then(function(mod) {
        let frame = document.createElement("iframe");
        frame.src = src2;
        frame.title = title;
        mod.initDraggableDiv(title, frame);
      }).catch(function() {
      }).finally(function() {
        opening = false;
      });
    });
  }
  function setupMobileSidebarToggle() {
    let toggle = document.getElementById("sidebar-toggle");
    let container = document.querySelector(".sidebar-container");
    let sidenav = document.querySelector(".sidenav");
    if (!toggle || !container) return;
    let mobileQuery = window.matchMedia("(max-width: 600px)");
    let backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    document.body.appendChild(backdrop);
    function closeSidebar() {
      container.classList.remove("is-open");
      document.body.classList.remove("sidebar-open");
      toggle.setAttribute("aria-expanded", "false");
    }
    function syncState() {
      if (!mobileQuery.matches) {
        closeSidebar();
      }
      toggle.setAttribute(
        "aria-expanded",
        container.classList.contains("is-open") ? "true" : "false"
      );
    }
    toggle.addEventListener("click", function() {
      if (!mobileQuery.matches) return;
      let open = container.classList.toggle("is-open");
      document.body.classList.toggle("sidebar-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    backdrop.addEventListener("click", closeSidebar);
    if (sidenav) {
      sidenav.addEventListener("click", function(e) {
        let link = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!link || !mobileQuery.matches) return;
        closeSidebar();
      });
    }
    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener("change", syncState);
    } else if (mobileQuery.addListener) {
      mobileQuery.addListener(syncState);
    }
    syncState();
  }
  function loadNowPlaying() {
    let s = document.createElement("script");
    s.src = "/assets/javascript/nowplaying.js";
    (document.head || document.documentElement).appendChild(s);
  }
  function createStars() {
    function go() {
      let field = document.getElementById("starfield");
      if (!field) {
        field = document.createElement("div");
        field.id = "starfield";
        field.setAttribute("aria-hidden", "true");
        let main = document.querySelector(".main");
        (main || document.body).insertBefore(field, (main || document.body).firstChild);
      }
      for (let i = 0; i < 100; i++) {
        let star = document.createElement("div");
        star.className = "star";
        let size = Math.random() * 3 + 1;
        star.style.width = size + "px";
        star.style.height = size + "px";
        star.style.position = "fixed";
        star.style.left = Math.random() * 100 + "vw";
        star.style.top = Math.random() * 100 + "vh";
        star.style.animationDuration = Math.random() * 20 + 1 + "s";
        field.appendChild(star);
      }
    }
    if (document.querySelector(".main")) go();
    else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
    else go();
  }
  function placeMoonAndSun() {
    if (document.documentElement.classList.contains("page-embed") || document.documentElement.classList.contains("chat-embed")) {
      return;
    }
    function go() {
      let field = document.getElementById("starfield");
      if (!field) return;
      let moon = document.createElement("div");
      moon.className = "moon";
      moon.setAttribute("aria-hidden", "true");
      moon.innerHTML = "<img src='/assets/images/moon.svg' alt='moon' width='120px' height='120px'>";
      moon.style.position = "fixed";
      let moonEw = 120;
      let moonEh = 120;
      function startMoonDrift() {
        let last = performance.now();
        let angle = Math.random() * Math.PI * 2;
        let spd = 1 + Math.random() * 12;
        let vx = Math.cos(angle) * spd;
        let vy = Math.sin(angle) * spd * 0.5;
        let w = window.innerWidth;
        let h = window.innerHeight;
        let x = Math.random() * Math.max(1, w - moonEw);
        let y = Math.random() * Math.max(1, h - moonEh);
        moon.style.left = x + "px";
        moon.style.top = y + "px";
        function wrap() {
          w = window.innerWidth;
          h = window.innerHeight;
          let maxX = w - moonEw;
          let maxY = h - moonEh;
          if (x > maxX) {
            x = maxX;
            vx = -Math.abs(vx);
          } else if (x < 0) {
            x = 0;
            vx = Math.abs(vx);
          }
          if (y > maxY) {
            y = maxY;
            vy = -Math.abs(vy);
          } else if (y < 0) {
            y = 0;
            vy = Math.abs(vy);
          }
        }
        function onResize() {
          wrap();
          moon.style.left = x + "px";
          moon.style.top = y + "px";
        }
        function tick(now) {
          let dt = Math.min(0.05, (now - last) / 1e3);
          last = now;
          x += vx * dt;
          y += vy * dt;
          wrap();
          moon.style.left = x + "px";
          moon.style.top = y + "px";
          requestAnimationFrame(tick);
        }
        window.addEventListener("resize", onResize);
        requestAnimationFrame(tick);
      }
      let sun = document.createElement("div");
      sun.className = "sun";
      sun.setAttribute("aria-hidden", "true");
      sun.innerHTML = "";
      sun.style.borderRadius = "50%";
      sun.style.width = "40px";
      sun.style.height = "40px";
      sun.style.backgroundColor = "red";
      sun.style.position = "fixed";
      sun.style.boxShadow = "0px 0px 10px red";
      sun.style.top = Math.random() * 100 + "vh";
      sun.style.left = Math.random() * 100 + "vw";
      sun.style.transform = "translateY(-50%)";
      field.appendChild(sun);
      field.appendChild(moon);
      startMoonDrift();
    }
    if (document.querySelector(".main")) go();
    else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
    else go();
  }
  function runFooter() {
    let el = document.querySelector(".status[data-src]");
    function refreshStatusSnippet() {
      if (!el) return;
      let src2 = el.getAttribute("data-src");
      if (!src2) return;
      fetch(src2, { cache: "no-store" }).then(function(r) {
        return r.text();
      }).then(function(html) {
        el.innerHTML = html;
      }).catch(function() {
      });
    }
    refreshStatusSnippet();
    addWindowControls();
    refreshConveneUnreadMarker();
    if (!unreadWatchersBound) {
      unreadWatchersBound = true;
      window.addEventListener("focus", refreshConveneUnreadMarker);
      document.addEventListener("visibilitychange", function() {
        if (document.visibilityState === "visible") refreshConveneUnreadMarker();
      });
      window.setInterval(refreshConveneUnreadMarker, 3e3);
    }
  }
  let mount = document.getElementById("site-sidebar-mount");
  let src = mount && mount.getAttribute("data-src");
  if (mount && src) {
    fetch(src, { cache: "no-store" }).then(function(r) {
      return r.text();
    }).then(function(html) {
      mount.outerHTML = html;
      setupMobileSidebarToggle();
      loadNowPlaying();
      runFooter();
      createStars();
      placeMoonAndSun();
    }).catch(function() {
      setupMobileSidebarToggle();
      runFooter();
      createStars();
      placeMoonAndSun();
    });
    return;
  }
  createStars();
  placeMoonAndSun();
  setupMobileSidebarToggle();
  loadNowPlaying();
  runFooter();
})();
//# sourceMappingURL=sidebar-footer.js.map
