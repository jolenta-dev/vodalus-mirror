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
let riverMountain = null;
function styleCellFromLabel(cell, label) {
  switch (label) {
    case "sea":
      cell.style.color = "";
      cell.style.backgroundColor = "darkblue";
      break;
    case "mountain":
      cell.style.color = "";
      cell.style.backgroundColor = "grey";
      break;
    case "snow":
      cell.style.color = "#000000";
      cell.style.backgroundColor = "#FFFFF0";
      break;
    case "river":
      cell.style.color = "";
      cell.style.backgroundColor = "skyblue";
      break;
    case "grass":
      cell.style.color = "";
      cell.style.backgroundColor = "green";
      break;
    case "tower":
      cell.style.color = "#FFFFFF";
      cell.style.backgroundColor = "#000000";
      break;
    case "interior":
      cell.style.color = "#000000";
      cell.style.backgroundColor = "#F7F2C3";
      break;
    default:
      cell.style.color = "#FFFFFF";
      cell.style.backgroundColor = "#FFFFFF";
      break;
  }
}
function applyShopTileToCell(cell, shopTile) {
  const label = shopTile.textContent ?? "";
  cell.textContent = label;
  styleCellFromLabel(cell, label);
  const idParts = cell.id.split("-");
  tileMap[parseInt(idParts[1], 10)][parseInt(idParts[2], 10)] = label;
}
function setupShopTilePointerDrag(tile, setPauseFloat, isSetup) {
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
        if (!isSetup) {
          shopTilesWrapper?.remove();
        } else if (!shopTilesWrapper?.children.length) {
          shopTilesWrapper?.remove();
        }
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
function tileMapToCells() {
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 12; j++) {
      const cell = document.getElementById(`cell-${i}-${j}`);
      cell.textContent = tileMap[i][j] ?? null;
      if (!cell.textContent) {
        cell.textContent = "grass";
      }
      styleCellFromLabel(cell, cell.textContent);
    }
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
  function initProcGen() {
    let seaSideLeft = Math.random() < 0.5;
    if (seaSideLeft) {
      tileMap[5][11] = "sea";
      tileMap[6][11] = "sea";
      tileMap[5][0] = "mountain";
      tileMap[6][0] = "mountain";
    } else {
      tileMap[5][11] = "mountain";
      tileMap[6][11] = "mountain";
      tileMap[5][0] = "sea";
      tileMap[6][0] = "sea";
    }
    const seaSize = [];
    seaSize[0] = Math.floor(Math.random() * 3) + 1;
    seaSize[1] = Math.floor(Math.random() * 3) + 1;
    seaSize[2] = Math.floor(Math.random() * 3) + 1;
    seaSize[3] = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < seaSize[0] + 1; i++) {
      if (seaSideLeft) {
        tileMap[5 - i][11] = "sea";
      } else {
        tileMap[5 - i][0] = "sea";
      }
    }
    for (let i = 0; i < seaSize[1] + 1; i++) {
      if (seaSideLeft) {
        tileMap[6][11 - i] = "sea";
        tileMap[5][11 - i] = "sea";
      } else {
        tileMap[6][i] = "sea";
        tileMap[5][i] = "sea";
      }
    }
    for (let i = 0; i < seaSize[2] + 1; i++) {
      if (seaSideLeft) {
        tileMap[6 + i][11] = "sea";
      } else {
        tileMap[6 + i][0] = "sea";
      }
      for (let i2 = 0; i2 < seaSize[3] + 1; i2++) {
        if (seaSideLeft) {
          tileMap[5][11 + i2] = "sea";
          tileMap[6][11 + i2] = "sea";
        } else {
          tileMap[5][i2] = "sea";
          tileMap[6][i2] = "sea";
        }
      }
      if (seaSideLeft) {
        let depth = seaSize[1];
        for (let i2 = 0; i2 <= depth - Math.floor(Math.random() * 2); i2++) {
          tileMap[4][11 - i2] = "sea";
        }
        for (let i2 = 0; i2 <= depth - Math.floor(Math.random() * 2); i2++) {
          tileMap[7][11 - i2] = "sea";
        }
        for (let i2 = 0; i2 < depth - (Math.floor(Math.random() * 2) + 1); i2++) {
          tileMap[3][11 - i2] = "sea";
        }
        for (let i2 = 0; i2 < depth - (Math.floor(Math.random() * 2) + 1); i2++) {
          tileMap[8][11 - i2] = "sea";
        }
      } else {
        let depth = seaSize[3];
        for (let i2 = 0; i2 <= depth - Math.floor(Math.random() * 2); i2++) {
          tileMap[4][0 + i2] = "sea";
        }
        for (let i2 = 0; i2 <= depth - Math.floor(Math.random() * 2); i2++) {
          tileMap[7][0 + i2] = "sea";
        }
        for (let i2 = 0; i2 < depth - (Math.floor(Math.random() * 2) + 1); i2++) {
          tileMap[3][0 + i2] = "sea";
        }
        for (let i2 = 0; i2 < depth - (Math.floor(Math.random() * 2) + 1); i2++) {
          tileMap[8][0 + i2] = "sea";
        }
      }
    }
    const mountainSize = [];
    mountainSize[0] = Math.floor(Math.random() * 4) + 1;
    mountainSize[1] = Math.floor(Math.random() * 4) + 1;
    mountainSize[2] = Math.floor(Math.random() * 4) + 1;
    mountainSize[3] = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < mountainSize[0] + 1; i++) {
      if (seaSideLeft) {
        tileMap[5 - i][0] = "mountain";
      } else {
        tileMap[5 - i][11] = "mountain";
      }
    }
    for (let i = 0; i < mountainSize[1] + 1; i++) {
      if (seaSideLeft) {
        tileMap[6][i] = "mountain";
        tileMap[5][i] = "mountain";
      } else {
        tileMap[6][11 - i] = "mountain";
        tileMap[5][11 - i] = "mountain";
      }
    }
    for (let i = 0; i < mountainSize[2] + 1; i++) {
      if (seaSideLeft) {
        tileMap[6 + i][0] = "mountain";
      } else {
        tileMap[6 + i][11] = "mountain";
      }
      for (let i2 = 0; i2 < mountainSize[3] + 1; i2++) {
        if (seaSideLeft) {
          tileMap[5][i2] = "mountain";
          tileMap[6][i2] = "mountain";
        } else {
          tileMap[5][11 + i2] = "mountain";
          tileMap[6][11 + i2] = "mountain";
        }
      }
    }
    if (seaSideLeft) {
      let depth = mountainSize[1];
      for (let i = 0; i <= depth - Math.floor(Math.random() * 2); i++) {
        tileMap[4][0 + i] = "mountain";
      }
      for (let i = 0; i <= depth - Math.floor(Math.random() * 2); i++) {
        tileMap[7][0 + i] = "mountain";
      }
      for (let i = 0; i < depth - (Math.floor(Math.random() * 2) + 1); i++) {
        tileMap[3][0 + i] = "mountain";
      }
      for (let i = 0; i < depth - (Math.floor(Math.random() * 2) + 1); i++) {
        tileMap[8][0 + i] = "mountain";
      }
    } else {
      let depth = mountainSize[3];
      for (let i = 0; i <= depth - Math.floor(Math.random() * 2); i++) {
        tileMap[4][11 - i] = "mountain";
      }
      for (let i = 0; i <= depth - Math.floor(Math.random() * 2); i++) {
        tileMap[7][11 - i] = "mountain";
      }
      for (let i = 0; i < depth - (Math.floor(Math.random() * 2) + 1); i++) {
        tileMap[3][11 - i] = "mountain";
      }
      for (let i = 0; i < depth - (Math.floor(Math.random() * 2) + 1); i++) {
        tileMap[8][11 - i] = "mountain";
      }
    }
    if (seaSideLeft) {
      tileMap[4][0] = "snow";
      tileMap[5][0] = "snow";
      if (Math.random() < 0.5) {
        tileMap[3][0] = "snow";
        tileMap[6][0] = "snow";
      }
      if (Math.random() < 0.5) {
        tileMap[4][1] = "snow";
        tileMap[5][1] = "snow";
      }
    } else {
      tileMap[4][11] = "snow";
      tileMap[5][11] = "snow";
      if (Math.random() < 0.5) {
        tileMap[3][11] = "snow";
        tileMap[6][11] = "snow";
      }
      if (Math.random() < 0.5) {
        tileMap[4][10] = "snow";
        tileMap[5][10] = "snow";
      }
    }
    function placeRiverMountainStart(bounds, maxGuesses2) {
      for (let i = 0; i < maxGuesses2; i++) {
        const x = Math.floor(Math.random() * bounds.xSpan) + bounds.xLo;
        const y = Math.floor(Math.random() * bounds.ySpan) + bounds.yLo;
        if (tileMap[x][y] === "mountain") {
          tileMap[x][y] = "river";
          return [x, y];
        }
      }
      return null;
    }
    const maxGuesses = 100;
    const mountainBounds = seaSideLeft ? { xLo: 0, xSpan: 12, yLo: 0, ySpan: 6 } : { xLo: 0, xSpan: 12, yLo: 6, ySpan: 6 };
    riverMountain = placeRiverMountainStart(mountainBounds, maxGuesses);
    if (!riverMountain) {
      const defaultCol = seaSideLeft ? 0 : 11;
      tileMap[5][defaultCol] = "river";
      riverMountain = [5, defaultCol];
    }
    let [riverRow, riverCol] = riverMountain;
    const colStep = seaSideLeft ? 1 : -1;
    function setRiverCell(row, col) {
      tileMap[row][col] = "river";
    }
    for (let i = 0; i < 12; i++) {
      const prevRow = riverRow;
      riverCol += colStep;
      riverRow += Math.floor(Math.random() * 3) - 1;
      riverRow = Math.max(0, Math.min(11, riverRow));
      riverCol = Math.max(0, Math.min(11, riverCol));
      if (prevRow !== riverRow) {
        setRiverCell(prevRow, riverCol);
      }
      setRiverCell(riverRow, riverCol);
    }
    riverMountain = [riverRow, riverCol];
  }
  initProcGen();
  tileMapToCells();
}
initGameBoard();
function initShop(items, type) {
  if (!document.getElementById("shop-tiles-wrapper")) {
    const shopTilesWrapper2 = document.createElement("div");
    shopTilesWrapper2.id = "shop-tiles-wrapper";
    document.body.appendChild(shopTilesWrapper2);
  }
  const shopTilesWrapper = document.getElementById("shop-tiles-wrapper");
  if (!shopTilesWrapper) return;
  const tileLabels = ["grass", "sea", "river", "mountain", "snow"];
  for (let i = 0; i < items; i++) {
    const tile = document.createElement("div");
    tile.id = `shop-tile-${i}`;
    tile.classList.add("shop-tile");
    if (type === "setup") {
      if (i === 0) {
        tile.textContent = "tower";
      } else {
        tile.textContent = "interior";
      }
    } else {
      tile.textContent = tileLabels[Math.floor(Math.random() * tileLabels.length)];
    }
    tile.style.backgroundColor = (() => {
      switch (tile.textContent) {
        case "tower":
          return "#000000";
        case "interior":
          tile.style.color = "#000000";
          return "#F7F2C3";
        case "grass":
          return "green";
        case "sea":
          return "darkblue";
        case "river":
          return "skyblue";
        case "mountain":
          return "grey";
        case "snow":
          tile.style.color = "#000000";
          return "#FFFFF0";
        default:
          return "purple";
      }
    })();
    tile.style.left = `${i * 100}px`;
    shopTilesWrapper.appendChild(tile);
    let pauseFloat = false;
    floatTile(tile, () => pauseFloat);
    setupShopTilePointerDrag(tile, (active) => {
      if (active !== void 0) pauseFloat = active;
    }, type === "setup");
  }
}
document.getElementById("trigger-shop-btn")?.addEventListener("click", () => {
  if (gameStage === 3) {
    initShop(8, "setup");
  } else {
    initShop(3);
  }
});
let gameStage = 3;
function isShopOpen() {
  const shopTilesWrapper = document.getElementById("shop-tiles-wrapper");
  return !!shopTilesWrapper && shopTilesWrapper.children.length > 0;
}
function isSetupComplete() {
  let hasTower = false;
  let interiorCount = 0;
  for (const row of tileMap) {
    for (const cell of row) {
      if (cell === "tower") hasTower = true;
      if (cell === "interior") interiorCount++;
    }
  }
  return hasTower && interiorCount >= 7;
}
function progressGameStage(gameStage2) {
  let newStage = () => {
    switch (gameStage2) {
      case 0:
        if (isShopOpen()) {
          return 0;
        }
        updateGameStageDisplay(1);
        return 1;
      case 1:
        updateGameStageDisplay(2);
        return 2;
      case 2:
        updateGameStageDisplay(0);
        initShop(3);
        return 0;
      case 3:
        if (isShopOpen() || !isSetupComplete()) {
          return 3;
        }
        updateGameStageDisplay(0);
        initShop(3);
        return 0;
      default:
        updateGameStageDisplay(0);
        return 0;
    }
    ;
  };
  return newStage();
}
function updateGameStageDisplay(gameStage2) {
  const stageDisplay = document.getElementById("current-stage-display");
  switch (gameStage2) {
    case 0:
      stageDisplay.textContent = "Player/Shop";
      break;
    case 1:
      stageDisplay.textContent = "CPU";
      break;
    case 2:
      stageDisplay.textContent = "Environment";
      break;
    case 3:
      stageDisplay.textContent = "Setup";
      break;
    default:
      stageDisplay.textContent = "Unknown";
      break;
  }
}
document.getElementById("next-stage-btn")?.addEventListener("click", () => {
  gameStage = progressGameStage(gameStage);
});
//# sourceMappingURL=board.js.map
