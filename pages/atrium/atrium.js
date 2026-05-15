let atriumClockHandle = null;
let atriumClockLoading = null;
let atriumClockSeq = 0;
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
function syncAtriumClockCursor() {
  const entrance = document.getElementById('entrance');
  if (!entrance) return;
  const pastEntrance = getComputedStyle(entrance).display === 'none';

  if (!pastEntrance) {
    atriumClockSeq++;
    if (atriumClockHandle) {
      atriumClockHandle.destroy();
      atriumClockHandle = null;
    }
    return;
  }

  if (typeof window.pointerOrbitDestroy === 'function') {
    window.pointerOrbitDestroy();
  }

  if (atriumClockHandle || atriumClockLoading) return;
  const seq = atriumClockSeq;
  atriumClockLoading = import('/assets/javascript/clock-cursor.js').then(({ clockCursor }) => {
    atriumClockLoading = null;
    if (seq !== atriumClockSeq) return;
    if (atriumClockHandle) return;
    atriumClockHandle = clockCursor({
      element: document.body,
      dateColor: 'aliceblue',
      faceColor: 'skyblue',
      secondsColor: 'red',
      minutesColor: 'lightpink',
      hoursColor: 'pink'
    });
  }).catch(() => {
    atriumClockLoading = null;
  });
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

function postPhraseRedeemEffects(name, journeyLevel, password, prestigeLevel) {
  const isJolenta = String(name || '').trim().toLowerCase() === 'jolenta';
  const hasPrestiged = Number(prestigeLevel) > 0;
  if (journeyLevel < 4) {
    fetch('/api/announcements/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ event: 'phrase_redeemed', name })
    });
  }
  switch (journeyLevel) {
    case 1:
      if (!isJolenta && !hasPrestiged) submitColorsDecorations(name, '#9665fc', '⋆˚꩜｡', password);
      fetch('/api/announcements/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ event: 'vip_granted', name })
      });
      break;
    case 2:
      if (!isJolenta && !hasPrestiged) submitColorsDecorations(name, '#f1d4fa', '⋆ ˚｡⋆୨୧˚', password);
      break;
    case 3:
      if (!isJolenta && !hasPrestiged) submitColorsDecorations(name, '#ff3db2', '₊˚⊹♡', password);
      break;
    default:
      if (journeyLevel >= 4) {
        document.getElementById('atrium').style.display = 'none';
        document.getElementById('entrance').style.display = 'none';
        if (isJolenta) {
          document.getElementById('atrium-finished').style.display = 'block';
        } else {
          document.getElementById('colors-decorations').style.display = 'block';
          const colorsName = document.getElementById('name-input-colors');
          if (colorsName) colorsName.value = name;
        }
        fetch('/api/announcements/system', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ event: 'all_gambling_complete', name })
        });
        syncAtriumClockCursor();
      } else {
        alert('Failed to set colors and decorations. Please try again.');
      }
      break;
  }
}

document.getElementById('submit-btn').addEventListener('click', async () => {
  const name = document.getElementById('name-input').value.trim();
  const phrase = document.getElementById('phrase-input').value.trim();
  if (!name) return alert('Please enter your name.');
  if (!phrase) return alert('Please enter the phrase of the Increate\'s creation.');
  const tryRedeem = (password = null) => fetch('/api/phrase_redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phrase, password })
  });
  const r = await tryRedeem();
  if (r.status === 403) {
    const err = await r.json().catch(() => ({}));
    if (err.code === 'register_first' || (err.error && err.error.includes('registered'))) {
      const pw = await promptPassword('This name is not registered. Enter a password to register and redeem the phrase.');
      if (!pw) return alert('A password is required to register this name.');
      const reg = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password: pw })
      });
      if (!reg.ok) {
        const regErr = await reg.json().catch(() => ({}));
        return alert(regErr.error || 'Registration failed. Please try again.');
      }
      const retry = await tryRedeem(pw);
      if (!retry.ok) {
        const retryErr = await retry.json().catch(() => ({}));
        return alert(retryErr.error || 'Redeem failed after registration.');
      }
      const retryData = await retry.json();
      alert('Congratulations, Lictor. You have advanced to the next level of Autarchy (gambling addiction).');
      postPhraseRedeemEffects(name, retryData.journey_level, pw, retryData.prestige_level);
      return;
    }
  }
  if (r.status === 401) {
    const pw = await promptPassword('This nickname is protected. Enter your password to redeem the phrase.');
    if (!pw) return alert('Password required to use this nickname.');
    const retry = await tryRedeem(pw);
    if (!retry.ok) {
      const err = await retry.json().catch(() => ({}));
      return alert(err.error || 'Wrong password. If you have forgotten it, contact Jolenta.');
    }
    const data = await retry.json();
    alert('Congratulations, Lictor. You have advanced to the next level of Autarchy (gambling addiction).');
    postPhraseRedeemEffects(name, data.journey_level, pw, data.prestige_level);
    return;
  }
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    const msg = err.error || (r.status === 404 ? 'Phrase not found.' : r.status === 409 ? 'Phrase already used.' : 'Redeem failed.');
    return alert(msg);
  }
  const data = await r.json();
  if (data.success) {
    alert('Congratulations, Lictor. You have advanced to the next level of Autarchy (gambling addiction).');
    postPhraseRedeemEffects(name, data.journey_level, null, data.prestige_level);
  }
});
const onAtriumEnter = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('submit-btn').click();
  }
};
document.getElementById('name-input').addEventListener('keydown', onAtriumEnter);
document.getElementById('phrase-input').addEventListener('keydown', onAtriumEnter);

