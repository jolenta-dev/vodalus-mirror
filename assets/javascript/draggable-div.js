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
            `;
    var draggableDivHeader = draggableDiv.querySelector('#draggable-div-header');
    var draggableDivClose = draggableDiv.querySelector('#draggable-div-close');
    var draggableDivMinimize = draggableDiv.querySelector('#draggable-div-minimize');
    var draggableDivHeaderText = draggableDiv.querySelector('#draggable-div-header-text');
    var draggableDivContent = draggableDiv.querySelector('#draggable-div-content');
    if (content instanceof Node) {
        draggableDivContent.appendChild(content);
        if (content.tagName === 'IFRAME') {
            Object.assign(content.style, {
                width: '100%',
                height: '100%',
                border: '0',
                display: 'block',
            });
        }
    } else {
        draggableDivContent.innerHTML = content;
    }
    document.body.appendChild(draggableDiv);
    dragElement(draggableDiv);

    Object.assign(draggableDivHeaderText.style, {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        margin: 'auto auto',
        width: '100%',
    });

    Object.assign(draggableDiv.style, {
        position: 'fixed',
        bottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
        right: 'max(12px, env(safe-area-inset-right, 0px))',
        top: 'auto',
        left: 'auto',
        zIndex: '5000',
        display: 'flex',
        flexDirection: 'column',
        width: 'min(400px, calc(100vw - 24px))',
        height: 'min(520px, calc(100vh - 24px))',
        minWidth: '260px',
        minHeight: '220px',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100vh - 24px)',
        resize: 'both',
        overflow: 'auto',
        backgroundColor: '#f1f1f1',
        textAlign: 'center',
        border: '1px solid #d3d3d3',
        borderRadius: '8px',
        boxSizing: 'border-box',
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
        flexShrink: '0',
        padding: '10px',
        cursor: 'move',
        zIndex: '10',
        backgroundColor: '#245DDA',
        color: '#fff',
        borderRadius: '8px 8px 0 0',
    });

    Object.assign(draggableDivContent.style, {
        flex: '1',
        minHeight: '0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    });

    function dragElement(element) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        var preMinimizeTop = 0, preMinimizeLeft = 0;
        var contentEl = element.querySelector('#draggable-div-content');
        var minimizeEl = element.querySelector('#draggable-div-minimize');

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
                var rFix = element.getBoundingClientRect();
                element.style.top = rFix.top + 'px';
                element.style.left = rFix.left + 'px';
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

        var cornerInset = 12;

        function toggleMinimize() {
            if (contentEl.style.display === 'none') {
                element.style.bottom = 'auto';
                element.style.right = 'auto';
                var rOpen = element.getBoundingClientRect();
                element.style.top = rOpen.top + 'px';
                element.style.left = rOpen.left + 'px';
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
            } else {
                var expandedRect = element.getBoundingClientRect();
                preMinimizeTop = expandedRect.top;
                preMinimizeLeft = expandedRect.left;
                contentEl.style.display = 'none';
                contentEl.style.opacity = '0';
                element.style.bottom = 'auto';
                element.style.right = 'auto';
                void element.offsetHeight;
                var rect = element.getBoundingClientRect();
                element.style.top = rect.top + 'px';
                element.style.left = rect.left + 'px';
                var targetTop = window.innerHeight - rect.height - cornerInset;
                var targetLeft = window.innerWidth - rect.width - cornerInset;
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
        toggleMinimize();
    }
    if (window.vodalusApplyConveneNavUnreadMarker) window.vodalusApplyConveneNavUnreadMarker();
}
