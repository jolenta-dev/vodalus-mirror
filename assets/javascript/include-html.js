(function () {
    function includeHTML() {
        var z = document.getElementsByTagName("*");
        for (var i = 0; i < z.length; i++) {
            var elmnt = z[i];
            var file = elmnt.getAttribute("w3-include-html");
            if (file) {
                var xhttp = new XMLHttpRequest();
                xhttp.onreadystatechange = function () {
                    if (this.readyState === 4) {
                        if (this.status === 200) {
                            elmnt.innerHTML = this.responseText;
                            var scripts = elmnt.getElementsByTagName("script");
                            var scriptList = [];
                            for (var si = 0; si < scripts.length; si++) scriptList.push(scripts[si]);
                            for (var sj = 0; sj < scriptList.length; sj++) {
                                var oldScript = scriptList[sj];
                                var newScript = document.createElement("script");
                                var attrs = oldScript.attributes;
                                for (var ak = 0; ak < attrs.length; ak++) {
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