async function incrementWinCount(name, password = null) {
  if (!name) return alert('Please enter a protected nickname.');
  let keyResponse = await fetch('/api/winner_key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password })
  });
  let keyData = await keyResponse.json().catch(() => ({}));
  if (keyResponse.status === 401) {
    const pw = await promptPassword('This nickname is protected. Enter your password to continue.');
    if (!pw) return alert('Password required to use this nickname.');
    keyResponse = await fetch('/api/winner_key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password: pw })
    });
    keyData = await keyResponse.json().catch(() => ({}));
  }
  if (!keyResponse.ok || !keyData.success || !keyData.key) {
    return alert(keyData.error || 'Could not authorize this level-up.');
  }
  fetch('/api/winner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, key: keyData.key })
  }).then(r => r.json()).then(data => {
    if (data.success) {
      alert('Congratulations, Lictor. You have advanced to the next level of Autarchy (gambling addiction)');
    } else {
      alert(data.error || 'Failed to increment win count. Please try again.');
    }
  }).catch(error => {
    alert('Network error: ' + error.message);
  });
}

function submitColorsDecorations(name, color, decoration, password = null) {
  if (!name || !color || !decoration) return alert('Please enter a name, color, and decoration.');
  fetch('/api/colors_decoration', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, color, decoration, password })
  }).then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('Colors and decorations submitted. Welcome to Autarchy.');
      } else {
        alert('Failed to submit colors and decorations. Please try again.');
      }
    }).catch(error => {
      alert('Network error: ' + error.message);
    });
}

document.getElementById('enter-btn').addEventListener('click', () => {
  document.getElementById('entrance').style.display = 'none';
  document.getElementById('atrium').style.display = 'block';
  syncAtriumClockCursor();
});

document.getElementById('submit-colors-decorations-btn').addEventListener('click', async () => {
  const name = document.getElementById('name-input-colors').value.trim();
  let hex = document.getElementById('color-input').value.trim().replace(/^#/, '');
  const decoration = document.getElementById('decoration-input').value.trim();
  if (!name) return alert('Please enter your name.');
  if (!hex) return alert('Please enter a hex color (6 characters, e.g. 9665fc).');
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return alert('Color must be exactly 6 hexadecimal digits (with or without #).');
  }
  if (!decoration) return alert('Please enter a decoration.');
  const color = '#' + hex;
  let password = null;
  const post = () => fetch('/api/colors_decoration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color, decoration, password })
  });
  let response = await post();
  if (response.status === 401) {
    const pw = await promptPassword('Enter your nickname password to save colors and decorations.');
    if (pw == null || pw === '') return alert('Password required to update this nickname.');
    password = pw;
    response = await post();
  }
  const data = await response.json().catch(() => ({}));
  if (data.success) {
    alert('Colors and decorations submitted. Welcome to Autarchy.');
    closeDraggableModal('password-modal', document.getElementById('password-modal'), document.getElementById('password-modal-overlay'));
    document.getElementById('colors-decorations').style.display = 'none';
    document.getElementById('atrium-finished').style.display = 'block';
  } else {
    alert(data.error || 'Failed to submit colors and decorations. Please try again.');
  }
});
const onColorsEnter = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('submit-colors-decorations-btn').click();
  }
};
document.getElementById('name-input-colors').addEventListener('keydown', onColorsEnter);
document.getElementById('color-input').addEventListener('keydown', onColorsEnter);
document.getElementById('decoration-input').addEventListener('keydown', onColorsEnter);
document.getElementById('corridors-btn').addEventListener('click', () => {
  document.getElementById('corridors').style.display = 'block';
  document.getElementById('atrium').style.display = 'none';
  syncAtriumClockCursor();
});
document.getElementById('prestige-btn').addEventListener('click', () => {
  const name = document.getElementById('name-input-prestige').value.trim();
  const password = document.getElementById('password-input-prestige').value.trim();
  if (!name) return alert('Please enter your name.');
  if (!password) return alert('Please enter your password.');
  fetch('/api/prestige_redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password })
  }).then(r => r.json()).then(data => {
    if (data.success) {
      alert('You begin anew.');
      fetch('/api/announcements/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ event: 'prestige_redeemed', name, prestige_level: data.prestige_level })
      });
    } else {
      alert(data.error || 'Failed to redeem prestige. Please try again.');
    }
  }).catch(error => {
    alert('Network error: ' + error.message);
  });
  document.getElementById('corridors').style.display = 'none';
  document.getElementById('atrium').style.display = 'block';
  syncAtriumClockCursor();
});
syncAtriumClockCursor();

