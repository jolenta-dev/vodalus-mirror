// @ts-nocheck

/* TODOS:
- change progression to look more like CC
- change upgrade info to hover messages
- prestige/ascension????
- FRONTEND PASS (duh)
*/
let count = 0;
let increasePerClick = 1;
let perTick = 0;
let autoClickInterval = 1000;
let explosionChance = 0;
let explosionQuantity = 0;
let holdToClick = false;
let holdToClickInterval = 1000;
let buttonHeld = false;
let lastHoldClickAt = 0;
let sessionName = null;
let persistClickerTimer = null;
let clickerHydrated = false;
let clickerHydrateGen = 0;
let upgrade3Level = 0;
let upgrade4Level = 0;
let upgrade5Level = 0;

function botanicUpgradeCost1(purchases) {
    let c = 20;
    for (let i = 0; i < purchases; i++) c = Math.round(c * 2.5);
    return c;
}
function botanicUpgradeCost2(purchases) {
    let c = 50;
    for (let i = 0; i < purchases; i++) c = Math.round(c * 5);
    return c;
}
function botanicUpgradeCost3(purchases) {
    let c = 10000;
    for (let i = 0; i < purchases; i++) c = Math.round(c * 10);
    return c;
}
function botanicUpgradeCost4(purchases) {
    let c = 50000;
    for (let i = 0; i < purchases; i++) c = Math.round(c * 5);
    return c;
}
function botanicUpgradeCost5(purchases) {
    let c = 100000;
    for (let i = 0; i < purchases; i++) c = Math.round(c * 10);
    return c;
}
function botanicSaveLevelsPayload() {
    const o = {};
    o.upgrade1_level = Math.max(0, increasePerClick - 1);
    o.upgrade2_level = Math.max(0, perTick);
    o.upgrade3_level = Math.max(0, upgrade3Level);
    o.upgrade4_level = Math.max(0, upgrade4Level);
    o.upgrade5_level = Math.max(0, upgrade5Level);
    for (let i = 6; i <= 10; i++) o['upgrade' + i + '_level'] = 0;
    return o;
}

function setUpgradeLevelDisplay(i, purchases) {
    if (upgradeLevel[i]) upgradeLevel[i].textContent = String(purchases + 1);
}

function setClickerInteractionEnabled(enabled) {
    const container = document.getElementById('botanic-gardens-container');
    if (container) container.style.pointerEvents = enabled ? '' : 'none';
}

function applyExplosionPurchase() {
    if (explosionChance <= 0.7) explosionChance += 0.1;
    else explosionChance += 0.01;
    if (explosionQuantity === 0) explosionQuantity = 1000;
    else explosionQuantity *= 1.5;
}

const draggableDivModule = import('/assets/javascript/draggable-div.js');
const openDraggableWindows = {};

async function openDraggableModal(key, title, modalEl, hostEl) {
    if (!modalEl || !hostEl) return null;
    if (openDraggableWindows[key] && openDraggableWindows[key].isConnected) return openDraggableWindows[key];
    const existing = new Set(Array.from(document.querySelectorAll('[id^="div-"]')).map((el) => el.id));
    const mod = await draggableDivModule;
    mod.initDraggableDiv(title, modalEl, 'maximized');
    const created = Array.from(document.querySelectorAll('[id^="div-"]')).find((el) => !existing.has(el.id)) || null;
    if (created) {
        const closeBtn = created.querySelector('#draggable-div-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (modalEl && hostEl && !hostEl.contains(modalEl)) hostEl.appendChild(modalEl);
                openDraggableWindows[key] = null;
            }, { once: true });
        }
        openDraggableWindows[key] = created;
    }
    return created;
}

function closeDraggableModal(key, modalEl, hostEl) {
    const win = openDraggableWindows[key];
    if (win && win.isConnected) win.remove();
    openDraggableWindows[key] = null;
    if (modalEl && hostEl && !hostEl.contains(modalEl)) hostEl.appendChild(modalEl);
}

