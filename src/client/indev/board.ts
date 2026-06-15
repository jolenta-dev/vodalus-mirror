function splitmix64(seed: bigint) {
  let s = seed;
  return {
    next(): bigint {
      s += 0x9e3779b97f4a7c15n;
      let z = s;
      z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xFFFFFFFFFFFFFFFFn;
      z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xFFFFFFFFFFFFFFFFn;
      return z ^ (z >> 31n);
    },
    nextInt(min: number, max: number): number {
      return Number(this.next() % BigInt(max - min + 1)) + min;
    }
  };
}

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

// generate the log or exp curves for the corner fill
function curveT(t: number, convex: boolean, dampening: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const k = 1 + dampening * 4;
  if (convex) {
    return Math.log(1 + clamped * k) / Math.log(1 + k);
  }
  return (Math.exp(k * clamped) - 1) / (Math.exp(k) - 1);
}

// fill in the gaps between the tiles
function fillCorner(
  label: string,
  edgeAnchor: [number, number],
  inwardAnchor: [number, number],
  rows: number[],
  convex: boolean,
  dampening: number,
): void {
  const [rEdge, cEdge] = edgeAnchor;
  const [rIn, cIn] = inwardAnchor;
  const dr = rIn - rEdge;
  if (dr === 0) return;
  for (const row of rows) {
    const t = (row - rEdge) / dr;
    if (t < 0 || t > 1) continue;
    const colBound = Math.round(cEdge + (cIn - cEdge) * curveT(t, convex, dampening));
    const lo = Math.min(colBound, cEdge);
    const hi = Math.max(colBound, cEdge);
    for (let c = lo; c <= hi; c++) {
      tileMap[row]![c] = label;
    }
  }
}

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
        // TODO: add tile placement check logic
        // if invalid, animateTileReturn(finishDragUI) and return
        const idParts = target.id.split('-');
        const targetY = parseInt(idParts[1]!, 10);
        const targetX = parseInt(idParts[2]!, 10);

        let validPlacement: boolean = isTilePlacementValid(targetY, targetX, tile.textContent ?? '');
        if (validPlacement) {
          applyShopTileToCell(target, tile);
          finishDragUI();
          tile.remove();
          if (!isSetup) {
            shopTilesWrapper?.remove();
          } else if (!shopTilesWrapper?.children.length) {
            shopTilesWrapper?.remove();
            tryAdvanceSetupPhase();
          }
          return;
        } else {
          animateTileReturn(finishDragUI);
          return;
        }
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
  //
  // filling the regions is complicated:
  // first, we decide the length of the region in each cardinal direction
  // then we take the three exposed directions on the board connect them with lines
  // we generate a random int that has a 50/50 to decide concavity between each set of points
  // then we model a random dampening value for the curve between the two points
  // then fill in the gaps
  function initProcGen(): void {
    const seedValue = BigInt(Date.now());
    const mainSeed = splitmix64(seedValue);
    const seedString = seedValue.toString();
    const roll = (): number => Number(mainSeed.next() % 100n);

    document.getElementById('seed-display')!.textContent = `Seed: ${seedString}`;

    // first, decide on the sea/mountain sides
    let seaSideLeft: boolean = (roll() < 50);
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
    // another one for the mountains
    // array order is clockwise NESW
    const mountainSize: number[] = [];
    mountainSize[0] = Math.floor((roll() / 100) * 5) + 1;
    mountainSize[1] = Math.floor((roll() / 100) * 5) + 1;
    mountainSize[2] = Math.floor((roll() / 100) * 5) + 1;
    mountainSize[3] = Math.floor((roll() / 100) * 5) + 1;
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
        const mountainEastRoll = roll();
        const mountainEastColAhead = i > 0 ? 11 - (i - 1) : 11 - i;
        if (mountainEastRoll < 33) {
          tileMap[6]![11 - i] = 'mountain';
          tileMap[5]![mountainEastColAhead] = 'mountain';
          tileMap[5]![11 - i] = 'mountain';
          tileMap[6]![mountainEastColAhead] = 'mountain';
        } else if (mountainEastRoll < 66) {
          tileMap[6]![11 - i] = 'mountain';
          tileMap[5]![11 - i] = 'mountain';
        } else {
          tileMap[6]![mountainEastColAhead] = 'mountain';
          tileMap[5]![11 - i] = 'mountain';
          tileMap[6]![11 - i] = 'mountain';
          tileMap[5]![mountainEastColAhead] = 'mountain';
        }
      }
    }
    // South
    for (let i: number = 0; i < mountainSize[2] + 1; i++) {
      if (seaSideLeft) {
        tileMap[6 + i]![0] = 'mountain';
      } else {
        tileMap[6 + i]![11] = 'mountain';
      }
    }
    // West
    for (let i: number = 0; i < mountainSize[3] + 1; i++) {
      if (seaSideLeft) {
        tileMap[5]![i] = 'mountain';
        tileMap[6]![i] = 'mountain';
      } else {
        const mountainWestRoll = roll();
        const mountainWestColAhead = i > 0 ? 11 - (i - 1) : 11 - i;
        if (mountainWestRoll < 33) {
          tileMap[5]![11 - i] = 'mountain';
          tileMap[6]![mountainWestColAhead] = 'mountain';
          tileMap[6]![11 - i] = 'mountain';
          tileMap[5]![mountainWestColAhead] = 'mountain';
        } else if (mountainWestRoll < 66) {
          tileMap[5]![11 - i] = 'mountain';
          tileMap[6]![11 - i] = 'mountain';
        } else {
          tileMap[5]![mountainWestColAhead] = 'mountain';
          tileMap[6]![11 - i] = 'mountain';
          tileMap[5]![11 - i] = 'mountain';
          tileMap[6]![mountainWestColAhead] = 'mountain';
        }
      }
    }
    const mountainNorthConvex = (roll() < 50);
    const mountainDamp = (roll() / 100);
    if (seaSideLeft) {
      fillCorner('mountain', [5 - mountainSize[0]!, 0], [5, mountainSize[1]!], [3, 4], mountainNorthConvex, mountainDamp);
      fillCorner('mountain', [6 + mountainSize[2]!, 0], [6, mountainSize[1]!], [7, 8], !mountainNorthConvex, mountainDamp);
    } else {
      fillCorner('mountain', [5 - mountainSize[0]!, 11], [5, 11 - mountainSize[3]!], [3, 4], mountainNorthConvex, mountainDamp);
      fillCorner('mountain', [6 + mountainSize[2]!, 11], [6, 11 - mountainSize[3]!], [7, 8], !mountainNorthConvex, mountainDamp);
    }
    // place snow on the peaks
    if (seaSideLeft) {
      tileMap[4]![0] = 'snow';
      tileMap[5]![0] = 'snow';
      if ((roll() < 50)) {
        tileMap[3]![0] = 'snow';
        tileMap[6]![0] = 'snow';
      }
      if ((roll() < 50)) {
        tileMap[4]![1] = 'snow';
        tileMap[5]![1] = 'snow';
      }
    } else {
      tileMap[4]![11] = 'snow';
      tileMap[5]![11] = 'snow';
      if ((roll() < 50)) {
        tileMap[3]![11] = 'snow';
        tileMap[6]![11] = 'snow';
      }
      if ((roll() < 50)) {
        tileMap[4]![10] = 'snow';
        tileMap[5]![10] = 'snow';
      }
    }

    function placeRiverMountainStart(
      bounds: { xLo: number; xSpan: number; yLo: number; ySpan: number },
      maxGuesses: number,
    ): [number, number] | null {
      for (let i: number = 0; i < maxGuesses; i++) {
        const x: number = Math.floor((roll() / 100) * bounds.xSpan) + bounds.xLo;
        const y: number = Math.floor((roll() / 100) * bounds.ySpan) + bounds.yLo;
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
    //new sub-seed for the river
    const riverSeed = splitmix64(mainSeed.next());

    for (let i: number = 0; i < 12; i++) {
      const prevRow: number = riverRow;
      riverCol += colStep;
      riverRow += Math.floor((riverSeed.nextInt(0, 99) / 100) * 3) - 1;
      riverRow = Math.max(0, Math.min(11, riverRow));
      riverCol = Math.max(0, Math.min(11, riverCol));
      if (prevRow !== riverRow) {
        setRiverCell(prevRow, riverCol);
      }
      setRiverCell(riverRow, riverCol);
    }

    riverMountain = [riverRow, riverCol];
    // now determine the size of the sea in each direction
    // array order is clockwise NESW
    const seaSize: number[] = [];
    seaSize[0] = Math.floor((roll() / 100) * 4) + 1;
    seaSize[1] = Math.floor((roll() / 100) * 4) + 1;
    seaSize[2] = Math.floor((roll() / 100) * 4) + 1;
    seaSize[3] = Math.floor((roll() / 100) * 4) + 1;
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
        const seaEastRoll = roll();
        const seaEastColAhead = i > 0 ? 11 - (i - 1) : 11 - i;
        if (seaEastRoll < 33) {
          tileMap[6]![11 - i] = 'sea';
          tileMap[5]![seaEastColAhead] = 'sea';
          tileMap[5]![11 - i] = 'sea';
          tileMap[6]![seaEastColAhead] = 'sea';
        } else if (seaEastRoll < 66) {
          tileMap[6]![11 - i] = 'sea';
          tileMap[5]![11 - i] = 'sea';
        } else {
          tileMap[6]![seaEastColAhead] = 'sea';
          tileMap[5]![11 - i] = 'sea';
          tileMap[6]![11 - i] = 'sea';
          tileMap[5]![seaEastColAhead] = 'sea';
        }
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
    }
    // West
    for (let i: number = 0; i < seaSize[3] + 1; i++) {
      if (seaSideLeft) {
        const seaWestRoll = roll();
        const seaWestColAhead = i > 0 ? 11 - (i - 1) : 11 - i;
        if (seaWestRoll < 33) {
          tileMap[5]![11 - i] = 'sea';
          tileMap[6]![seaWestColAhead] = 'sea';
          tileMap[6]![11 - i] = 'sea';
          tileMap[5]![seaWestColAhead] = 'sea';
        } else if (seaWestRoll < 66) {
          tileMap[5]![11 - i] = 'sea';
          tileMap[6]![11 - i] = 'sea';
        } else {
          tileMap[5]![seaWestColAhead] = 'sea';
          tileMap[6]![11 - i] = 'sea';
          tileMap[5]![11 - i] = 'sea';
          tileMap[6]![seaWestColAhead] = 'sea';
        }
      } else {
        tileMap[5]![i] = 'sea';
        tileMap[6]![i] = 'sea';
      }
    }
    const seaNorthConvex = (roll() < 50);
    const seaDamp = (roll() / 100);
    if (seaSideLeft) {
      fillCorner('sea', [5 - seaSize[0]!, 11], [5, 11 - seaSize[1]!], [3, 4], seaNorthConvex, seaDamp);
      fillCorner('sea', [6 + seaSize[2]!, 11], [6, 11 - seaSize[1]!], [7, 8], !seaNorthConvex, seaDamp);
    } else {
      fillCorner('sea', [5 - seaSize[0]!, 0], [5, seaSize[3]!], [3, 4], seaNorthConvex, seaDamp);
      fillCorner('sea', [6 + seaSize[2]!, 0], [6, seaSize[3]!], [7, 8], !seaNorthConvex, seaDamp);
    }
  }

  initProcGen();
  tileMapToCells();
}

