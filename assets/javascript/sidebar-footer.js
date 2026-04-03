(function () {
    var unreadRefreshInFlight = false;
    var unreadWatchersBound = false;

    function conveneUnreadSuffix(hasUnread) {
        return hasUnread ? " (*)" : "";
    }

    function setConveneMarker(hasUnread) {
        var link = document.querySelector('.sidenav a[href="/chat"]');
        if (link) link.textContent = "convene" + conveneUnreadSuffix(hasUnread);
        var titleBase = (document.title || "").replace(/\s*\(\*\)\s*$/, "");
        document.title = titleBase + conveneUnreadSuffix(hasUnread);
        var hdr = document.querySelector("#draggable-div-header-text");
        if (hdr) {
            if (!hdr.dataset.conveneTitleBase) {
                hdr.dataset.conveneTitleBase =
                    (hdr.textContent || "").replace(/\s*\(\*\)\s*$/, "") || "Convene";
            }
            hdr.textContent = hdr.dataset.conveneTitleBase + conveneUnreadSuffix(hasUnread);
        }
    }

    function addWindowControls() {
        if (document.documentElement.classList.contains("chat-embed")) return;
        if ((window.location.pathname || "") !== "/chat") return;
        if (document.getElementById("chat-window-controls")) return;

        var wrap = document.createElement("div");
        wrap.id = "chat-window-controls";
        wrap.className = "window-controls";
        wrap.setAttribute("aria-label", "Open journey or ship in a panel");
        wrap.innerHTML =
            '<button type="button" class="window-control-button" id="window-control-open-journey" data-draggable-src="/journey?embed=1" data-draggable-title="Journey">J</button>' +
            '<button type="button" class="window-control-button" id="window-control-open-tzadkiels-ship" data-draggable-src="/tzadkiels-ship?embed=1" data-draggable-title="Tzadkiel\'s Ship">T</button>';
        document.body.appendChild(wrap);

        var opening = false;
        wrap.addEventListener("click", function (e) {
            var btn = e.target && e.target.closest && e.target.closest("button[data-draggable-src]");
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            if (document.getElementById("draggable-div") || opening) return;
            opening = true;
            var src = btn.getAttribute("data-draggable-src");
            var title = btn.getAttribute("data-draggable-title") || "";
            import("/assets/javascript/draggable-div.js")
                .then(function (mod) {
                    if (document.getElementById("draggable-div")) return;
                    var frame = document.createElement("iframe");
                    frame.src = src;
                    frame.title = title;
                    mod.initDraggableDiv(title, frame);
                })
                .catch(function () {})
                .finally(function () {
                    opening = false;
                });
        });
    }

    function refreshConveneUnreadMarker() {
        if (unreadRefreshInFlight) return;
        unreadRefreshInFlight = true;
        fetch("/api/conversations", { credentials: "include", cache: "no-store" })
            .then(function (r) {
                if (!r.ok) return null;
                return r.json();
            })
            .then(function (data) {
                var conversations = data && Array.isArray(data.conversations) ? data.conversations : [];
                var hasUnread = conversations.some(function (c) {
                    return Number(c && c.unreadChatCount) > 0;
                });
                setConveneMarker(hasUnread);
            })
            .catch(function () {
                setConveneMarker(false);
            })
            .finally(function () {
                unreadRefreshInFlight = false;
            });
    }

    window.vodalusApplyConveneNavUnreadMarker = refreshConveneUnreadMarker;

    function setupMobileSidebarToggle() {
        var toggle = document.getElementById("sidebar-toggle");
        var container = document.querySelector(".sidebar-container");
        var sidenav = document.querySelector(".sidenav");
        if (!toggle || !container) return;

        var mobileQuery = window.matchMedia("(max-width: 600px)");

        var backdrop = document.createElement("div");
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

        toggle.addEventListener("click", function () {
            if (!mobileQuery.matches) return;
            var open = container.classList.toggle("is-open");
            document.body.classList.toggle("sidebar-open", open);
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });

        backdrop.addEventListener("click", closeSidebar);

        if (sidenav) {
            sidenav.addEventListener("click", function (e) {
                var link = e.target && e.target.closest ? e.target.closest("a[href]") : null;
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
        var s = document.createElement("script");
        s.src = "/assets/javascript/nowplaying.js";
        (document.head || document.documentElement).appendChild(s);
    }

    function runFooter() {
        var el = document.querySelector(".status[data-src]");
        function refreshStatusSnippet() {
            if (!el) return;
            var src = el.getAttribute("data-src");
            if (!src) return;
            fetch(src, { cache: "no-store" })
                .then(function (r) { return r.text(); })
                .then(function (html) { el.innerHTML = html; })
                .catch(function () {});
        }
        refreshStatusSnippet();

        var DIM_CLASS = "site-dim--dim";
        var STORAGE_KEY = "siteDim";
        var MOON_DIMMED_SRC = "/assets/icons/moon.png";
        var MOON_NORMAL_SRC = "/assets/icons/moon-filled.png";

        function syncDimIcon() {
            var img = document.getElementById("toggle-dim-icon");
            if (!img) return;
            var dimmed = document.documentElement.classList.contains(DIM_CLASS);
            img.src = dimmed ? MOON_DIMMED_SRC : MOON_NORMAL_SRC;
        }

        try {
            var v = localStorage.getItem(STORAGE_KEY);
            if (v === "0") {
                document.documentElement.classList.remove(DIM_CLASS);
            } else {
                document.documentElement.classList.add(DIM_CLASS);
            }
        } catch (e) {}

        syncDimIcon();

        var btn = document.getElementById("toggle-dim-btn");
        if (btn) {
            btn.addEventListener("click", function () {
                var on = document.documentElement.classList.toggle(DIM_CLASS);
                syncDimIcon();
                try {
                    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
                } catch (e2) {}
            });
        }

        addWindowControls();
        refreshConveneUnreadMarker();
        if (!unreadWatchersBound) {
            unreadWatchersBound = true;
            window.addEventListener("focus", refreshConveneUnreadMarker);
            document.addEventListener("visibilitychange", function () {
                if (document.visibilityState === "visible") refreshConveneUnreadMarker();
            });
            window.setInterval(refreshConveneUnreadMarker, 3000);
        }
    }

    var mount = document.getElementById("site-sidebar-mount");
    var src = mount && mount.getAttribute("data-src");
    if (mount && src) {
        fetch(src, { cache: "no-store" })
            .then(function (r) { return r.text(); })
            .then(function (html) {
                mount.outerHTML = html;
                setupMobileSidebarToggle();
                loadNowPlaying();
                runFooter();
            })
            .catch(function () {
                setupMobileSidebarToggle();
                runFooter();
            });
        return;
    }

    setupMobileSidebarToggle();
    loadNowPlaying();
    runFooter();

})();