function promptPassword(messageText) {
    const overlay = document.getElementById('password-modal-overlay');
    const modal = document.getElementById('password-modal');
    const messageEl = document.getElementById('password-modal-message');
    const input = document.getElementById('password-modal-input');
    const revealCheckbox = document.getElementById('password-modal-reveal');
    const okBtn = document.getElementById('password-modal-ok');
    const cancelBtn = document.getElementById('password-modal-cancel');

    return new Promise((resolve) => {
        let resolved = false;
        function finish(value) {
            if (resolved) return;
            resolved = true;
            closeDraggableModal('password-modal', modal, overlay);
            input.value = '';
            input.type = 'password';
            if (revealCheckbox) revealCheckbox.checked = false;
            document.removeEventListener('keydown', onEscape);
            input.removeEventListener('keydown', onPasswordKeydown);
            resolve(value);
        }

        function onEscape(e) {
            if (e.key === 'Escape') finish(null);
        }

        function onPasswordKeydown(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                finish(input.value);
            }
        }

        messageEl.textContent = messageText;
        input.value = '';
        input.type = 'password';
        if (revealCheckbox) {
            revealCheckbox.checked = false;
            revealCheckbox.onchange = () => {
                input.type = revealCheckbox.checked ? 'text' : 'password';
            };
        }

        okBtn.onclick = () => finish(input.value);
        cancelBtn.onclick = () => finish(null);
        document.addEventListener('keydown', onEscape);
        input.addEventListener('keydown', onPasswordKeydown);
        openDraggableModal('password-modal', 'password', modal, overlay).then(() => input.focus());
    });
}

let totalTracker = document.getElementById("count");
let mainButton = document.getElementById("button");
const usNumberFormat = new Intl.NumberFormat('en-US');

function formatUsNumber(n) {
    return usNumberFormat.format(Number(n) || 0);
}

function readDisplayNumber(el) {
    return Number(String((el && el.textContent) || '').replace(/,/g, '')) || 0;
}

function schedulePersistClicker() {
    if (!sessionName || !clickerHydrated) return;
    clearTimeout(persistClickerTimer);
    persistClickerTimer = setTimeout(() => {
        persistClickerTimer = null;
        updateClickerCount();
    }, 2000);
}

mainButton.addEventListener("click", function(e) {
    count = count + increasePerClick;
    let added = increasePerClick;
    if (explosionChance > 0 && Math.random() < explosionChance) {
        count += explosionQuantity;
        added += explosionQuantity;
    }
    totalTracker.textContent = formatUsNumber(count);
    schedulePersistClicker();
    mainButton.style.animation = 'none';
    mainButton.offsetHeight;
    mainButton.style.animation = 'clickAnim 0.3s forwards';
    showClickAddition("mouse", e, added);
});

mainButton.addEventListener("animationend", function() {
    mainButton.style.animation = '';
});

let upgrades = [];

for (let i = 1; i < 100; i++) {
    upgrades[i] = document.getElementById(`upgrade${i}`);
}

let upgradeCost = [];

for (let i = 1; i < 100; i++) {
    upgradeCost[i] = document.getElementById(`upgrade${i}-cost`)
}

let upgradeLevel = [];

for (let i = 1; i < 100; i++) {
    upgradeLevel[i] = document.getElementById(`upgrade${i}-level`)
    if (upgradeLevel[i] != null) {
        upgradeLevel[i].textContent = "1";
    }
}

function renderUpgrade1Current() {
    const current = document.getElementById(`upgrade1-current`);
    if (current) current.textContent = `${formatUsNumber(increasePerClick)} / click`;
}
function renderUpgrade2Current() {
    const current = document.getElementById(`upgrade2-current`);
    if (current) current.textContent = `${formatUsNumber(perTick)} clicks / ${autoClickInterval}ms`;
}
function renderUpgrade3Current() {
    const current = document.getElementById(`upgrade3-current`);
    if (current) current.textContent = `${formatUsNumber(autoClickInterval)}ms per click`;
}
function renderUpgrade4Current() {
    const current = document.getElementById(`upgrade4-current`);
    if (!current) return;
    if (holdToClick) {
        current.textContent = `click every ${formatUsNumber(holdToClickInterval)}ms`;
    } else {
        current.textContent = `not unlocked`;
    }
}
function renderUpgrade5Current() {
    const current = document.getElementById(`upgrade5-current`);
    if (current) current.textContent = `${explosionChance * 100}% chance to explode for ${formatUsNumber(explosionQuantity)} clicks`;
}

