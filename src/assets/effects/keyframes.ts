let dynamicStyles: HTMLStyleElement | undefined;

export function injectKeyframeRule(rule: string): void {
    if (!dynamicStyles) {
        dynamicStyles = document.createElement("style");
        dynamicStyles.type = "text/css";
        document.head.appendChild(dynamicStyles);
    }
    dynamicStyles.sheet?.insertRule(rule, dynamicStyles.sheet.cssRules.length);
}