initGameBoard();

function isSetupShopType(type?: string): boolean {
  return type === 'setup1' || type === 'setup2';
}

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
    if (type === 'setup1') {
      tile.textContent = 'tower';
    } else if (type === 'setup2') {
      tile.textContent = 'interior';
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
    }, isSetupShopType(type));
  }
}

/* 0 = player/shop
  * 1 = CPU
  * 2 = environment 
  * 3 = setup */
let gameStage: number = 3;
let setupPhase: 1 | 2 = 1;

function hasTowerOnBoard(): boolean {
  for (const row of tileMap) {
    for (const cell of row) {
      if (cell === 'tower') return true;
    }
  }
  return false;
}

function tryAdvanceSetupPhase(): void {
  if (gameStage !== 3 || isShopOpen()) return;
  if (setupPhase === 1 && hasTowerOnBoard()) {
    setupPhase = 2;
    initShop(7, 'setup2');
  }
}

document.getElementById('trigger-shop-btn')?.addEventListener('click', (): void => {
  if (gameStage === 3) {
    if (isShopOpen()) return;
    if (setupPhase === 1) {
      initShop(1, 'setup1');
    } else {
      initShop(7, 'setup2');
    }
  } else {
    initShop(3);
  }
});

initShop(1, 'setup1');

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
        if (isShopOpen() || !isSetupComplete() || setupPhase !== 2) {
          return 3;
        }
        setupPhase = 1;
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

