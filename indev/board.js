"use strict";
function getRandomSignedInt() {
  return Math.random() * 2 - 1;
}
function floatTile(el, isDragging) {
  let startTime = null;
  let fromX = 0, fromY = 0;
  let toX = getRandomSignedInt() * 5, toY = getRandomSignedInt() * 5;
  const duration = 1e3;
  function step(timestamp) {
    if (isDragging()) {
      requestAnimationFrame(step);
      return;
    }
    if (!startTime) startTime = timestamp;
    let progress = (timestamp - startTime) / duration;
    if (progress >= 1) {
      fromX = toX;
      fromY = toY;
      toX = getRandomSignedInt() * 5;
      toY = getRandomSignedInt() * 5;
      startTime = timestamp - (progress - 1) * duration;
      progress = (timestamp - startTime) / duration;
    }
    const t = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    el.style.transform = `translate(${fromX + (toX - fromX) * t}px, ${fromY + (toY - fromY) * t}px`;
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
let tileMap = [];
function applyShopTileToCell(cell, shopTile) {
  const label = shopTile.textContent ?? "";
  cell.style.backgroundColor = shopTile.style.backgroundColor;
  cell.textContent = label;
  const idParts = cell.id.split("-");
  tileMap[parseInt(idParts[1], 10)][parseInt(idParts[2], 10)] = label;
}
function setupShopTilePointerDrag(tile, setPauseFloat) {
  let startPointerX, startPointerY, startLeft, startTop;
  tile.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || tile.classList.contains("shop-tile--returning")) {
      return;
    }
    ;
    e.preventDefault();
    setPauseFloat(true);
    tile.setPointerCapture(e.pointerId);
    tile.classList.add("shop-tile--dragging");
    tile.style.cursor = "grabbing";
    tile.style.transform = "translate(0px, 0px)";
    tile.style.pointerEvents = "none";
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    startLeft = parseInt(tile.style.left, 10) || 0;
    startTop = parseInt(tile.style.top, 10) || 0;
    tile.addEventListener("pointermove", onPointerMove);
    tile.addEventListener("pointerup", onPointerUp);
    tile.addEventListener("pointercancel", onPointerCancel);
  });
  function positionTile(e) {
    tile.style.left = startLeft + e.clientX - startPointerX + "px";
    tile.style.top = startTop + e.clientY - startPointerY + "px";
  }
  function cellAtPointer(x, y) {
    tile.style.visibility = "hidden";
    const cell = document.elementFromPoint(x, y)?.closest(".cell");
    tile.style.visibility = "";
    return cell instanceof HTMLElement ? cell : void 0;
  }
  function finishDragUI() {
    tile.classList.remove("shop-tile--dragging");
    tile.style.cursor = "";
    tile.style.pointerEvents = "";
    setPauseFloat(false);
  }
  function animateTileReturn(onComplete) {
    tile.classList.add("shop-tile--returning");
    requestAnimationFrame(() => {
      tile.style.left = startLeft + "px";
      tile.style.top = startTop + "px";
    });
    const onTransitionEnd = (ev) => {
      if (ev.target !== tile || ev.propertyName !== "left") return;
      tile.removeEventListener("transitionend", onTransitionEnd);
      tile.classList.remove("shop-tile--returning");
      onComplete();
    };
    tile.addEventListener("transitionend", onTransitionEnd);
  }
  function endDrag(e, applyDrop) {
    tile.removeEventListener("pointermove", onPointerMove);
    tile.removeEventListener("pointerup", onPointerUp);
    tile.removeEventListener("pointercancel", onPointerCancel);
    if (tile.hasPointerCapture(e.pointerId)) {
      tile.releasePointerCapture(e.pointerId);
    }
    if (applyDrop) {
      const target = cellAtPointer(e.clientX, e.clientY);
      if (target) {
        const shopTilesWrapper = document.getElementById("shop-tiles-wrapper");
        applyShopTileToCell(target, tile);
        finishDragUI();
        tile.remove();
        shopTilesWrapper?.remove();
        return;
      }
    }
    animateTileReturn(finishDragUI);
  }
  function onPointerMove(e) {
    positionTile(e);
  }
  function onPointerUp(e) {
    endDrag(e, true);
  }
  function onPointerCancel(e) {
    endDrag(e, false);
  }
}
function initGameBoard() {
  const size = 12;
  const gameBoard = Array.from(
    { length: size },
    () => new Array(size)
  );
  tileMap = Array.from(
    { length: size },
    () => Array.from({ length: size }, () => "")
  );
  const boardWrapper = document.getElementById("board-wrapper");
  if (!boardWrapper) return;
  let rowWrapper = [];
  for (let i = 0; i < size; i++) {
    const rw = document.createElement("div");
    rowWrapper[i] = rw;
    rw.id = `row-wrapper-${i}`;
    rw.classList.add("row-wrapper");
    boardWrapper.appendChild(rw);
    const row = gameBoard[i];
    for (let j = size - 1; j >= 0; j--) {
      const cell = document.createElement("div");
      row[j] = cell;
      cell.id = `cell-${i}-${j}`;
      cell.classList.add("cell");
      rw.appendChild(cell);
    }
  }
}
initGameBoard();
function initShop(items) {
  if (!document.getElementById("shop-tiles-wrapper")) {
    const shopTilesWrapper2 = document.createElement("div");
    shopTilesWrapper2.id = "shop-tiles-wrapper";
    document.body.appendChild(shopTilesWrapper2);
  }
  const shopTilesWrapper = document.getElementById("shop-tiles-wrapper");
  if (!shopTilesWrapper) return;
  const tileLabels = ["tile1", "tile2", "tile3", "tile4", "tile5", "tile6", "tile7", "tile8"];
  for (let i = 0; i < items; i++) {
    const tile = document.createElement("div");
    tile.id = `shop-tile-${i}`;
    tile.classList.add("shop-tile");
    tile.textContent = tileLabels[Math.floor(Math.random() * tileLabels.length)];
    tile.style.backgroundColor = "#" + ((1 << 24) * Math.random() | 0).toString(16).padStart(6, "0");
    tile.style.left = `${i * 100}px`;
    shopTilesWrapper.appendChild(tile);
    let pauseFloat = false;
    floatTile(tile, () => pauseFloat);
    setupShopTilePointerDrag(tile, (active) => {
      if (active !== void 0) pauseFloat = active;
    });
  }
}
document.getElementById("trigger-shop-btn")?.addEventListener("click", () => initShop(3));
//# sourceMappingURL=board.js.map
