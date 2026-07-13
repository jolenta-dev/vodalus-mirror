import { root } from "./root.js";

// base for dom-wrapping primitives: owns the root element and mounts it
export abstract class Component<T extends HTMLElement = HTMLElement> {
    readonly el: T;

    constructor(el: T) {
        this.el = el;
    }

    mount(parent: HTMLElement = root()): void {
        parent.appendChild(this.el);
    }
}