function getCellNeighbors(y: number, x: number): string[][] {
  const neighbors: string[][] = [];
  for (let i = 0; i < 3; i++) {
    neighbors[i] = [];
    for (let j = 0; j < 3; j++) {
      neighbors[i]![j] = tileMap[(y + 1) - i]?.[(x + 1) - j] ?? 'undefined';
    }
  }
  return neighbors;
}

function isTilePlacementValid(y: number, x: number, type: string): boolean {
  // don't let players palce on the other side of the board
  if (y < 6) return false;
  const existing = tileMap[y]?.[x] ?? '';
  if (existing === type) return false;
  if (existing === 'tower' || existing === 'interior') return false;

  const cellNeighbors: string[][] = getCellNeighbors(y, x);
  return ((): boolean => {
    switch (type) {

      case 'grass': {
        let numberMountainNeighbors = 0;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (i === 1 && j === 1) continue;
            const neighbor = cellNeighbors[i]![j];
            if (neighbor === 'snow') return false;
            if (neighbor === 'mountain') numberMountainNeighbors++;
          }
        }
        return numberMountainNeighbors <= 3;
      }

      case 'sea': {
        let numberSeaNeighbors = 0;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (i === 1 && j === 1) continue;
            if (cellNeighbors[i]![j] === 'sea') numberSeaNeighbors++;
            if (existing === 'snow' || existing === 'mountain') return false;
          }
        }
        return numberSeaNeighbors >= 1;
      }

      case 'river': {
        let numberRiverNeighbors = 0;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (i === 1 && j === 1) continue;
            if (cellNeighbors[i]![j] === 'river') numberRiverNeighbors++;
          }
        }
        // TODO: check if river is contiguous
        if (numberRiverNeighbors === 0) return false;
        return numberRiverNeighbors <= 2;
      }

      case 'mountain': {
        let numberMountainNeighbors = 0;
        let numberSnowNeighbors = 0;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (i === 1 && j === 1) continue;
            const neighbor = cellNeighbors[i]![j];
            if (neighbor === 'mountain') numberMountainNeighbors++;
            if (neighbor === 'snow') numberSnowNeighbors++;
          }
        }
        return numberMountainNeighbors + numberSnowNeighbors >= 2;
      }

      default:
        return true;

    }
  })();
}

