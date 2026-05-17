function getRandomSignedInt(): number {
  return Math.random() * 2 - 1;
}

function floatTile(el: HTMLElement, isDragging: () => boolean): void {
  let startTime: number | null = null;
  let fromX: number = 0, fromY: number = 0;
  let toX: number = getRandomSignedInt() * 5, toY: number = getRandomSignedInt() * 5;
  const duration: number = 1000;

  function step(timestamp: number): void {
    if (isDragging()) {
      requestAnimationFrame(step);
      return;
    }
    if (!startTime) startTime = timestamp;
    let progress: number = (timestamp - startTime) / duration;

    if (progress >= 1) {
      fromX = toX; fromY = toY;
      toX = getRandomSignedInt() * 5;
      toY = getRandomSignedInt() * 5;
      startTime = timestamp - ((progress - 1) * duration);
      progress = (timestamp - startTime) / duration;
    }

    const t: number = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    el.style.transform = `translate(${fromX + (toX - fromX) * t}px, ${fromY + (toY - fromY) * t}px`;
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

let tileMap: string[][] = [];
let riverMountain: [number, number] | null = null;

function styleCellFromLabel(cell: HTMLElement, label: string): void {
  switch (label) {
    case 'sea':
      cell.style.color = '';
      cell.style.backgroundColor = 'darkblue';
      break;
    case 'mountain':
      cell.style.color = '';
      cell.style.backgroundColor = 'grey';
      break;
    case 'snow':
      cell.style.color = '#000000';
      cell.style.backgroundColor = '#FFFFF0';
      break;
    case 'river':
      cell.style.color = '';
      cell.style.backgroundColor = 'skyblue';
      break;
    case 'grass':
      cell.style.color = '';
      cell.style.backgroundColor = 'green';
      break;
    case 'tower':
      cell.style.color = '#FFFFFF';
      cell.style.backgroundColor = '#000000';
      break;
    case 'interior':
      cell.style.color = '#000000';
      cell.style.backgroundColor = '#F7F2C3';
      break;
    default:
      cell.style.color = '#FFFFFF';
      cell.style.backgroundColor = '#FFFFFF';
      break;
  }
}

function applyShopTileToCell(cell: HTMLElement, shopTile: HTMLElement): void {
  const label: string = shopTile.textContent ?? '';
  cell.textContent = label;
  styleCellFromLabel(cell, label);
  const idParts = cell.id.split('-');
  tileMap[parseInt(idParts[1]!, 10)]![parseInt(idParts[2]!, 10)] = label;
}

function setupShopTilePointerDrag(tile: HTMLElement, setPauseFloat: (paused: boolean) => void, isSetup: boolean): void {
  let startPointerX: number, startPointerY: number, startLeft: number, startTop: number;

  tile.addEventListener('pointerdown', (e: PointerEvent): void => {
    if (e.button !== 0 || tile.classList.contains('shop-tile--returning')) { return };
    e.preventDefault();
    setPauseFloat(true);
    tile.setPointerCapture(e.pointerId);
    tile.classList.add('shop-tile--dragging');
    tile.style.cursor = 'grabbing';
    tile.style.transform = 'translate(0px, 0px)';
    tile.style.pointerEvents = 'none';
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    startLeft = parseInt(tile.style.left, 10) || 0;
    startTop = parseInt(tile.style.top, 10) || 0;
    tile.addEventListener('pointermove', onPointerMove);
    tile.addEventListener('pointerup', onPointerUp);
    tile.addEventListener('pointercancel', onPointerCancel);
  });
  function positionTile(e: PointerEvent): void {
    tile.style.left = (startLeft + e.clientX - startPointerX) + 'px';
    tile.style.top = (startTop + e.clientY - startPointerY) + 'px';
  }

  function cellAtPointer(x: number, y: number): HTMLElement | undefined {
    tile.style.visibility = 'hidden';
    const cell = document.elementFromPoint(x, y)?.closest('.cell');
    tile.style.visibility = '';
    return cell instanceof HTMLElement ? cell : undefined;
  }

  function finishDragUI(): void {
    tile.classList.remove('shop-tile--dragging');
    tile.style.cursor = '';
    tile.style.pointerEvents = '';
    setPauseFloat(false);
  }

  function animateTileReturn(onComplete: () => void): void {
    tile.classList.add('shop-tile--returning');
    requestAnimationFrame((): void => {
      tile.style.left = startLeft + 'px';
      tile.style.top = startTop + 'px';
    });
    const onTransitionEnd = (ev: TransitionEvent): void => {
      if (ev.target !== tile || ev.propertyName !== 'left') return;
      tile.removeEventListener('transitionend', onTransitionEnd);
      tile.classList.remove('shop-tile--returning');
      onComplete();
    };
    tile.addEventListener('transitionend', onTransitionEnd);
  }

  function endDrag(e: PointerEvent, applyDrop: boolean): void {
    tile.removeEventListener('pointermove', onPointerMove);
    tile.removeEventListener('pointerup', onPointerUp);
    tile.removeEventListener('pointercancel', onPointerCancel);
    if (tile.hasPointerCapture(e.pointerId)) {
      tile.releasePointerCapture(e.pointerId);
    }
    if (applyDrop) {
      const target = cellAtPointer(e.clientX, e.clientY);
      if (target) {
        const shopTilesWrapper = document.getElementById('shop-tiles-wrapper');
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

  function onPointerMove(e: PointerEvent): void {
    positionTile(e);
  }

  function onPointerUp(e: PointerEvent): void {
    endDrag(e, true);
  }

  function onPointerCancel(e: PointerEvent): void {
    endDrag(e, false);
  }
}

// TODO: logic for tile placement restrictions
// some kind of river continuity check for dynamic events
// if river is not contiguous -> flood to a lake to connect it
// MAKE PROCGEN SEED BASED

function tileMapToCells(): void {
  for (let i: number = 0; i < 12; i++) {
    for (let j: number = 0; j < 12; j++) {
      const cell = document.getElementById(`cell-${i}-${j}`)!;
      cell.textContent = tileMap[i]![j] ?? null;
      if (!cell.textContent) {
        cell.textContent = 'grass';
      }
      styleCellFromLabel(cell, cell.textContent);
    }

  }
}

function initGameBoard(): void {
  const size: number = 12;
  const gameBoard: HTMLElement[][] = Array.from({ length: size }, (): HTMLElement[] =>
    new Array<HTMLElement>(size)
  );
  tileMap = Array.from({ length: size }, (): string[] =>
    Array.from({ length: size }, (): string => '')
  );

  const boardWrapper = document.getElementById('board-wrapper');
  if (!boardWrapper) return;
  let rowWrapper: HTMLElement[] = [];
  for (let i: number = 0; i < size; i++) {
    const rw = document.createElement('div');
    rowWrapper[i] = rw;
    rw.id = `row-wrapper-${i}`;
    rw.classList.add('row-wrapper');
    boardWrapper.appendChild(rw);
    const row = gameBoard[i]!;
    for (let j: number = size - 1; j >= 0; j--) {
      const cell = document.createElement('div');
      row[j] = cell;
      cell.id = `cell-${i}-${j}`;
      cell.classList.add('cell');
      rw.appendChild(cell);
    }
  }

  // coords system is kinda fucked
  // [0][0] is top right
  // [11][11] is bottom left
  // [0][11] is top left
  // [11][0] is bottom right
  function initProcGen(): void {
    // first, decide on the sea/mountain sides
    let seaSideLeft: boolean = Math.random() < 0.5;
    if (seaSideLeft) {
      tileMap[5]![11] = 'sea';
      tileMap[6]![11] = 'sea';
      tileMap[5]![0] = 'mountain';
      tileMap[6]![0] = 'mountain';
    } else {
      tileMap[5]![11] = 'mountain';
      tileMap[6]![11] = 'mountain';
      tileMap[5]![0] = 'sea';
      tileMap[6]![0] = 'sea';
    }
    // now determine the size of the sea in each direction
    // array order is clockwise NESW
    const seaSize: number[] = [];
    seaSize[0] = Math.floor(Math.random() * 3) + 1;
    seaSize[1] = Math.floor(Math.random() * 3) + 1;
    seaSize[2] = Math.floor(Math.random() * 3) + 1;
    seaSize[3] = Math.floor(Math.random() * 3) + 1;
    // North
    for (let i: number = 0; i < seaSize[0] + 1; i++) {
      if (seaSideLeft) {
        tileMap[5 - i]![11] = 'sea';
      } else {
        tileMap[5 - i]![0] = 'sea';
      }
    }
    // East
    for (let i: number = 0; i < seaSize[1] + 1; i++) {
      if (seaSideLeft) {
        tileMap[6]![11 - i] = 'sea';
        tileMap[5]![11 - i] = 'sea';
      } else {
        tileMap[6]![i] = 'sea';
        tileMap[5]![i] = 'sea';
      }
    }
    // South
    for (let i: number = 0; i < seaSize[2] + 1; i++) {
      if (seaSideLeft) {
        tileMap[6 + i]![11] = 'sea';
      } else {
        tileMap[6 + i]![0] = 'sea';
      }
      // West
      for (let i: number = 0; i < seaSize[3] + 1; i++) {
        if (seaSideLeft) {
          tileMap[5]![11 + i] = 'sea';
          tileMap[6]![11 + i] = 'sea';
        } else {
          tileMap[5]![i] = 'sea';
          tileMap[6]![i] = 'sea';
        }
      }
      // fill it out
      if (seaSideLeft) {
        let depth: number = seaSize[1];
        for (let i: number = 0; i <= (depth - Math.floor(Math.random() * 2)); i++) {
          tileMap[4]![11 - i] = 'sea';
        }
        for (let i: number = 0; i <= (depth - Math.floor(Math.random() * 2)); i++) {
          tileMap[7]![11 - i] = 'sea';
        }
        for (let i: number = 0; i < depth - (Math.floor(Math.random() * 2) + 1); i++) {
          tileMap[3]![11 - i] = 'sea';
        }
        for (let i: number = 0; i < depth - (Math.floor(Math.random() * 2) + 1); i++) {

          tileMap[8]![11 - i] = 'sea';
        }
      } else {
        let depth: number = seaSize[3];
        for (let i: number = 0; i <= (depth - Math.floor(Math.random() * 2)); i++) {
          tileMap[4]![0 + i] = 'sea';
        }
        for (let i: number = 0; i <= (depth - Math.floor(Math.random() * 2)); i++) {
          tileMap[7]![0 + i] = 'sea';
        }
        for (let i: number = 0; i < depth - (Math.floor(Math.random() * 2) + 1); i++) {
          tileMap[3]![0 + i] = 'sea';
        }
        for (let i: number = 0; i < depth - (Math.floor(Math.random() * 2) + 1); i++) {

          tileMap[8]![0 + i] = 'sea';
        }
      }
    }
    // another one for the mountains
    // array order is clockwise NESW
    const mountainSize: number[] = [];
    mountainSize[0] = Math.floor(Math.random() * 4) + 1;
    mountainSize[1] = Math.floor(Math.random() * 4) + 1;
    mountainSize[2] = Math.floor(Math.random() * 4) + 1;
    mountainSize[3] = Math.floor(Math.random() * 4) + 1;
    // North
    for (let i: number = 0; i < mountainSize[0] + 1; i++) {
      if (seaSideLeft) {
        tileMap[5 - i]![0] = 'mountain';
      } else {
        tileMap[5 - i]![11] = 'mountain';
      }
    }
    // East
    for (let i: number = 0; i < mountainSize[1] + 1; i++) {
      if (seaSideLeft) {
        tileMap[6]![i] = 'mountain';
        tileMap[5]![i] = 'mountain';
      } else {
        tileMap[6]![11 - i] = 'mountain';
        tileMap[5]![11 - i] = 'mountain';
      }
    }
    // South
    for (let i: number = 0; i < mountainSize[2] + 1; i++) {
      if (seaSideLeft) {
        tileMap[6 + i]![0] = 'mountain';
      } else {
        tileMap[6 + i]![11] = 'mountain';
      }
      // West
      for (let i: number = 0; i < mountainSize[3] + 1; i++) {
        if (seaSideLeft) {
          tileMap[5]![i] = 'mountain';
          tileMap[6]![i] = 'mountain';
        } else {
          tileMap[5]![11 + i] = 'mountain';
          tileMap[6]![11 + i] = 'mountain';
        }
      }
    }
    // fill it out
    if (seaSideLeft) {
      let depth: number = mountainSize[1];
      for (let i: number = 0; i <= (depth - Math.floor(Math.random() * 2)); i++) {
        tileMap[4]![0 + i] = 'mountain';
      }
      for (let i: number = 0; i <= (depth - Math.floor(Math.random() * 2)); i++) {
        tileMap[7]![0 + i] = 'mountain';
      }
      for (let i: number = 0; i < depth - (Math.floor(Math.random() * 2) + 1); i++) {
        tileMap[3]![0 + i] = 'mountain';
      }
      for (let i: number = 0; i < depth - (Math.floor(Math.random() * 2) + 1); i++) {

        tileMap[8]![0 + i] = 'mountain';
      }
    } else {
      let depth: number = mountainSize[3];
      for (let i: number = 0; i <= (depth - Math.floor(Math.random() * 2)); i++) {
        tileMap[4]![11 - i] = 'mountain';
      }
      for (let i: number = 0; i <= (depth - Math.floor(Math.random() * 2)); i++) {
        tileMap[7]![11 - i] = 'mountain';
      }
      for (let i: number = 0; i < depth - (Math.floor(Math.random() * 2) + 1); i++) {
        tileMap[3]![11 - i] = 'mountain';
      }
      for (let i: number = 0; i < depth - (Math.floor(Math.random() * 2) + 1); i++) {

        tileMap[8]![11 - i] = 'mountain';
      }
    }
    // place snow on the peaks
    if (seaSideLeft) {
      tileMap[4]![0] = 'snow';
      tileMap[5]![0] = 'snow';
      if (Math.random() < 0.5) {
        tileMap[3]![0] = 'snow';
        tileMap[6]![0] = 'snow';
      }
      if (Math.random() < 0.5) {
        tileMap[4]![1] = 'snow';
        tileMap[5]![1] = 'snow';
      }
    } else {
      tileMap[4]![11] = 'snow';
      tileMap[5]![11] = 'snow';
      if (Math.random() < 0.5) {
        tileMap[3]![11] = 'snow';
        tileMap[6]![11] = 'snow';
      }
      if (Math.random() < 0.5) {
        tileMap[4]![10] = 'snow';
        tileMap[5]![10] = 'snow';
      }
    }

    function placeRiverMountainStart(
      bounds: { xLo: number; xSpan: number; yLo: number; ySpan: number },
      maxGuesses: number,
    ): [number, number] | null {
      for (let i: number = 0; i < maxGuesses; i++) {
        const x: number = Math.floor(Math.random() * bounds.xSpan) + bounds.xLo;
        const y: number = Math.floor(Math.random() * bounds.ySpan) + bounds.yLo;
        if (tileMap[x]![y] === 'mountain') {
          tileMap[x]![y] = 'river';
          return [x, y];
        }
      }
      return null;
    }

    const maxGuesses: number = 100;
    const mountainBounds = seaSideLeft
      ? { xLo: 0, xSpan: 12, yLo: 0, ySpan: 6 }
      : { xLo: 0, xSpan: 12, yLo: 6, ySpan: 6 };

    riverMountain = placeRiverMountainStart(mountainBounds, maxGuesses);
    if (!riverMountain) {
      const defaultCol: number = seaSideLeft ? 0 : 11;
      tileMap[5]![defaultCol] = 'river';
      riverMountain = [5, defaultCol];
    }

    let [riverRow, riverCol] = riverMountain;
    const colStep: number = seaSideLeft ? 1 : -1;

    function setRiverCell(row: number, col: number): void {
      tileMap[row]![col] = 'river';
    }

    for (let i: number = 0; i < 12; i++) {
      const prevRow: number = riverRow;
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

function initShop(items: number, type?: string): void {
  if (!document.getElementById('shop-tiles-wrapper')) {
    const shopTilesWrapper = document.createElement('div');
    shopTilesWrapper.id = 'shop-tiles-wrapper';
    document.body.appendChild(shopTilesWrapper);
  }

  const shopTilesWrapper = document.getElementById('shop-tiles-wrapper');
  if (!shopTilesWrapper) return;

  const tileLabels: string[] = ['grass', 'sea', 'river', 'mountain', 'snow',];

  for (let i: number = 0; i < items; i++) {
    const tile = document.createElement('div');
    tile.id = `shop-tile-${i}`;
    tile.classList.add('shop-tile');
    if (type === 'setup') {
      if (i === 0) {
        tile.textContent = 'tower';
      } else {
        tile.textContent = 'interior';
      }
    } else {
      tile.textContent = tileLabels[Math.floor(Math.random() * tileLabels.length)]!;
    }
    tile.style.backgroundColor = ((): string => {
      switch (tile.textContent) {
        case 'tower':
          return '#000000';
        case 'interior':
          tile.style.color = '#000000';
          return '#F7F2C3';
        case 'grass':
          return 'green';
        case 'sea':
          return 'darkblue';
        case 'river':
          return 'skyblue';
        case 'mountain':
          return 'grey';
        case 'snow':
          tile.style.color = '#000000';
          return '#FFFFF0';
        default:
          return 'purple';
      }
    })();
    // make these possible to read the text

    tile.style.left = `${i * 100}px`;
    shopTilesWrapper.appendChild(tile);
    let pauseFloat = false;
    floatTile(tile, (): boolean => pauseFloat);
    setupShopTilePointerDrag(tile, (active: boolean | undefined): void => {
      if (active !== undefined) pauseFloat = active;
    }, type === 'setup');
  }
}

document.getElementById('trigger-shop-btn')?.addEventListener('click', (): void => {
  if (gameStage === 3) {
    initShop(8, 'setup');
  } else {
    initShop(3);
  }
});

/* 0 = player/shop
  * 1 = CPU
  * 2 = environment 
  * 3 = setup */
let gameStage: number = 3;

function isShopOpen(): boolean {
  const shopTilesWrapper: HTMLElement | null = document.getElementById('shop-tiles-wrapper');
  return !!shopTilesWrapper && shopTilesWrapper.children.length > 0;
}

function isSetupComplete(): boolean {
  let hasTower = false;
  let interiorCount = 0;
  for (const row of tileMap) {
    for (const cell of row) {
      if (cell === 'tower') hasTower = true;
      if (cell === 'interior') interiorCount++;
    }
  }
  return hasTower && interiorCount >= 7;
}

function progressGameStage(gameStage: number): number {
  let newStage = () => {
    switch (gameStage) {
      case 0:
        // don't let the player pass a turn while shop tiles remain
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
    };
  }
  return newStage();
}

function updateGameStageDisplay(gameStage: number): void {
  const stageDisplay: HTMLElement = document.getElementById('current-stage-display')!;
  switch (gameStage) {
    case 0:
      stageDisplay.textContent = 'Player/Shop';
      break;
    case 1:
      stageDisplay.textContent = 'CPU';
      break;
    case 2:
      stageDisplay.textContent = 'Environment';
      break;
    case 3:
      stageDisplay.textContent = 'Setup';
      break;
    default:
      stageDisplay.textContent = 'Unknown';
      break;
  }
}

document.getElementById('next-stage-btn')?.addEventListener('click', (): void => {
  gameStage = progressGameStage(gameStage);
});