// upgrade 1 block (click power) ----------------------------------
upgradeCost[1].textContent = formatUsNumber(20);
const baseCost1 = 20;
renderUpgrade1Current();

upgrades[1].addEventListener("click", function() {
    let currentCount = count;
    let currentCost = readDisplayNumber(upgradeCost[1]);

    if (currentCount >= currentCost && currentCost >= baseCost1) {
        increasePerClick++;
        setUpgradeLevelDisplay(1, increasePerClick - 1);
        renderUpgrade1Current();
        const newCount = currentCount - currentCost;
        count = newCount;
        totalTracker.textContent = formatUsNumber(newCount);
        const newCost = Math.round(currentCost * 2.5);
        upgradeCost[1].textContent = formatUsNumber(newCost);
        schedulePersistClicker();
    } else {
        return;
    }
})

// upgrade 2 block (passive income) ---------------------------------
upgradeCost[2].textContent = formatUsNumber(50);
const baseCost2 = 50;
renderUpgrade2Current();

upgrades[2].addEventListener("click", function() {
    let currentCount = count;
    let currentCost = readDisplayNumber(upgradeCost[2]);

    if (currentCount >= currentCost && currentCost >= baseCost2) {
        perTick++;
        setUpgradeLevelDisplay(2, perTick);
        renderUpgrade2Current();
        const newCount = currentCount - currentCost;
        count = newCount;
        totalTracker.textContent = formatUsNumber(newCount);
        const newCost = Math.round(currentCost * 5);
        upgradeCost[2].textContent = formatUsNumber(newCost);
        schedulePersistClicker();
    } else {
        return;
    }
})

// upgrade 3 block (auto click speed) --------------------------------------
upgradeCost[3].textContent = formatUsNumber(10000)
const baseCost3 = 10000;
renderUpgrade3Current();

upgrades[3].addEventListener("click", function() {
    let currentCount = count;
    let currentCost = readDisplayNumber(upgradeCost[3]);

    if (currentCount >= currentCost && currentCost >= baseCost3) {
        autoClickInterval /= 2;
        restartPassiveTimer();
        upgrade3Level++;
        setUpgradeLevelDisplay(3, upgrade3Level);
        renderUpgrade3Current();
        const newCount = currentCount - currentCost;
        count = newCount;
        totalTracker.textContent = formatUsNumber(newCount);
        const newCost = Math.round(currentCost * 10);
        upgradeCost[3].textContent = formatUsNumber(newCost);
        schedulePersistClicker();
    } else {
        return;
    }
})

// upgrade 4 block (hold to click) --------------------------------------------
upgradeCost[4].textContent = formatUsNumber(50000);
const baseCost4 = 50000;
renderUpgrade4Current();

upgrades[4].addEventListener("click", function() {
    let currentCount = count;
    let currentCost = readDisplayNumber(upgradeCost[4]);

    if (currentCount >= currentCost && currentCost >= baseCost4 && !holdToClick) {
        holdToClick = true;
        holdToClickInterval = 1000;
        upgrade4Level++;
        setUpgradeLevelDisplay(4, upgrade4Level);
        const newCount = currentCount - currentCost;
        count = newCount;
        totalTracker.textContent = formatUsNumber(newCount);
        const newCost = Math.round(currentCost * 5);
        upgradeCost[4].textContent = formatUsNumber(newCost);
        schedulePersistClicker();
    } else if (currentCount >= currentCost && currentCost >= baseCost4 && holdToClick && holdToClickInterval > 100) {
        holdToClickInterval -= 100;
        upgrade4Level++;
        setUpgradeLevelDisplay(4, upgrade4Level);
        const newCount = currentCount - currentCost;
        count = newCount;
        totalTracker.textContent = formatUsNumber(newCount);
        const newCost = Math.round(currentCost * 10);
        upgradeCost[4].textContent = formatUsNumber(newCost);
        schedulePersistClicker();
    } else if (currentCount >= currentCost && currentCost >= baseCost4 && holdToClick && holdToClickInterval <= 100) {
        holdToClickInterval = Math.max(1, holdToClickInterval - 1);
        upgrade4Level++;
        setUpgradeLevelDisplay(4, upgrade4Level);
        const newCount = currentCount - currentCost;
        count = newCount;
        totalTracker.textContent = formatUsNumber(newCount);
        const newCost = Math.round(currentCost * 10);
        upgradeCost[4].textContent = formatUsNumber(newCost);
        schedulePersistClicker();
    } else {
        return;
    }
    renderUpgrade4Current();
});

