import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { compile } from "@tailwindcss/node";
import { chromium } from "playwright";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const compiled = await compile(
	'@import "./theme/scoped-tokens.css"; @import "./components/markdown.css";',
	{
		base: packageRoot,
		onDependency() {},
	},
);
const built = await Bun.build({
	entrypoints: [`${packageRoot}/scripts/fixtures/mermaid-theme.ts`],
	format: "esm",
	target: "browser",
	external: ["mermaid"],
});
assert(built.success, "Mermaid browser fixture must bundle successfully");
const bundle = await built.outputs[0].text();
const browser = await chromium.launch();
try {
	const page = await browser.newPage();
	await page.setContent(
		`<style>${compiled.build([])}</style><body style="background: white"><section id="scope" class="cline-ui-theme"><figure id="diagram"></figure></section><figure id="legacy"></figure><section id="fullscreen-scope" class="cline-ui-theme cline-markdown"><p>Transcript behind the fullscreen dialog</p><div id="fullscreen-root"></div></section></body>`,
	);
	const results = await page.evaluate(async (source) => {
		const url = URL.createObjectURL(
			new Blob([source], { type: "text/javascript" }),
		);
		const { readMermaidTheme, mountMermaidBlock } = await import(url);
		URL.revokeObjectURL(url);
		const scope = document.getElementById("scope");
		const diagram = document.getElementById("diagram");
		const legacy = document.getElementById("legacy");
		const fullscreenRoot = document.getElementById("fullscreen-root");
		if (!scope || !diagram || !legacy || !fullscreenRoot)
			throw new Error("Missing theme fixture");
		mountMermaidBlock(fullscreenRoot);
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = 1;
		const context = canvas.getContext("2d");
		function composite(color: string, background = "#ffffff") {
			if (!context) throw new Error("Canvas is unavailable");
			context.clearRect(0, 0, 1, 1);
			context.fillStyle = background;
			context.fillRect(0, 0, 1, 1);
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
			return `#${Array.from(context.getImageData(0, 0, 1, 1).data)
				.slice(0, 3)
				.map((channel) => channel.toString(16).padStart(2, "0"))
				.join("")}`;
		}
		const modes = [];
		for (const mode of ["light", "dark"]) {
			scope.classList.toggle("dark", mode === "dark");
			await Promise.resolve();
			const style = getComputedStyle(diagram);
			modes.push({
				mode,
				actual: readMermaidTheme(diagram).tokens.background,
				expected: composite(style.getPropertyValue("--card-surface")),
			});
		}
		diagram.style.setProperty(
			"--card-surface",
			"color-mix(in srgb, rgb(255 0 0 / 0.5), transparent)",
		);
		await Promise.resolve();
		const style = getComputedStyle(diagram);
		const translucentOverride = {
			actual: readMermaidTheme(diagram).tokens.background,
			expected: composite(
				style.getPropertyValue("--card-surface"),
				composite(style.getPropertyValue("--background")),
			),
		};
		legacy.style.setProperty("--background", "#ffffff");
		legacy.style.setProperty(
			"--card",
			"color-mix(in srgb, rgb(0 0 0 / 0.1), transparent)",
		);
		return {
			modes,
			translucentOverride,
			legacy: readMermaidTheme(legacy).tokens.background,
		};
	}, bundle);
	for (const { mode, actual, expected } of results.modes) {
		assert.equal(actual, expected, `${mode} diagram uses the opaque surface`);
	}
	assert.equal(
		results.translucentOverride.actual,
		results.translucentOverride.expected,
		"Translucent color-mix overrides are composited before PNG export",
	);
	assert.equal(results.legacy, "#f2f2f2", "Legacy card colors are composited");
	let minimumFullscreenContrast = Number.POSITIVE_INFINITY;
	for (const mode of ["light", "dark", "legacy"]) {
		await page.locator("#fullscreen-scope").evaluate((element, mode) => {
			element.setAttribute(
				"class",
				mode === "legacy"
					? "cline-markdown"
					: `cline-ui-theme cline-markdown ${mode === "dark" ? "dark" : ""}`,
			);
			if (mode === "legacy") {
				element.setAttribute(
					"style",
					"--card: #e7eaf0; --foreground: #111827; --muted-foreground: #374151",
				);
			}
		}, mode);
		await page.getByRole("button", { name: "View fullscreen" }).click();
		await page.mouse.move(0, 0);
		const dialog = page.getByRole("dialog");
		await dialog.waitFor({ state: "visible" });
		// Enable reset so every toolbar control is measured in its active state.
		await dialog.getByRole("button", { name: "Zoom in" }).press("Enter");
		await dialog
			.locator('button[aria-label^="Reset zoom"]:enabled')
			.waitFor({ state: "visible" });
		const fullscreen = await dialog.evaluate((element) => {
			const canvas = document.createElement("canvas");
			canvas.width = canvas.height = 1;
			const context = canvas.getContext("2d");
			if (!context) throw new Error("Canvas is unavailable");
			const paint = (color: string) => {
				if (!CSS.supports("color", color))
					throw new Error(`Invalid color: ${color}`);
				context.fillStyle = color;
				context.fillRect(0, 0, 1, 1);
				return Array.from(context.getImageData(0, 0, 1, 1).data);
			};
			const sample = (color: string) => {
				context.clearRect(0, 0, 1, 1);
				return paint(color);
			};
			const luminance = (rgb: number[]) =>
				rgb.slice(0, 3).reduce((sum, channel, i) => {
					const value = channel / 255;
					return (
						sum +
						(value <= 0.04045
							? value / 12.92
							: ((value + 0.055) / 1.055) ** 2.4) *
							[0.2126, 0.7152, 0.0722][i]
					);
				}, 0);
			const style = getComputedStyle(element);
			const surface = sample(style.backgroundColor);
			const expected = sample(
				style.getPropertyValue("--card-surface") ||
					style.getPropertyValue("--card"),
			);
			const controls = Array.from(
				element.querySelectorAll(
					".cline-mermaid__filename, .cline-mermaid__button",
				),
			).map((control) => {
				// A modal is painted above its backdrop, not its DOM ancestors.
				// Composite that backdrop over the fixture's white page first.
				sample("white");
				paint(getComputedStyle(element, "::backdrop").backgroundColor);
				const layers = [];
				for (
					let node: Element | null = control;
					node;
					node = node.parentElement
				) {
					const nodeStyle = getComputedStyle(node);
					if (nodeStyle.opacity !== "1" || nodeStyle.filter !== "none") {
						throw new Error(
							"Contrast sampling must account for opacity and filters",
						);
					}
					layers.unshift(nodeStyle.backgroundColor);
					if (node === element) break;
				}
				for (const color of layers) paint(color);
				const background = luminance(
					Array.from(context.getImageData(0, 0, 1, 1).data),
				);
				const foreground = luminance(paint(getComputedStyle(control).color));
				return {
					name: control.getAttribute("aria-label") ?? "filename",
					ratio:
						(Math.max(foreground, background) + 0.05) /
						(Math.min(foreground, background) + 0.05),
				};
			});
			return { modal: element.matches(":modal"), surface, expected, controls };
		});
		assert(fullscreen.modal, `${mode} fullscreen opens a native modal dialog`);
		assert.equal(fullscreen.controls.length, 5, "Filename and four controls");
		for (const { name, ratio } of fullscreen.controls) {
			assert(
				ratio >= (name === "filename" ? 4.5 : 3),
				`${mode} fullscreen ${name} contrast: ${ratio.toFixed(2)}:1`,
			);
			minimumFullscreenContrast = Math.min(minimumFullscreenContrast, ratio);
		}
		assert.equal(fullscreen.surface[3], 255, `${mode} fullscreen is opaque`);
		assert.deepEqual(
			fullscreen.surface,
			fullscreen.expected,
			`${mode} fullscreen uses the card surface with a legacy card fallback`,
		);
		await dialog.getByRole("button", { name: "Exit fullscreen" }).click();
		await dialog.waitFor({ state: "detached" });
	}
	console.log(
		`Mermaid opaque surfaces, translucent legacy overrides, and light/dark/legacy fullscreen controls passed (minimum contrast ${minimumFullscreenContrast.toFixed(2)}:1).`,
	);
} finally {
	await browser.close();
}
