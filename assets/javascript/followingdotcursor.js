"use strict";
export function followingDotCursor(options) {
  let hasWrapperEl = options && options.element;
  let element = hasWrapperEl || document.body;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let cursor = { x: width / 2, y: height / 2 };
  let dot = new Dot(width / 2, height / 2, 10, 10);
  let canvas, context, animationFrame;
  let color = options?.color || "#323232a6";
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  prefersReducedMotion.onchange = () => {
    if (prefersReducedMotion.matches) {
      destroy();
    } else {
      init();
    }
  };
  function init() {
    if (prefersReducedMotion.matches) {
      console.log(
        "This browser has prefers reduced motion turned on, so the cursor did not init"
      );
      return false;
    }
    canvas = document.createElement("canvas");
    context = canvas.getContext("2d");
    canvas.style.top = "0px";
    canvas.style.left = "0px";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = options?.zIndex || "9999999999";
    if (hasWrapperEl) {
      canvas.style.position = "absolute";
      element.appendChild(canvas);
      canvas.width = element.clientWidth;
      canvas.height = element.clientHeight;
    } else {
      canvas.style.position = "fixed";
      document.body.appendChild(canvas);
      canvas.width = width;
      canvas.height = height;
    }
    bindEvents();
    loop();
  }
  function bindEvents() {
    element.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onWindowResize);
  }
  function onWindowResize(e) {
    width = window.innerWidth;
    height = window.innerHeight;
    if (hasWrapperEl) {
      canvas.width = element.clientWidth;
      canvas.height = element.clientHeight;
    } else {
      canvas.width = width;
      canvas.height = height;
    }
  }
  function onMouseMove(e) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rw = rect.width;
    const rh = rect.height;
    if (rw > 0 && rh > 0) {
      cursor.x = (e.clientX - rect.left) * canvas.width / rw;
      cursor.y = (e.clientY - rect.top) * canvas.height / rh;
    } else {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
    }
  }
  function updateDot() {
    context.clearRect(0, 0, width, height);
    dot.moveTowards(cursor.x, cursor.y, context);
  }
  function loop() {
    updateDot();
    animationFrame = requestAnimationFrame(loop);
  }
  function destroy() {
    if (animationFrame != null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    element.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("resize", onWindowResize);
    if (canvas) {
      canvas.remove();
      canvas = void 0;
      context = void 0;
    }
  }
  function Dot(x, y, width2, lag) {
    this.position = { x, y };
    this.width = width2;
    this.lag = lag;
    this.moveTowards = function(x2, y2, context2) {
      this.position.x += (x2 - this.position.x) / this.lag;
      this.position.y += (y2 - this.position.y) / this.lag;
      context2.fillStyle = color;
      context2.beginPath();
      context2.arc(this.position.x, this.position.y, this.width, 0, 2 * Math.PI);
      context2.fill();
      context2.closePath();
    };
  }
  init();
  return {
    destroy
  };
}
//# sourceMappingURL=followingdotcursor.js.map