// upgrade 5 block (explosions) --------------------------------------------
upgradeCost[5].textContent = formatUsNumber(100000);
const baseCost5 = 100000;
renderUpgrade5Current();

upgrades[5].addEventListener("click", function() {
    let currentCount = count;
    let currentCost = readDisplayNumber(upgradeCost[5]);

    if (currentCount >= currentCost && currentCost >= baseCost5) {
        applyExplosionPurchase();
        upgrade5Level++;
        setUpgradeLevelDisplay(5, upgrade5Level);
        renderUpgrade5Current();
        const newCount = currentCount - currentCost;
        count = newCount;
        totalTracker.textContent = formatUsNumber(newCount);
        const newCost = Math.round(currentCost * 10);
        upgradeCost[5].textContent = formatUsNumber(newCost);
        schedulePersistClicker();
    } else {
        return;
    }
});

// run the passive skills ---------------------------------------
function addPassive() {
    if (perTick <= 0) return;
    let added = 0;
    for (let i = 0; i < perTick; i++) {
        added += increasePerClick;
        count += increasePerClick;
        if (explosionChance > 0 && Math.random() < explosionChance) {
            count += explosionQuantity;
            added += explosionQuantity;
        }
    }
    totalTracker.textContent = formatUsNumber(count);
    schedulePersistClicker();
    mainButton.style.animation = 'none';
    mainButton.offsetHeight;
    mainButton.style.animation = 'clickAnim 0.3s forwards';
    showClickAddition("button", null, added);
};

let passiveTimer = null;
function restartPassiveTimer() {
    clearInterval(passiveTimer);
    passiveTimer = setInterval(addPassive, autoClickInterval);
}

function holdAndClick() {
    if (holdToClick) {
        let added = increasePerClick;
        count = count + increasePerClick;
        if (explosionChance > 0 && Math.random() < explosionChance) {
            count += explosionQuantity;
            added += explosionQuantity;
        }
        totalTracker.textContent = formatUsNumber(count);
        schedulePersistClicker();
        mainButton.style.animation = 'none';
        mainButton.offsetHeight;
        mainButton.style.animation = 'clickAnim 0.3s forwards';
        showClickAddition("hold", null, added);
    }
};

mainButton.addEventListener("mousedown", function() {
    buttonHeld = true;
    lastHoldClickAt = Date.now();
});

mainButton.addEventListener("mouseup", function() {
    buttonHeld = false;
});

mainButton.addEventListener("mouseleave", function() {
    buttonHeld = false;
});
setInterval(function() {
    if (!holdToClick || !buttonHeld) return;
    const now = Date.now();
    const gap = Math.max(50, holdToClickInterval);
    if (now - lastHoldClickAt < gap) return;
    lastHoldClickAt = now;
    holdAndClick();
}, 50);

mainButton.addEventListener("animationend", function() {
    mainButton.style.animation = '';
});

restartPassiveTimer();

// for the buttons to be greyed out when unaffordable ----------------------------------
function unaffordableButtons() {
    for (let i = 1; i < 100; i++) {
        if (upgradeCost[i] == null || upgrades[i] == null) continue;
        if (readDisplayNumber(upgradeCost[i]) > count) {
            upgrades[i].style.opacity = "30%";
        } else {
            upgrades[i].style.opacity = "100%";
        }
    }
}

setInterval(unaffordableButtons, 100);

// to show little numbers when each click adds to the total ----------------------------------
// first, we get the position of the mouse
function getMousePos(ev) {
    if (!ev) return { x: 0, y: 0 };
    return { x: ev.clientX, y: ev.clientY };
}

