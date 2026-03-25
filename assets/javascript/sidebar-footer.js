(function () {
    function loadNowPlaying() {
        var s = document.createElement("script");
        s.src = "/assets/javascript/nowplaying.js";
        (document.head || document.documentElement).appendChild(s);
    }

    function runFooter() {
        var el = document.querySelector(".status[data-src]");
        if (el) {
            var src = el.getAttribute("data-src");
            if (src) {
                fetch(src)
                    .then(function (r) { return r.text(); })
                    .then(function (html) { el.innerHTML = html; })
                    .catch(function () {});
            }
        }

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
            } else if (v === "1") {
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
    }

    var mount = document.getElementById("site-sidebar-mount");
    var src = mount && mount.getAttribute("data-src");
    if (mount && src) {
        fetch(src)
            .then(function (r) { return r.text(); })
            .then(function (html) {
                mount.outerHTML = html;
                loadNowPlaying();
                runFooter();
            })
            .catch(function () {
                runFooter();
            });
        return;
    }

    loadNowPlaying();
    runFooter();
})();
