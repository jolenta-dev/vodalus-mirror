// @ts-nocheck
(function () {
    function includeHTML() {
        let z = document.getElementsByTagName("*");
        for (let i = 0; i < z.length; i++) {
            let elmnt = z[i];
            let file = elmnt.getAttribute("w3-include-html");
            if (file) {
                let xhttp = new XMLHttpRequest();
                xhttp.onreadystatechange = function () {
                    if (this.readyState === 4) {
                        if (this.status === 200) {
                            elmnt.innerHTML = this.responseText;
                            let scripts = elmnt.getElementsByTagName("script");
                            let scriptList = [];
                            for (let si = 0; si < scripts.length; si++) scriptList.push(scripts[si]);
                            for (let sj = 0; sj < scriptList.length; sj++) {
                                let oldScript = scriptList[sj];
                                let newScript = document.createElement("script");
                                let attrs = oldScript.attributes;
                                for (let ak = 0; ak < attrs.length; ak++) {
                                    newScript.setAttribute(attrs[ak].name, attrs[ak].value);
                                }
                                newScript.textContent = oldScript.textContent;
                                oldScript.parentNode.replaceChild(newScript, oldScript);
                            }
                        }
                        if (this.status === 404) {
                            elmnt.innerHTML = "Page not found.";
                        }
                        elmnt.removeAttribute("w3-include-html");
                        includeHTML();
                    }
                };
                xhttp.open("GET", file, true);
                xhttp.send();
                return;
            }
        }
    }
    includeHTML();
})();
