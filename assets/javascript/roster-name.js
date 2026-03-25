/* Shared roster HTML for chat-style name tags (guestbook, etc.) */
(function (global) {
    function escapeHtml(str) {
        if (str == null) return "";
        var div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    /* DB stores one decoration string; the trailing side is mirrored in JS. Treat ୨୧ as one token so it never becomes ୧୨. */
    function mirrorDecorationSuffix(s) {
        var pair = "୨୧";
        var tokens = [];
        var i = 0;
        while (i < s.length) {
            if (s.slice(i, i + pair.length) === pair) {
                tokens.push(pair);
                i += pair.length;
            } else {
                var cp = s.codePointAt(i);
                var w = cp > 0xffff ? 2 : 1;
                tokens.push(s.slice(i, i + w));
                i += w;
            }
        }
        tokens.reverse();
        return tokens.join("");
    }

    /* Reversing char-by-char breaks ZWJ emoji, combining marks, flags, etc. — duplicate the prefix instead of mirroring. */
    function decorationMirroringBreaksRendering(s) {
        if (!s) return false;
        if (/[\u200D\uFE0E\uFE0F\u200C]/.test(s)) return true;
        if (/[\u202A-\u202E\u2066-\u2069]/.test(s)) return true;
        if (/[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/.test(s)) return true;
        try {
            if (/[\u{1F1E6}-\u{1F1FF}]{2}/u.test(s)) return true;
        } catch (e) {
            /* ignore if Unicode property regex unsupported */
        }
        return false;
    }

    function prestigeTagStyle(prestigeLevel) {
        var rainbow = ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#8f00ff"];
        var lvl = Number(prestigeLevel) || 0;
        if (lvl <= 0) return "";
        var count = Math.min(lvl, rainbow.length);
        var stops = rainbow.slice(0, count);
        if (stops.length === 1) {
            return ' style="color: ' + stops[0] + ';"';
        }
        return (
            ' style="background-image: linear-gradient(90deg, ' +
            stops.join(", ") +
            '); -webkit-background-clip: text; background-clip: text; color: transparent;"'
        );
    }

    function journeyTagStyle(journeyLevel) {
        var jl = Number(journeyLevel) || 0;
        if (jl === 1) return ' style="color: #9665fc; font-weight: bold;"';
        if (jl === 2) return ' style="color: #f1d4fa; font-weight: bold;"';
        if (jl === 3) return ' style="color: #ff3db2; font-weight: bold;"';
        if (jl >= 4) return ' style="color: #c71585; font-weight: bold;"';
        return "";
    }

    function rosterNameHtml(name, isVip, journeyLevel, color, decoration, prestigeLevel) {
        var n = String(name || "").trim().toLowerCase();
        var roleTag =
            n === "jolenta"
                ? '<span class="message-owner">(OWNER) </span><span class="message-the-house">(THE HOUSE) </span>'
                : n === "admin"
                  ? '<span class="message-admin">(ADMIN) </span>'
                  : "";
        var jl = journeyLevel != null ? journeyLevel : 0;
        var pl = prestigeLevel != null ? Number(prestigeLevel) : 0;
        var journeyTag =
            jl === 1
                ? '<span class="message-journey-1"' + journeyTagStyle(1) + '>(LVL 1 GAMBLER) </span>'
                : jl === 2
                  ? '<span class="message-journey-2"' + journeyTagStyle(2) + '>(LVL 2 GAMBLER) </span>'
                  : jl === 3
                    ? '<span class="message-journey-3"' + journeyTagStyle(3) + '>(LVL 3 GAMBLER) </span>'
                    : jl === 4
                      ? '<span class="message-journey-4">(AUTARCH) </span>'
                      : jl >= 5
                        ? '<span class="message-journey-5-plus">(AUTARCH) </span>'
                        : "";
        var prestigeTag =
            pl > 0
                ? '<span class="message-prestige-tag"' +
                  prestigeTagStyle(pl) +
                  '>(PRESTIGE ' +
                  String(pl) +
                  ') </span>'
                : "";
        var masterGamblerTag =
            jl >= 5 || pl > 0 ? '<span class="message-master-gambler">(MASTER GAMBLER) </span>' : "";
        var nameText = n === "jolenta" ? "⋆.˚" + escapeHtml(name) : escapeHtml(name);
        var displayName =
            n === "jolenta"
                ? '<span class="message-name">' +
                  nameText +
                  '</span><span class="message-name-tail" aria-hidden="true">˖<span class="message-name-tail-gold">✧</span>°.</span>'
                : '<span class="message-name">' + nameText + "</span>";
        color = color ?? "#000000";
        decoration = decoration ?? "";
        /* Jolenta: no flanking DB decoration (same glyphs as default VIP trim); only ⋆.˚ inside the name */
        if (n === "jolenta") {
            decoration = "";
        }
        var safeColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#000000";
        var safeDecoration = escapeHtml(decoration);
        var decorationAfter = decorationMirroringBreaksRendering(decoration)
            ? safeDecoration
            : mirrorDecorationSuffix(safeDecoration);
        /* Jolenta uses OWNER / THE HOUSE only — no stock (VIP) tag or name-color--vip */
        var showVipChrome = isVip && n !== "jolenta";
        var vipTag = showVipChrome ? '<span class="message-vip">(VIP) </span>' : "";
        var nameColorClass = "name-color" + (showVipChrome ? " name-color--vip" : "");
        return (
            vipTag +
            roleTag +
            '<span class="' +
            nameColorClass +
            '" style="color: ' +
            safeColor +
            ';">' +
            prestigeTag +
            journeyTag +
            masterGamblerTag +
            safeDecoration +
            displayName +
            decorationAfter +
            "</span>"
        );
    }

    global.rosterNameHtml = rosterNameHtml;
})(typeof window !== "undefined" ? window : this);