// then, create the actual numbers
function showClickAddition(locationOfAddition, ev, addedAmount) {
    const clickAddition = document.createElement("div");
    clickAddition.classList.add("click-addition");
    const amount = addedAmount != null ? addedAmount : increasePerClick;
    clickAddition.textContent = `+${formatUsNumber(amount)}`;
    if (locationOfAddition == "mouse") {
        const p = getMousePos(ev);
        clickAddition.style.left = p.x + "px";
        clickAddition.style.top = p.y + "px";
    } else if (locationOfAddition == "button") {
        const r = mainButton.getBoundingClientRect();
        clickAddition.style.left = (r.left + r.width / 2) + "px";
        clickAddition.style.top = r.top + "px";
    } else if (locationOfAddition == "hold") {
        const r = mainButton.getBoundingClientRect();
        clickAddition.style.left = (r.left + r.width * 0.75) + "px";
        clickAddition.style.top = (r.top + r.height * 0.35) + "px";
    } else {
        console.error("Invalid location for click addition");
    }
    // personally i love doing css via js
    clickAddition.style.zIndex = "1000";
    clickAddition.style.color = "aliceblue";
    clickAddition.style.fontSize = "2em";
    clickAddition.style.position = "absolute";
    clickAddition.style.animation = "clickAdditionAnim 5s forwards";
    clickAddition.style.cursor = "default";
    clickAddition.style.userSelect = "none";
    clickAddition.style.pointerEvents = "none";
    clickAddition.style.webkitUserSelect = "none";
    clickAddition.style.webkitTapHighlightColor = "transparent";
    clickAddition.style.webkitTouchCallout = "none";
    clickAddition.style.webkitUserSelect = "none";
    clickAddition.style.webkitTapHighlightColor = "transparent";
    clickAddition.style.webkitTouchCallout = "none";
    document.body.appendChild(clickAddition);
    setTimeout(() => {
        clickAddition.remove();
    }, 5000);
}

// login ---------------------------------------------------------------------------------
function enterGardens(name) {
    sessionName = String(name || '').trim();
    if (!sessionName) return;
    clearTimeout(persistClickerTimer);
    persistClickerTimer = null;
    clickerHydrated = false;
    clickerHydrateGen++;
    document.getElementById('setup').style.display = 'none';
    document.getElementById('botanic-gardens-container').style.display = '';
    setClickerInteractionEnabled(false);
    fetchClickerCount();
}

// fetch/update clicker count ---------------------------------------------------------------------------------
function fetchClickerCount() {
    if (!sessionName) return;
    const gen = ++clickerHydrateGen;
    fetch('/api/clicker/count', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sessionName })
    })
        .then(async (r) => {
            let data = {};
            try {
                data = await r.json();
            } catch (e) {
                console.error(e);
                return;
            }
            if (gen !== clickerHydrateGen) return;
            if (!r.ok || data.error) {
                console.error(data.error || 'failed to load clicker count');
                setClickerInteractionEnabled(true);
                return;
            }
            const n = data.clicker_count != null ? Number(data.clicker_count) : 0;
            count = Number.isFinite(n) ? n : 0;
            totalTracker.textContent = formatUsNumber(count);
            const u1 = data.upgrade1_level != null ? Number(data.upgrade1_level) : 0;
            const u2 = data.upgrade2_level != null ? Number(data.upgrade2_level) : 0;
            const u3 = data.upgrade3_level != null ? Number(data.upgrade3_level) : 0;
            const u4 = data.upgrade4_level != null ? Number(data.upgrade4_level) : 0;
            const u5 = data.upgrade5_level != null ? Number(data.upgrade5_level) : 0;
            const p1 = Number.isFinite(u1) && u1 >= 0 ? Math.floor(u1) : 0;
            const p2 = Number.isFinite(u2) && u2 >= 0 ? Math.floor(u2) : 0;
            const p3 = Number.isFinite(u3) && u3 >= 0 ? Math.floor(u3) : 0;
            const p4 = Number.isFinite(u4) && u4 >= 0 ? Math.floor(u4) : 0;
            const p5 = Number.isFinite(u5) && u5 >= 0 ? Math.floor(u5) : 0;
            increasePerClick = 1 + p1;
            perTick = p2;
            autoClickInterval = Math.max(50, Math.floor(1000 / Math.pow(2, p3)));
            restartPassiveTimer();
            renderUpgrade2Current();
            holdToClick = p4 > 0;
            holdToClickInterval = Math.max(50, 1000 - Math.max(0, p4 - 1) * 100);
            upgrade3Level = p3;
            upgrade4Level = p4;
            upgrade5Level = p5;
            explosionChance = 0;
            explosionQuantity = 0;
            for (let i = 0; i < p5; i++) applyExplosionPurchase();
            renderUpgrade1Current();
            renderUpgrade3Current();
            renderUpgrade4Current();
            renderUpgrade5Current();
            setUpgradeLevelDisplay(1, p1);
            setUpgradeLevelDisplay(2, p2);
            setUpgradeLevelDisplay(3, p3);
            setUpgradeLevelDisplay(4, p4);
            setUpgradeLevelDisplay(5, p5);
            if (upgradeCost[1]) upgradeCost[1].textContent = formatUsNumber(botanicUpgradeCost1(p1));
            if (upgradeCost[2]) upgradeCost[2].textContent = formatUsNumber(botanicUpgradeCost2(p2));
            if (upgradeCost[3]) upgradeCost[3].textContent = formatUsNumber(botanicUpgradeCost3(p3));
            if (upgradeCost[4]) upgradeCost[4].textContent = formatUsNumber(botanicUpgradeCost4(p4));
            if (upgradeCost[5]) upgradeCost[5].textContent = formatUsNumber(botanicUpgradeCost5(p5));
            clickerHydrated = true;
            setClickerInteractionEnabled(true);
        })
        .catch((e) => {
            console.error(e);
            if (gen === clickerHydrateGen) setClickerInteractionEnabled(true);
        });
}

