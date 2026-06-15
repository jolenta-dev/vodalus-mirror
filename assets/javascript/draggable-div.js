"use strict";
export function initDraggableDiv(header, content, state = "minimized") {
  if (content instanceof HTMLIFrameElement) {
    let src = content.getAttribute("src") || content.src || "";
    if (/botanic-gardens/i.test(src)) {
      for (const w of document.querySelectorAll('[id^="div-"]')) {
        let iframe = w.querySelector("#draggable-div-content iframe");
        if (!iframe) continue;
        let isrc = iframe.getAttribute("src") || iframe.src || "";
        if (!/botanic-gardens/i.test(isrc)) continue;
        let maxZ = 9;
        for (const o of document.querySelectorAll('[id^="div-"]')) {
          let z = parseInt(o.style.zIndex, 10);
          if (Number.isFinite(z)) maxZ = Math.max(maxZ, z);
        }
        w.style.zIndex = String(maxZ + 1);
        content.remove();
        return;
      }
    }
  }
  let draggableDiv;
  const isIframe = content instanceof HTMLIFrameElement;
  const slotOrder = isIframe ? [0, 1, 2, 3, 4] : [4, 0, 1, 2, 3];
  for (const i of slotOrder) {
    if (document.getElementById(`div-${i}`) != null) continue;
    draggableDiv = document.createElement("div");
    draggableDiv.id = `div-${i}`;
    break;
  }
  if (!draggableDiv && !isIframe) {
    for (let i = 5; i < 64; i++) {
      if (document.getElementById(`div-${i}`) != null) continue;
      draggableDiv = document.createElement("div");
      draggableDiv.id = `div-${i}`;
      break;
    }
  }
  if (!draggableDiv) return;
  draggableDiv.innerHTML = `
                  <div id="draggable-div-header">
                  <div id="draggable-div-close">x</div>
                  <div id="draggable-div-minimize">-</div>
                  <div id="draggable-div-header-text">${header}</div>
                  </div>
                  <div id="draggable-div-content"></div>
                  <div id="draggable-div-resize" aria-hidden="true"></div>
              `;
  let draggableDivHeader = draggableDiv.querySelector("#draggable-div-header");
  let draggableDivClose = draggableDiv.querySelector("#draggable-div-close");
  let draggableDivMinimize = draggableDiv.querySelector("#draggable-div-minimize");
  let draggableDivHeaderText = draggableDiv.querySelector("#draggable-div-header-text");
  let draggableDivContent = draggableDiv.querySelector("#draggable-div-content");
  let draggableDivResize = draggableDiv.querySelector("#draggable-div-resize");
  if (content instanceof Node) {
    draggableDivContent.appendChild(content);
  } else {
    draggableDivContent.innerHTML = content;
  }
  if (content instanceof HTMLIFrameElement) {
    Object.assign(draggableDivContent.style, { minHeight: "0" });
    Object.assign(content.style, {
      width: "100%",
      height: "100%",
      border: "0",
      boxSizing: "border-box",
      display: "block",
      verticalAlign: "top"
    });
  }
  document.body.appendChild(draggableDiv);
  let iframeW = "512px";
  let iframeH = "288px";
  if (isIframe && /botanic-gardens/i.test(content.getAttribute("src") || content.src || "")) {
    iframeW = "1000px";
    iframeH = "500px";
  }
  Object.assign(draggableDivHeaderText.style, {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    margin: "auto auto",
    width: "100%",
    fontFamily: '"Meylda", ui-serif, Georgia, "Times New Roman", serif'
  });
  Object.assign(draggableDiv.style, {
    position: "absolute",
    zIndex: "9",
    width: isIframe ? iframeW : "auto",
    height: isIframe ? iframeH : "auto",
    backgroundColor: "#f1f1f1",
    textAlign: "center",
    border: "1px solid #d3d3d3",
    borderRadius: "8px",
    overflow: "visible",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    maxWidth: isIframe ? "calc(100vw - 16px)" : "min(512px, calc(100vw - 200px))",
    maxHeight: isIframe ? "calc(100vh - 16px)" : "288px"
  });
  Object.assign(draggableDivContent.style, {
    overflow: "auto",
    minWidth: "0",
    flex: "1 1 auto",
    borderRadius: "0 0 8px 8px"
  });
  Object.assign(draggableDivResize.style, {
    position: "absolute",
    right: "0",
    bottom: "0",
    width: "14px",
    height: "14px",
    cursor: "nwse-resize",
    zIndex: "11"
  });
  const headerButtonStyle = {
    cursor: "pointer",
    borderStyle: "solid",
    padding: "5px",
    margin: "2.5px",
    height: "10px",
    width: "10px",
    borderRadius: "20%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: '"Nedar", ui-sans-serif, system-ui, sans-serif'
  };
  [draggableDivClose].forEach(
    (el) => Object.assign(el.style, headerButtonStyle, { backgroundColor: "red" })
  );
  [draggableDivMinimize].forEach(
    (el) => Object.assign(el.style, headerButtonStyle)
  );
  Object.assign(draggableDivHeader.style, {
    display: "flex",
    padding: "10px",
    cursor: "move",
    zIndex: "10",
    backgroundColor: "#9a7cb6",
    color: "#fff",
    borderRadius: "8px 8px 0 0"
  });
  placeExpandedInMain(draggableDiv);
  dragElement(draggableDiv);
  function placeExpandedInMain(el) {
    void el.offsetHeight;
    let w = el.offsetWidth || 256;
    let h = el.offsetHeight || 144;
    let pad = 8;
    let main = document.querySelector(".main");
    if (main) {
      let m = main.getBoundingClientRect();
      let left = m.right - w - pad;
      let top = m.top + pad;
      left = Math.max(m.left + pad, Math.min(left, m.right - w - pad));
      top = Math.max(m.top + pad, Math.min(top, m.bottom - h - pad));
      el.style.left = left + "px";
      el.style.top = top + "px";
    } else {
      el.style.left = Math.max(pad, window.innerWidth - w - pad) + "px";
      el.style.top = pad + "px";
    }
  }
  function dragElement(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let preMinimizeTop = 0, preMinimizeLeft = 0;
    let preMinimizeHeightStyle = "";
    let contentEl = element.querySelector("#draggable-div-content");
    let minimizeEl = element.querySelector("#draggable-div-minimize");
    let resizeEl = element.querySelector("#draggable-div-resize");
    const headerBar = element.querySelector("#draggable-div-header");
    if (headerBar) {
      headerBar.onmousedown = dragMouseDown;
    } else {
      element.onmousedown = dragMouseDown;
    }
    function dragMouseDown(e) {
      e = e || window.event;
      if (contentEl.style.display === "none")
        return;
      e.preventDefault();
      element.style.transition = "";
      if (element.style.position === "fixed") {
        let br = element.getBoundingClientRect();
        let sx = window.scrollX || 0;
        let sy = window.scrollY || 0;
        element.style.position = "absolute";
        element.style.top = br.top + sy + "px";
        element.style.left = br.left + sx + "px";
        element.style.bottom = "auto";
        element.style.right = "auto";
      } else if (element.style.bottom || element.style.right) {
        element.style.top = element.offsetTop + "px";
        element.style.left = element.offsetLeft + "px";
        element.style.bottom = "auto";
        element.style.right = "auto";
      }
      pos3 = e.clientX;
      pos4 = e.clientY;
      if (isIframe) content.style.pointerEvents = "none";
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = element.offsetTop - pos2 + "px";
      element.style.left = element.offsetLeft - pos1 + "px";
    }
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
      if (isIframe) content.style.pointerEvents = "";
    }
    function toggleMinimize() {
      let headerBar2 = element.querySelector("#draggable-div-header");
      if (contentEl.style.display === "none") {
        let sx0 = window.scrollX || 0;
        let sy0 = window.scrollY || 0;
        let r0 = element.getBoundingClientRect();
        element.style.position = "absolute";
        element.style.top = r0.top + sy0 + "px";
        element.style.left = r0.left + sx0 + "px";
        element.style.bottom = "auto";
        element.style.right = "auto";
        element.style.height = preMinimizeHeightStyle;
        contentEl.style.display = "block";
        contentEl.style.opacity = "1";
        contentEl.style.transition = "opacity 0.3s ease";
        element.style.transition = "none";
        void element.offsetHeight;
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            element.style.transition = "top 0.5s ease, left 0.5s ease";
            element.style.top = preMinimizeTop + "px";
            element.style.left = preMinimizeLeft + "px";
          });
        });
        minimizeEl.textContent = "-";
        resizeEl.style.display = "";
      } else {
        preMinimizeTop = element.offsetTop;
        preMinimizeLeft = element.offsetLeft;
        preMinimizeHeightStyle = element.style.height;
        contentEl.style.display = "none";
        contentEl.style.opacity = "0";
        resizeEl.style.display = "none";
        element.style.height = headerBar2.offsetHeight + "px";
        let rect = element.getBoundingClientRect();
        let pad = 8;
        let main = document.querySelector(".main");
        let mrect = main ? main.getBoundingClientRect() : null;
        let wantRightX = (mrect ? mrect.right : window.innerWidth) - pad;
        let minRightX = (mrect ? mrect.left : 0) + pad + rect.width;
        wantRightX = Math.max(
          minRightX,
          Math.min(
            wantRightX,
            (mrect ? mrect.right : window.innerWidth) - pad
          )
        );
        let startRight = window.innerWidth - rect.right;
        let startBottom = window.innerHeight - rect.bottom;
        let endRight = window.innerWidth - wantRightX;
        element.style.transition = "none";
        element.style.position = "fixed";
        element.style.top = "auto";
        element.style.left = "auto";
        element.style.right = startRight + "px";
        element.style.bottom = startBottom + "px";
        void element.offsetHeight;
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            element.style.transition = "bottom 0.5s ease, right 0.5s ease";
            element.style.bottom = pad + "px";
            element.style.right = endRight + "px";
          });
        });
        minimizeEl.textContent = "+";
      }
      headerBar2.style.cursor = "move";
    }
    draggableDivClose.addEventListener("click", () => {
      function removePanel() {
        element.remove();
      }
      if (isIframe && content instanceof HTMLIFrameElement && content.contentWindow) {
        let src = content.getAttribute("src") || content.src || "";
        if (/botanic-gardens/i.test(src)) {
          let onFlushDone2 = function(ev) {
            if (ev.source !== content.contentWindow) return;
            if (!ev.data || ev.data.type !== "vodalus-botanic-flush-done") return;
            finished = true;
            window.removeEventListener("message", onFlushDone2);
            removePanel();
          };
          var onFlushDone = onFlushDone2;
          let finished = false;
          window.addEventListener("message", onFlushDone2);
          try {
            content.contentWindow.postMessage(
              { type: "vodalus-botanic-flush" },
              location.origin
            );
          } catch (err) {
            window.removeEventListener("message", onFlushDone2);
            removePanel();
            return;
          }
          window.setTimeout(function() {
            if (!finished) {
              window.removeEventListener("message", onFlushDone2);
              removePanel();
            }
          }, 4e3);
          return;
        }
      }
      removePanel();
    });
    draggableDivMinimize.addEventListener("click", () => {
      toggleMinimize();
    });
    resizeEl.addEventListener("mousedown", function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (contentEl.style.display === "none")
        return;
      let startX = e.clientX;
      let startY = e.clientY;
      let startW = element.offsetWidth;
      let startH = element.offsetHeight;
      element.style.transition = "";
      if (isIframe) content.style.pointerEvents = "none";
      function onMove(ev) {
        ev.preventDefault();
        element.style.width = Math.max(220, startW + ev.clientX - startX) + "px";
        element.style.height = Math.max(72, startH + ev.clientY - startY) + "px";
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        if (isIframe) content.style.pointerEvents = "";
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
    if (state === "minimized") {
      toggleMinimize();
    }
  }
  if (window.applyConveneNavUnreadMarker) window.applyConveneNavUnreadMarker();
}
//# sourceMappingURL=draggable-div.js.map
