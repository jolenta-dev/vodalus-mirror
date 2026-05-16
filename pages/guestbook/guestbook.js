"use strict";
function guestbookNameKey(cell) {
  var a = (cell.getAttribute("data-guestbook-name") || "").toLowerCase();
  if (a) return a;
  return (cell.textContent || "").trim().toLowerCase();
}
fetch("/api/names").then((r) => r.json()).then((names) => names.forEach(({ name, date, website, note, vip, journey_level, prestige_level, color, decoration, holds_clicker_tag }) => {
  const nameCells = document.querySelectorAll("#name-table-body tr td:nth-child(2)");
  const key = (name || "").toLowerCase();
  if (Array.from(nameCells).some((cell) => guestbookNameKey(cell) === key)) return;
  addToList(name, date, website, note, { vip, journey_level, prestige_level, color, decoration, holds_clicker_tag });
}));
document.getElementById("add-btn").addEventListener("click", newName);
const onGuestbookEnter = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("add-btn").click();
  }
};
document.getElementById("input-name").addEventListener("keydown", onGuestbookEnter);
document.getElementById("input-website").addEventListener("keydown", onGuestbookEnter);
document.getElementById("input-note").addEventListener("keydown", onGuestbookEnter);
function newName() {
  const inputName = document.getElementById("input-name").value;
  const inputWebsite = document.getElementById("input-website").value;
  const inputNote = document.getElementById("input-note").value;
  if (inputName) {
    let submitName2 = function(password = null) {
      const nameCells = document.querySelectorAll("#name-table-body tr td:nth-child(2)");
      if (Array.from(nameCells).some((cell) => guestbookNameKey(cell) === inputName.toLowerCase())) {
        alert("Name already exists in guestbook. If you would like to add a new entry, please use a different name.");
        return;
      }
      fetch("/api/names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inputName, website: inputWebsite, note: inputNote })
      }).then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          alert(body.error || "Error adding name.");
          return;
        }
        addToList(inputName, (/* @__PURE__ */ new Date()).toLocaleString(), inputWebsite, inputNote, {
          vip: body.vip,
          journey_level: body.journey_level,
          prestige_level: body.prestige_level,
          color: body.color,
          decoration: body.decoration,
          holds_clicker_tag: body.holds_clicker_tag
        });
        document.getElementById("input-name").value = "";
        document.getElementById("input-website").value = "";
        document.getElementById("input-note").value = "";
      }).catch((err) => {
        alert(err.message || "Error adding name.");
      });
    };
    var submitName = submitName2;
    const tryLogin = (password = null) => {
      return fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inputName, password })
      });
    };
    tryLogin().then(async (r) => {
      if (r.status === 401) {
        const pw = prompt("Password required for protected nickname.");
        if (!pw) return alert("Password not entered, can't use a protected name.");
        const retry = await tryLogin(pw);
        if (!retry.ok) {
          const res = await retry.json();
          return alert(res.error || "Wrong password for nickname.");
        }
        submitName2(pw);
      } else if (!r.ok) {
        const res = await r.json();
        return alert(res.error || "Login failed.");
      } else {
        submitName2();
      }
    }).catch((err) => {
      alert(err.message || "Network/login error.");
    });
  } else {
    alert("please enter a name.");
  }
}
function addToList(name, date, website, note, meta) {
  meta = meta || {};
  var tr = document.createElement("tr");
  var tdDate = document.createElement("td");
  var tdName = document.createElement("td");
  var tdWebsite = document.createElement("td");
  var tdNote = document.createElement("td");
  var d = date ? new Date(date) : null;
  tdDate.textContent = d && !isNaN(d.getTime()) ? `[${d.toLocaleString()}]` : date ? `[${date}]` : "";
  tdName.className = "guestbook-name-cell";
  tdName.setAttribute("data-guestbook-name", (name || "").toLowerCase());
  if (typeof rosterNameHtml === "function") {
    tdName.innerHTML = rosterNameHtml(
      name,
      !!meta.vip,
      meta.journey_level != null ? meta.journey_level : 0,
      meta.color,
      meta.decoration,
      meta.prestige_level != null ? meta.prestige_level : 0,
      !!meta.holds_clicker_tag
    );
  } else {
    tdName.textContent = name || "";
  }
  tdWebsite.textContent = website || "";
  tdNote.textContent = note ? `"${note}"` : "";
  tr.appendChild(tdDate);
  tr.appendChild(tdName);
  tr.appendChild(tdWebsite);
  tr.appendChild(tdNote);
  document.getElementById("name-table-body").appendChild(tr);
}
addToList("jolenta", /* @__PURE__ */ new Date(0), "https://vodalus.org", "i was here first", {
  vip: false,
  journey_level: 4,
  prestige_level: 7,
  color: "#c71585",
  decoration: "",
  holds_clicker_tag: false
});
//# sourceMappingURL=guestbook.js.map
