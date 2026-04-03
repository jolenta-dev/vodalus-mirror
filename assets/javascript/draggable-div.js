export function initDraggableDiv(header, content) {
    var draggableDiv = document.createElement('div');
    draggableDiv.id = 'draggable-div';
    draggableDiv.innerHTML = `
                <div id="draggable-div-header">
                <div id="draggable-div-close">x</div>
                <div id="draggable-div-minimize">-</div>
                <div id="draggable-div-header-text">${header}</div>
                </div>
                <div id="draggable-div-content"></div>
                <div id="draggable-div-resize" aria-hidden="true"></div>
            `;
    var draggableDivHeader = draggableDiv.querySelector('#draggable-div-header');
    var draggableDivClose = draggableDiv.querySelector('#draggable-div-close');
    var draggableDivMinimize = draggableDiv.querySelector('#draggable-div-minimize');
    var draggableDivHeaderText = draggableDiv.querySelector('#draggable-div-header-text');
    var draggableDivContent = draggableDiv.querySelector('#draggable-div-content');
    var draggableDivResize = draggableDiv.querySelector('#draggable-div-resize');
    if (content instanceof Node) {
        draggableDivContent.appendChild(content);
    } else {
        draggableDivContent.innerHTML = content;
    }
    if (content instanceof HTMLIFrameElement) {
        Object.assign(draggableDivContent.style, { minHeight: '320px' });
        Object.assign(content.style, {
            width: '100%',
            height: '100%',
            border: '0',
            boxSizing: 'border-box',
            display: 'block',
            verticalAlign: 'top',
        });
    }
    document.body.appendChild(draggableDiv);

    Object.assign(draggableDivHeaderText.style, {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        margin: 'auto auto',
        width: '100%',
    });

    Object.assign(draggableDiv.style, {
        position: 'absolute',
        zIndex: '9',
        backgroundColor: '#f1f1f1',
        textAlign: 'center',
        border: '1px solid #d3d3d3',
        borderRadius: '8px',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        maxWidth: 'calc(100vw - 200px)',
    });
    Object.assign(draggableDivContent.style, {
        overflow: 'auto',
        minWidth: '0',
        flex: '1 1 auto',
        borderRadius: '0 0 8px 8px',
    });
    Object.assign(draggableDivResize.style, {
        position: 'absolute',
        right: '0',
        bottom: '0',
        width: '14px',
        height: '14px',
        cursor: 'nwse-resize',
        zIndex: '11',
    });

    const headerButtonStyle = {
        cursor: 'pointer',
        borderStyle: 'solid',
        padding: '5px',
        margin: '2.5px',
        height: '10px',
        width: '10px',
        borderRadius: '20%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };
    [draggableDivClose].forEach((el) =>
        Object.assign(el.style, headerButtonStyle, { backgroundColor: "red" })
    );
    [draggableDivMinimize].forEach((el) =>
        Object.assign(el.style, headerButtonStyle)
    );

    Object.assign(draggableDivHeader.style, {
        display: 'flex',
        padding: '10px',
        cursor: 'move',
        zIndex: '10',
        backgroundColor: '#245DDA',
        color: '#fff',
        borderRadius: '8px 8px 0 0',
    });

    placeExpandedInMain(draggableDiv);
    dragElement(draggableDiv);

    function placeExpandedInMain(el) {
        void el.offsetHeight;
        var w = el.offsetWidth || 280;
        var h = el.offsetHeight || 360;
        var pad = 8;
        var main = document.querySelector('.main');
        if (main) {
            var m = main.getBoundingClientRect();
            var left = m.right - w - pad;
            var top = m.top + pad;
            left = Math.max(m.left + pad, Math.min(left, m.right - w - pad));
            top = Math.max(m.top + pad, Math.min(top, m.bottom - h - pad));
            el.style.left = left + 'px';
            el.style.top = top + 'px';
        } else {
            el.style.left = Math.max(pad, window.innerWidth - w - pad) + 'px';
            el.style.top = pad + 'px';
        }
    }

    function dragElement(element) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        var preMinimizeTop = 0, preMinimizeLeft = 0;
        var preMinimizeHeightStyle = '';
        var contentEl = element.querySelector('#draggable-div-content');
        var minimizeEl = element.querySelector('#draggable-div-minimize');
        var resizeEl = element.querySelector('#draggable-div-resize');

        if (document.getElementById(element.id + "-header")) {
            document.getElementById(element.id + "-header").onmousedown = dragMouseDown;
        } else {
            element.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            if (contentEl.style.display === 'none')
                return;
            e.preventDefault();
            element.style.transition = '';
            if (element.style.bottom || element.style.right) {
                element.style.top = element.offsetTop + 'px';
                element.style.left = element.offsetLeft + 'px';
                element.style.bottom = 'auto';
                element.style.right = 'auto';
            }
            pos3 = e.clientX;
            pos4 = e.clientY;
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

            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }

        function toggleMinimize() {
            var headerBar = element.querySelector('#draggable-div-header');
            if (contentEl.style.display === 'none') {
                element.style.bottom = 'auto';
                element.style.right = 'auto';
                element.style.top = element.offsetTop + 'px';
                element.style.left = element.offsetLeft + 'px';
                element.style.height = preMinimizeHeightStyle;
                contentEl.style.display = 'block';
                contentEl.style.opacity = '1';
                contentEl.style.transition = 'opacity 0.3s ease';
                element.style.transition = 'none';
                void element.offsetHeight;
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        element.style.transition =
                            'top 0.5s ease, left 0.5s ease';
                        element.style.top = preMinimizeTop + 'px';
                        element.style.left = preMinimizeLeft + 'px';
                    });
                });
                minimizeEl.textContent = '-';
                resizeEl.style.display = '';
            } else {
                preMinimizeTop = element.offsetTop;
                preMinimizeLeft = element.offsetLeft;
                preMinimizeHeightStyle = element.style.height;
                contentEl.style.display = 'none';
                contentEl.style.opacity = '0';
                resizeEl.style.display = 'none';
                element.style.bottom = 'auto';
                element.style.right = 'auto';
                element.style.top = element.offsetTop + 'px';
                element.style.left = element.offsetLeft + 'px';
                element.style.height = headerBar.offsetHeight + 'px';
                var rect = element.getBoundingClientRect();
                var pad = 8;
                var main = document.querySelector('.main');
                var mrect = main ? main.getBoundingClientRect() : null;
                var anchorRight =
                    (mrect ? mrect.right : window.innerWidth) - pad;
                var anchorBottom = window.innerHeight - pad;
                var targetTop = rect.top + (anchorBottom - rect.bottom);
                var targetLeft = rect.left + (anchorRight - rect.right);
                var minL = mrect ? mrect.left + pad : pad;
                var maxL = (mrect ? mrect.right : window.innerWidth) - rect.width - pad;
                var minT = mrect ? mrect.top + pad : pad;
                var maxT = window.innerHeight - rect.height - pad;
                targetLeft = Math.max(minL, Math.min(targetLeft, maxL));
                targetTop = Math.max(minT, Math.min(targetTop, maxT));
                element.style.transition = 'none';
                void element.offsetHeight;
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        element.style.transition =
                            'top 0.5s ease, left 0.5s ease';
                        element.style.top = targetTop + 'px';
                        element.style.left = targetLeft + 'px';
                    });
                });
                minimizeEl.textContent = '+';
            }
        }
        draggableDivClose.addEventListener('click', () => {
            element.remove();
        });
        draggableDivMinimize.addEventListener('click', () => {
            toggleMinimize();
        });
        resizeEl.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (contentEl.style.display === 'none')
                return;
            var startX = e.clientX;
            var startY = e.clientY;
            var startW = element.offsetWidth;
            var startH = element.offsetHeight;
            element.style.transition = '';
            function onMove(ev) {
                ev.preventDefault();
                element.style.width = Math.max(220, startW + ev.clientX - startX) + 'px';
                element.style.height = Math.max(72, startH + ev.clientY - startY) + 'px';
            }
            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            }
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
        toggleMinimize();
    }
    if (window.vodalusApplyConveneNavUnreadMarker) window.vodalusApplyConveneNavUnreadMarker();
}
