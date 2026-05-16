// @ts-nocheck
/* Shared roster HTML for chat-style name tags (guestbook, etc.) */
(function (global) {
    function escapeHtml(str) {
        if (str == null) return "";
        let div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function prestigeTagStyle(prestigeLevel) {
        let rainbow = ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#8f00ff"];
        let lvl = Number(prestigeLevel) || 0;
        if (lvl <= 0) return "";
        let count = Math.min(lvl, rainbow.length);
        let stops = rainbow.slice(0, count);
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
        let jl = Number(journeyLevel) || 0;
        if (jl === 1) return ' style="color: #9665fc; font-weight: bold;"';
        if (jl === 2) return ' style="color: #f1d4fa; font-weight: bold;"';
        if (jl === 3) return ' style="color: #ff3db2; font-weight: bold;"';
        if (jl >= 4) return ' style="color: #c71585; font-weight: bold;"';
        return "";
    }

    function rosterNameHtml(name, isVip, journeyLevel, color, decoration, prestigeLevel, holdsClickerTag) {
        let n = String(name || "").trim().toLowerCase();
        let roleTag =
            n === "jolenta"
                ? '<span class="message-owner">(OWNER) </span><span class="message-the-house">(THE HOUSE) </span><span class="message-the-archon">(THE ARCHON) </span>'
                : n === "admin"
                  ? '<span class="message-admin">(ADMIN) </span>'
                  : "";
        let jl = journeyLevel != null ? journeyLevel : 0;
        let pl = prestigeLevel != null ? Number(prestigeLevel) : 0;
        let journeyTag =
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
        let prestigeTag =
            pl > 0
                ? '<span class="message-prestige-tag"' +
                  prestigeTagStyle(pl) +
                  '>(PRESTIGE ' +
                  String(pl) +
                  ') </span>'
                : "";
        let masterGamblerTag =
            jl >= 5 || pl > 0 ? '<span class="message-master-gambler">(MASTER GAMBLER) </span>' : "";
        let carpalTunnelTag =
            holdsClickerTag ? '<span class="message-carpal-tunnel">(CARPAL TUNNEL) </span>' : "";
        let nameText = n === "jolenta" ? "⋆.˚" + escapeHtml(name) : escapeHtml(name);
        let displayName =
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
        let safeColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#000000";
        let safeDecoration = escapeHtml(decoration);
        let decoLead = "";
        let decoTrail = "";
        if (safeDecoration) {
            decoLead = '<span class="message-name-deco">' + safeDecoration + "</span>";
            decoTrail =
                '<span class="message-name-deco message-name-deco--mirror" aria-hidden="true" style="display:inline-block;transform:scale(-1,1)">' +
                safeDecoration +
                "</span>";
        }
        
        let showVipColors = isVip && n !== "jolenta";
        let vipTag = showVipColors ? '<span class="message-vip">(VIP) </span>' : "";
        let nameColorClass = "name-color" + (showVipColors ? " name-color--vip" : "");
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
            carpalTunnelTag +
            decoLead +
            displayName +
            decoTrail +
            "</span>"
        );
    }

    global.rosterNameHtml = rosterNameHtml;
})(typeof window !== "undefined" ? window : this);
