(function () {
	var mouseX = 0;
	var mouseY = 0;
	var instances = [];

	function tick() {
		for (var i = 0; i < instances.length; i++) {
			var s = instances[i];
			if (!s.following) continue;
			var el = s.el;
			var dcx = mouseX - s.anchorCx;
			var dcy = mouseY - s.anchorCy;
			dcx = Math.max(-s.maxDx, Math.min(s.maxDx, dcx));
			dcy = Math.max(-s.maxDy, Math.min(s.maxDy, dcy));
			s.curTx = dcx;
			s.curTy = dcy;
			el.style.transform = "translate(" + s.curTx + "px," + s.curTy + "px)";
		}
		requestAnimationFrame(tick);
	}

	let dynamicStyles = null;

	function addAnimation(body) { // adds the keyframes without importing a new CSS file
		if (!dynamicStyles) {
			dynamicStyles = document.createElement('style');
			dynamicStyles.type = 'text/css';
			document.head.appendChild(dynamicStyles);
		}

		dynamicStyles.sheet.insertRule(body, dynamicStyles.length);
	}

	addAnimation(`
     @keyframes wiggle {
		from {
			rotate: 10deg;
		}
		25% {
			rotate: -10deg;
		}
		50% {
			rotate: 10deg;
		}
		75% {
			rotate: -10deg;
		}
		to {
			rotate: 10deg;
    }
    `);


	document.addEventListener("mousemove", function (e) {
		mouseX = e.clientX;
		mouseY = e.clientY;
	});

	function attach(el) {
		var s = {
			el: el,
			following: false,
			anchorCx: 0,
			anchorCy: 0,
			maxDx: 0,
			maxDy: 0,
			curTx: 0,
			curTy: 0
		};
		instances.push(s);

		el.addEventListener("mouseenter", function (e) {
			mouseX = e.clientX;
			mouseY = e.clientY;
			var r = el.getBoundingClientRect();
			s.anchorCx = r.left + r.width / 2;
			s.anchorCy = r.top + r.height / 2;
			s.maxDx = el.offsetWidth * 0.1;
			s.maxDy = el.offsetHeight * 0.1;
			s.curTx = 0;
			s.curTy = 0;
			el.style.transform = "translate(0px,0px)";
			s.following = true;
			// style settings for the animation
			el.style.animationName = 'wiggle';
			el.style.animationIterationCount = 'infinite';
			el.style.animationDuration = '1s';
			el.style.animationDirection = 'alterante';
		});

		el.addEventListener("mouseleave", function () {
			s.following = false;
			s.curTx = 0;
			s.curTy = 0;
			el.style.transform = "";
			// clear the animation settings
			el.style.animationName = '';
			el.style.animationIterationCount = '';
			el.style.animationDuration = '';
			el.style.animationDirection = '';
		});
	}

	function scan(root) {
		(root || document).querySelectorAll("[data-sticky-follow]").forEach(function (el) {
			if (el.dataset.stickyFollowInit) return;
			el.dataset.stickyFollowInit = "1";
			attach(el);
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", function () {
			scan(document);
		});
	} else {
		scan(document);
	}

	window.initStickyFollow = scan;
	requestAnimationFrame(tick);
})();