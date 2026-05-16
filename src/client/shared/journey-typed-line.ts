// @ts-nocheck
(function (global) {
  function appendJourneyListLine(ul, text, useHtml, durationMs) {
    if (!ul) return;
    let li = document.createElement('li');
    if (useHtml) {
      li.innerHTML = text;
      ul.appendChild(li);
      return;
    }
    let plain = text == null ? '' : String(text);
    let n = plain.length;
    if (!n || !durationMs) {
      li.textContent = plain;
      ul.appendChild(li);
      return;
    }
    li.textContent = '';
    ul.appendChild(li);
    let start = performance.now();
    let dpc = durationMs / n;
    function frame(now) {
      let elapsed = now - start;
      let k = Math.min(n, Math.floor(elapsed / dpc) + 1);
      li.textContent = plain.slice(0, k);
      if (k < n) requestAnimationFrame(frame);
      else li.textContent = plain;
    }
    requestAnimationFrame(frame);
  }
  global.appendJourneyListLine = appendJourneyListLine;
})(typeof window !== 'undefined' ? window : this);
