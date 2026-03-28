(function (global) {
  function appendJourneyListLine(ul, text, useHtml, durationMs) {
    if (!ul) return;
    var li = document.createElement('li');
    if (useHtml) {
      li.innerHTML = text;
      ul.appendChild(li);
      return;
    }
    var plain = text == null ? '' : String(text);
    var n = plain.length;
    if (!n || !durationMs) {
      li.textContent = plain;
      ul.appendChild(li);
      return;
    }
    li.textContent = '';
    ul.appendChild(li);
    var start = performance.now();
    var dpc = durationMs / n;
    function frame(now) {
      var elapsed = now - start;
      var k = Math.min(n, Math.floor(elapsed / dpc) + 1);
      li.textContent = plain.slice(0, k);
      if (k < n) requestAnimationFrame(frame);
      else li.textContent = plain;
    }
    requestAnimationFrame(frame);
  }
  global.appendJourneyListLine = appendJourneyListLine;
})(typeof window !== 'undefined' ? window : this);
