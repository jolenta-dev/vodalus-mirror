function initTransition() {
  let dynamicStyles = null;
  function addAnimation(body) {
    if (!dynamicStyles) {
      dynamicStyles = document.createElement("style");
      dynamicStyles.type = "text/css";
      document.head.appendChild(dynamicStyles);
    }

    dynamicStyles.appendChild(document.createTextNode(body));
  }

  addAnimation(`
    @keyframes reveal_overlay {
    to {
      clip-path: circle(150% at 50% 50%);
    }
  }
  
  @keyframes expand_outermost {
    from {
      scale: 0%;
    }
    to {
      scale: 15000%;
    }
  }
  
  @keyframes expand_obfuscator {
    from {
      scale: 0%
    }
    to {
      scale: 15000%;
    }
  }
  
  @keyframes expand_inner {
    from {
      scale: 0%;
    }
    to {
      scale: 15000%;
    }
  }
  
  @keyframes fadeout {
    to {
      opacity: 0;
    }
  }
    `);

  let div1 = document.createElement('div');
  let div2 = document.createElement('div');
  let obfuscator = document.createElement('div');
  let overlay = document.createElement('div');
  div1.id = 'div1';
  div2.id = 'div2';
  obfuscator.id = 'obfuscator';
  overlay.id = 'overlay';

  document.body.appendChild(div1);
  document.body.appendChild(obfuscator);
  document.body.appendChild(div2); // assign these out of order so they z-index correctly over one another
  document.body.appendChild(overlay);

  Object.assign(div1.style, {
    backgroundColor: 'white',
    display: 'flex',
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderRadius: '50%',
    padding: '10px',
    animation: 'expand_outermost, fadeout',
    animationFillMode: 'forwards',
    animationDelay: '0s, 2s',
    animationDuration: '0.5s, 0.5s',
    scale: '0%',
  })
  Object.assign(div2.style, {
    backgroundColor: 'white',
    display: 'flex',
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderRadius: '50%',
    padding: '10px',
    animation: 'expand_inner, fadeout',
    animationDuration: '0.5s, 0.5s',
    animationDelay: '1s, 2s',
    animationFillMode: 'forwards',
    scale: '0%',
  })
  Object.assign(obfuscator.style, {
    backgroundColor: 'black',
    display: 'flex',
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderRadius: '50%',
    padding: '10px',
    scale: '0%',
    animation: 'expand_obfuscator, fadeout',
    animationFillMode: 'forwards',
    animationDelay: '0.5s, 2s',
    animationDuration: '0.5s, 0.5s',
  })
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: '#8c8c8c',
    clipPath: 'circle(0% at 50% 50%)',
    animation: 'reveal_overlay',
    animationFillMode: 'forwards',
    animationDelay: '1.5s',
    animationDuration: '1s',
  })
  Object.assign(document.body.style, {
    overflow: 'hidden',
  })
}
document.addEventListener('click', () => {
  initTransition();
})