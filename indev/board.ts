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

function toggleCellState(cell: HTMLElement): void {
  if (cell.classList.contains('alive')) {
    cell.classList.remove('alive');
    cell.classList.add('dead');
  } else {
    cell.classList.remove('dead');
    cell.classList.add('alive');
  }
}

function setupShopTilePointerDrag(tile: HTMLElement, setPauseFloat: (paused: boolean) => void): void {
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
        toggleCellState(target);
        finishDragUI();
        tile.remove();
        shopTilesWrapper?.remove();
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

function initGameBoard(): void {
  const size: number = 12;
  const gameBoard: HTMLElement[][] = Array.from({ length: size }, (): HTMLElement[] =>
    new Array<HTMLElement>(size)
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
      let stateSeed: number = Math.random();
      if (stateSeed > 0.5) {
        cell.classList.add('alive');
      } else {
        cell.classList.add('dead');
      }
      rw.appendChild(cell);
      cell.addEventListener("click", (): void => toggleCellState(cell));
    }
  }
}
initGameBoard();

function initShop(items: number): void {
  if (!document.getElementById('shop-tiles-wrapper')) {
    const shopTilesWrapper = document.createElement('div');
    shopTilesWrapper.id = 'shop-tiles-wrapper';
    document.body.appendChild(shopTilesWrapper);
  }

  for (let i: number = 0; i < items; i++) {
    const tile = document.createElement('div');
    tile.id = `shop-tile-${i}`;
    tile.classList.add('shop-tile');
    let pauseFloat = false;
    floatTile(tile, (): boolean => pauseFloat);
    setupShopTilePointerDrag(tile, (active: boolean | undefined): void => {
      if (active !== undefined) pauseFloat = active;
    });
  }
}

document.getElementById('trigger-shop-btn')?.addEventListener('click', (): void => initShop(3));
