// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { FALLBACK_MERMAID_TOKENS } from "../components/mermaid-diagram.js";
import { readMermaidTheme } from "../components/mermaid-dom.js";

afterEach(() => {
	document.body.replaceChildren();
	document.documentElement.className = "";
});

function themeElement(tokens: Record<string, string>) {
	const element = document.createElement("figure");
	for (const [name, value] of Object.entries(tokens)) {
		element.style.setProperty(name, value);
	}
	document.body.append(element);
	return element;
}

describe("readMermaidTheme", () => {
	it("uses the opaque card surface instead of a translucent card tint", () => {
		const element = themeElement({
			"--background": "#ffffff",
			"--card-surface": "#efeff7",
			"--card": "rgb(0 0 0 / 0.05)",
		});
		expect(readMermaidTheme(element).tokens.background).toBe("#efeff7");
	});

	it("composites legacy translucent card tokens over the page background", () => {
		const element = themeElement({
			"--background": "#ffffff",
			"--card": "rgb(0 0 0 / 0.05)",
		});
		expect(readMermaidTheme(element).tokens.background).toBe("#f2f2f2");
	});

	it("composites translucent host overrides before producing opaque diagram colors", () => {
		const element = themeElement({
			"--background": "#0000ff",
			"--card-surface": "rgb(255 0 0 / 0.25)",
			"--foreground": "rgb(255 255 255 / 0.5)",
		});
		const { tokens } = readMermaidTheme(element);
		expect(tokens.background).toBe("#4000bf");
		expect(tokens.foreground).toBe("#a080df");
	});

	it("preserves the backdrop for a fully transparent legacy card", () => {
		const element = themeElement({
			"--background": "#123456",
			"--card": "#0000",
		});
		expect(readMermaidTheme(element).tokens.background).toBe("#123456");
	});

	it("uses the detected mode's fallback surface when no card role is available", () => {
		const element = themeElement({});
		element.className = "dark";
		expect(readMermaidTheme(element).tokens.background).toBe(
			FALLBACK_MERMAID_TOKENS.dark.background,
		);
	});
});
