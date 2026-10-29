import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { MermaidBlock } from "../../components/mermaid-block.js";

export { readMermaidTheme } from "../../components/mermaid-dom.js";

export function mountMermaidBlock(element: HTMLElement) {
	createRoot(element).render(
		createElement(MermaidBlock, {
			code: "flowchart LR\nA --> B",
			isIncomplete: false,
			language: "mermaid",
			meta: 'title="fullscreen-check"',
			// Keep the real dialog and controls; diagram rendering is unrelated to
			// their background and contrast, so a small SVG makes this deterministic.
			service: {
				async render() {
					return {
						svg: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80" viewBox="0 0 160 80"><rect x="20" y="20" width="120" height="40" fill="#888" /></svg>',
					};
				},
			},
		}),
	);
}