function updateClickerCount() {
    if (!sessionName || !clickerHydrated) return;
    fetch('/api/clicker/update-count', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ name: sessionName, newCount: count }, botanicSaveLevelsPayload()))
    })
        .then((r) => r.json())
        .then((data) => {
            if (!data.success) console.error(data.error || 'save failed');
        })
        .catch((e) => console.error(e));
}

setInterval(updateClickerCount, 60000);

function flushPersistClickerKeepalive(onDone) {
    clearTimeout(persistClickerTimer);
    persistClickerTimer = null;
    if (!sessionName || !clickerHydrated) {
        if (onDone) onDone();
        return;
    }
    fetch('/api/clicker/update-count', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ name: sessionName, newCount: count }, botanicSaveLevelsPayload())),
        keepalive: true
    })
        .catch(() => { })
        .finally(() => {
            if (onDone) onDone();
        });
}

window.addEventListener('pagehide', () => flushPersistClickerKeepalive());
window.addEventListener('beforeunload', () => flushPersistClickerKeepalive());
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersistClickerKeepalive();
});
window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || e.data.type !== 'vodalus-botanic-flush') return;
    flushPersistClickerKeepalive(() => {
        if (e.source && e.source !== window) {
            try {
                e.source.postMessage({ type: 'vodalus-botanic-flush-done' }, location.origin);
            } catch (err) { }
        }
    });
});

// login button ---------------------------------------------------------------------------------
document.getElementById('input-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('join-btn').click();
});
document.getElementById('join-btn').addEventListener('click', () => {
    const name = document.getElementById('input-name').value.trim();
    if (!name) return alert('please enter a nickname.');
    const tryLogin = (password = null) =>
        fetch('/api/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, password })
        });
    (async () => {
        try {
            let r = await tryLogin();
            if (r.status === 401) {
                const pw = await promptPassword('You have entered a protected nickname. Please enter the password to join.');
                if (pw == null || pw === '') return alert('You have failed to enter a password. Cannot use protected nickname.');
                const retry = await tryLogin(pw);
                if (!retry.ok) {
                    const res = await retry.json();
                    return alert(res.error || 'Wrong password for nickname. If you have forgotten this password, contact Jolenta to reclaim it.');
                }
                enterGardens(name);
            } else if (!r.ok) {
                const res = await r.json();
                return alert(res.error || 'Login failed.');
            } else {
                const pw = await promptPassword(
                    'You have entered a new nickname! \n \nEnter a password here if you would like to claim it. If you leave this blank and press OK, your nickname will be unclaimed.'
                );
                if (pw != null && pw.trim() !== '') {
                    const reg = await fetch('/api/register', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, password: pw.trim() })
                    });
                    const res = await reg.json();
                    if (res.error) return alert(res.error);
                }
                enterGardens(name);
            }
        } catch (err) {
            alert(err.message || 'Network/login error.');
        }
    })();
});

fetch('/api/me', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => {
        if (data && data.nickname) enterGardens(data.nickname);
    })
    .catch(() => { });

