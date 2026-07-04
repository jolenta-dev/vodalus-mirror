"use strict";
class dailyQuote {
  fetch() {
    fetch("/api/daily-quote").then((r) => r.ok ? r.json() : Promise.reject()).then((data) => {
      const dailyQuoteText = document.getElementById("daily-quote-text");
      dailyQuoteText.textContent = data.quote;
    }).catch(() => {
    });
  }
}
class clickerLeaderboard {
  fetch() {
    fetch("/api/clicker/get-global-counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    }).then((r) => r.ok ? r.json() : Promise.reject()).then((data) => {
      const tbody = document.getElementById("clicker-leaderboard-body");
      const rows = Array.isArray(data.global_counts) ? data.global_counts : [];
      function appendRow(item) {
        const tr = document.createElement("tr");
        const tdName = document.createElement("td");
        tdName.className = "guestbook-name-cell";
        tdName.innerHTML = rosterNameHtml(
          item.name,
          !!item.vip,
          item.journey_level != null ? item.journey_level : 0,
          item.color,
          item.decoration,
          item.prestige_level != null ? item.prestige_level : 0,
          !!item.holds_clicker_tag
        );
        const tdCount = document.createElement("td");
        tdCount.textContent = String(item.clicker_count);
        tr.appendChild(tdName);
        tr.appendChild(tdCount);
        tbody.appendChild(tr);
      }
      rows.forEach((item) => appendRow(item));
    }).catch(() => {
    });
  }
}
class gamblingLeaderboard {
  fetch() {
    fetch("/api/gambling-leaderboard").then((r) => r.ok ? r.json() : Promise.reject()).then((data) => {
      const tbody = document.getElementById("gambling-leaderboard-body");
      function appendRow(item, levelLabel, prestigeLabel) {
        const tr = document.createElement("tr");
        const tdName = document.createElement("td");
        tdName.className = "guestbook-name-cell";
        tdName.innerHTML = rosterNameHtml(
          item.name,
          !!item.vip,
          item.journey_level != null ? item.journey_level : 0,
          item.color,
          item.decoration,
          item.prestige_level != null ? item.prestige_level : 0
        );
        const tdLevel = document.createElement("td");
        const tdPrestige = document.createElement("td");
        tdPrestige.className = "leaderboard-prestige-level";
        if (levelLabel != null || prestigeLabel != null) {
          tdLevel.className = "leaderboard-house-level";
          tdLevel.innerHTML = '<span class="message-the-house">' + (levelLabel != null ? levelLabel : "-") + "</span>";
          tdPrestige.innerHTML = '<span class="message-the-house">' + (prestigeLabel != null ? prestigeLabel : "-") + "</span>";
        } else {
          tdLevel.textContent = String(item.journey_level);
          tdPrestige.textContent = String(
            item.prestige_level != null ? item.prestige_level : 0
          );
        }
        tr.appendChild(tdName);
        tr.appendChild(tdLevel);
        tr.appendChild(tdPrestige);
        tbody.appendChild(tr);
      }
      appendRow(
        (data || []).find((item) => (item.name || "").toLowerCase() === "jolenta") || {
          name: "jolenta",
          vip: false,
          journey_level: 4,
          prestige_level: 7,
          color: "#c71585",
          decoration: ""
        },
        "THE HOUSE",
        "THE <br>HOUSE"
        // dunno why this displays differently than the above one but it does.
      );
      data.filter((item) => (item.name || "").toLowerCase() !== "jolenta").forEach((item) => appendRow(item));
    }).catch(() => {
    });
  }
}
new dailyQuote().fetch();
new clickerLeaderboard().fetch();
new gamblingLeaderboard().fetch();
//# sourceMappingURL=home.js.map
