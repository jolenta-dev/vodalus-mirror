"use strict";
function promptPassword(messageText) {
  const overlay = document.getElementById("password-modal-overlay");
  const messageEl = document.getElementById("password-modal-message");
  const input = document.getElementById("password-modal-input");
  const revealCheckbox = document.getElementById("password-modal-reveal");
  const okBtn = document.getElementById("password-modal-ok");
  const cancelBtn = document.getElementById("password-modal-cancel");
  return new Promise((resolve) => {
    let resolved = false;
    function finish(value) {
      if (resolved) return;
      resolved = true;
      overlay.style.display = "";
      input.value = "";
      input.type = "password";
      if (revealCheckbox) revealCheckbox.checked = false;
      document.removeEventListener("keydown", onEscape);
      overlay.removeEventListener("click", onOverlayClick);
      input.removeEventListener("keydown", onPasswordKeydown);
      resolve(value);
    }
    function onEscape(e) {
      if (e.key === "Escape") finish(null);
    }
    function onOverlayClick(e) {
      if (e.target === overlay) finish(null);
    }
    function onPasswordKeydown(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        finish(input.value);
      }
    }
    messageEl.textContent = messageText;
    input.value = "";
    input.type = "password";
    if (revealCheckbox) {
      revealCheckbox.checked = false;
      revealCheckbox.onchange = () => {
        input.type = revealCheckbox.checked ? "text" : "password";
      };
    }
    okBtn.onclick = () => finish(input.value);
    cancelBtn.onclick = () => finish(null);
    document.addEventListener("keydown", onEscape);
    overlay.addEventListener("click", onOverlayClick);
    input.addEventListener("keydown", onPasswordKeydown);
    overlay.style.display = "flex";
    input.focus();
  });
}
let authedName = null;
let authedPassword = null;
async function authenticateForShip(name) {
  const me = await fetch("/api/me", { credentials: "include", cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null);
  if (me && me.nickname && me.nickname.toLowerCase() === name.toLowerCase()) {
    authedName = name;
    authedPassword = null;
    return true;
  }
  const tryLogin = (password = null) => fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, password })
  });
  const first = await tryLogin();
  if (first.status === 401) {
    const pw = await promptPassword("This nickname is protected. Enter your password to board Tzadkiel's ship.");
    if (!pw) {
      alert("Password required to use protected nickname.");
      return false;
    }
    const retry = await tryLogin(pw);
    if (!retry.ok) {
      const err = await retry.json().catch(() => ({}));
      alert(err.error || "Wrong password for nickname.");
      return false;
    }
    authedName = name;
    authedPassword = pw;
    return true;
  }
  if (!first.ok) {
    const err = await first.json().catch(() => ({}));
    alert(err.error || "Login failed.");
    return false;
  }
  authedName = name;
  authedPassword = null;
  return true;
}
const nameInputEl = document.getElementById("name-input");
nameInputEl.addEventListener("input", () => {
  nameInputEl.dataset.touched = "1";
});
fetch("/api/me", { credentials: "include", cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((data) => {
  if (!data || !data.nickname) return;
  if (nameInputEl.dataset.touched === "1") return;
  nameInputEl.value = data.nickname;
  authedName = data.nickname;
}).catch(() => {
});
var journeyAttempts = 0;
function incrementJourneyAttempts() {
  journeyAttempts += 1;
  document.getElementById("journey-attempts").textContent = String(journeyAttempts);
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFromArray(arr) {
  if (!arr || !arr.length) return null;
  return arr[randomInt(0, arr.length - 1)];
}
var yesodJourneyStage = 0;
var onCooldown = false;
var COOLDOWN_MS = 3e3;
function addYesodJourneyItem(text) {
  appendJourneyListLine(document.getElementById("yesod-journey-list"), text, false, COOLDOWN_MS);
}
function clearYesodJourneyList() {
  document.getElementById("yesod-journey-list").innerHTML = "";
}
var events1 = [
  "You get a bad vibe and choose not to board the ship. Urth soon freezes over.",
  "This Zak guy is too weird for you and you fling yourself into the void.",
  "You attempt to fling your writing into space and in doing so fall off the ship into the vaccuum."
];
var events2 = [
  "You get shot during the fight aboard the ship and do not recover.",
  "The hierodules' whispers drive you to madness and you are unable to complete your mission.",
  "You fall in love with Gunney and get too distracted to reach Yesod."
];
var events3 = [
  "The hierogrammates reject your plea and you return to Urth empty-handed.",
  "You are unable to face your past during judgement on Yesod, and never return to Urth.",
  "The faces of the dead are too much to bear and you are unable to save Urth."
];
var events4 = [
  "You return to Urth to find the sun still dying, the New Sun never arrives.",
  "The men in the jail reject your story and The Book of the New Sun is never written.",
  "The ancient Typhon is successful at taking your life.",
  "You do not survive the Undine's flood.",
  "You are feminized after failing to convince the hierogrammates to grant you the New Sun."
];
var yesodStageWinMessages = [
  "You successfully make peace with life aboard the ship and venture deeper into this universe, which is called Briah.",
  "You survive the encounter with the strange creature aboard the ship and learn the true nature of the hierodules.",
  "You successfully reach Yesod and begin judgement by the hierogrammates."
];
var yesodFinalWinMessages = [
  "You successfully plead Urth's case to the hierogrammates and learn you've had the power of the New Sun all along. Return now to Urth with it in hand, traversing this universe, which is called Briah.",
  "You return the New Sun to Urth, now called Ushas. You slip through the corridors of time and return as Apu-Punchau. Your story is complete. A special reward has been granted."
];
document.getElementById("board-btn").addEventListener("click", async () => {
  var name = document.getElementById("name-input").value.trim();
  if (!name) {
    alert("Please enter your name before boarding.");
    return;
  }
  const meNow = await fetch("/api/me", { credentials: "include", cache: "no-store" }).then((r) => r.ok ? r.json() : null);
  const sessionMatches = meNow && meNow.nickname && meNow.nickname.toLowerCase() === name.toLowerCase();
  if (!sessionMatches) {
    const ok = await authenticateForShip(name);
    if (!ok) return;
  }
  const meBoard = sessionMatches ? meNow : await fetch("/api/me", { credentials: "include", cache: "no-store" }).then((r) => r.ok ? r.json() : null);
  if (!meBoard || String(meBoard.nickname).toLowerCase() !== name.toLowerCase()) {
    alert("Could not verify your session for this name. Try boarding again.");
    return;
  }
  const lowerBoardName = String(meBoard.nickname).toLowerCase();
  const tzadkielPrivilegedBoard = lowerBoardName === "jolenta" || lowerBoardName === "admin";
  if (!tzadkielPrivilegedBoard && (meBoard.journey_level == null || meBoard.journey_level < 4)) {
    alert("Only a registered name that has completed Urth's many journeys (GAMBLING LVL 4) may board. Complete the main journey and atrium path first.");
    return;
  }
  authedName = meBoard.nickname;
  document.getElementById("name-input").value = meBoard.nickname;
  document.getElementById("board-ship").style.display = "none";
  document.getElementById("ship").style.display = "block";
});
document.getElementById("name-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("board-btn").click();
  }
});
document.getElementById("yesod-journey-btn").addEventListener("click", async () => {
  if (yesodJourneyStage === 4) return;
  if (onCooldown) return;
  onCooldown = true;
  var btn = document.getElementById("yesod-journey-btn");
  btn.disabled = true;
  setTimeout(function() {
    onCooldown = false;
    btn.disabled = false;
  }, COOLDOWN_MS);
  var name = document.getElementById("name-input").value.trim();
  if (!name || String(authedName || "").toLowerCase() !== name.toLowerCase()) {
    addYesodJourneyItem("Your auth session does not match the current name. Re-board the ship.");
    return;
  }
  const priorStage = yesodJourneyStage;
  const stepResponse = await fetch("/api/yesod_journey_step", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  const stepData = await stepResponse.json().catch(() => ({}));
  if (!stepResponse.ok || !stepData.success) {
    addYesodJourneyItem(stepData.error || "Journey step failed. Please try boarding again.");
    return;
  }
  if (stepData.outcome === "fail") {
    incrementJourneyAttempts();
    const failPools = [events1, events2, events3, events4];
    const failPool = failPools[Math.max(0, Math.min(priorStage, 3))] || [];
    if (priorStage === 0) clearYesodJourneyList();
    addYesodJourneyItem(randomFromArray(failPool) || "The journey fails. Begin your journey again.");
    btn.textContent = "Begin your journey.";
    yesodJourneyStage = 0;
    return;
  }
  if (stepData.outcome === "advance") {
    if (priorStage === 0) {
      clearYesodJourneyList();
      addYesodJourneyItem(yesodStageWinMessages[0]);
      btn.textContent = "Continue your journey.";
      yesodJourneyStage = 1;
      return;
    }
    if (priorStage === 1) {
      addYesodJourneyItem(yesodStageWinMessages[1]);
      yesodJourneyStage = 2;
      return;
    }
    if (priorStage === 2) {
      addYesodJourneyItem(yesodStageWinMessages[2]);
      yesodJourneyStage = 3;
      return;
    }
    yesodJourneyStage = stepData.stage || priorStage;
    return;
  }
  if (stepData.outcome === "already_won") {
    clearYesodJourneyList();
    yesodFinalWinMessages.forEach(function(line) {
      addYesodJourneyItem(line);
    });
    yesodJourneyStage = 4;
    return;
  }
  if (stepData.outcome === "win") {
    yesodFinalWinMessages.forEach(function(line) {
      addYesodJourneyItem(line);
    });
    var password = authedPassword;
    let keyResult = await fetch("/api/yesod_win_key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password })
    });
    let keyData = await keyResult.json().catch(() => ({}));
    if (keyResult.status === 401) {
      password = await promptPassword("Enter your password to claim this reward.");
      if (!password) {
        addYesodJourneyItem("Password required to claim this reward.");
        return;
      }
      authedPassword = password;
      keyResult = await fetch("/api/yesod_win_key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password })
      });
      keyData = await keyResult.json().catch(() => ({}));
    }
    if (!keyResult.ok || !keyData.success || !keyData.key) {
      addYesodJourneyItem(keyData.error || "Could not issue win key.");
      return;
    }
    const rewardResponse = await fetch("/api/big_winner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, key: keyData.key })
    });
    const rewardData = await rewardResponse.json().catch(() => ({}));
    if (rewardResponse.ok && rewardData.success) {
      addYesodJourneyItem("Your reward has been granted. Go forth, MASTER GAMBLER " + name + "!");
      fetch("/api/announcements/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "yesod_journey", name })
      });
    } else {
      addYesodJourneyItem(rewardData.error || "An error occurred while granting the special reward. Please contact Jolenta for help.");
    }
    yesodJourneyStage = 4;
    return;
  }
});
//# sourceMappingURL=tzadkiels-ship.js.map
