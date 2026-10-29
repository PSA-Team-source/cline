import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { compile } from "@tailwindcss/node";
import { chromium, type Page } from "playwright";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AgentApprovalCard } from "../components/agent-approval-card.js";
import { AgentAskQuestion } from "../components/agent-ask-question.js";
import { Message, MessageContent } from "../components/agent-chat/index.js";
import {
	AgentComposerSendButton,
	AgentComposerStopButton,
} from "../components/agent-composer.js";
import { AgentPromptQueue } from "../components/agent-prompt-queue.js";
import { Badge } from "../components/badge.js";
import {
	Button,
	type ButtonTone,
	type ButtonVariant,
} from "../components/button.js";
import { Switch } from "../components/switch.js";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const variants: ButtonVariant[] = ["fill", "surface", "ghost"];
const tones: ButtonTone[] = ["accent", "neutral", "destructive"];
const buttonIds = variants.flatMap((variant) =>
	tones.map((tone) => `${variant}-${tone}`),
);
const composerIds = ["welcome", "conversation"].flatMap((variant) => [
	`send-${variant}`,
	`stop-${variant}`,
]);
const semanticPairs = [
	["primary", "primary-foreground"],
	["card", "card-foreground"],
	["popover", "popover-foreground"],
	["secondary", "secondary-foreground"],
	["accent", "accent-foreground"],
	["neutral-solid", "neutral-contrast"],
	["neutral-solid-hover", "neutral-contrast"],
	["success-surface", "success-text"],
	["warning-surface", "warning-text"],
	["error-surface", "error-text"],
	["info-surface", "info-text"],
	["success-solid", "success-contrast"],
	["error-solid", "error-contrast"],
	["warning-solid", "warning-contrast"],
	["info-solid", "info-contrast"],
	["sidebar-primary", "sidebar-primary-foreground"],
	["brand-violet-surface", "brand-violet-surface-foreground"],
	["card-surface", "foreground"],
] as const;
// Match Streamdown's rendered structure and generic utilities, including the
// neutral islands inside a message. Plain code avoids asynchronous highlighting.
const markdown = (prefix: string) =>
	h(
		"div",
		{ className: "cline-markdown" },
		h(
			"p",
			{ id: `${prefix}-paragraph` },
			"Readable prose with ",
			h(
				"button",
				{
					id: `${prefix}-link`,
					type: "button",
					"data-streamdown": "link",
					className: "text-primary underline",
				},
				"a link",
			),
		),
		h(
			"ul",
			{ className: "list-disc" },
			h("li", { id: `${prefix}-item` }, "A list item"),
		),
		h(
			"blockquote",
			{
				id: `${prefix}-quote`,
				"data-streamdown": "blockquote",
				className:
					"border-muted-foreground/30 border-l-4 pl-4 text-muted-foreground italic",
			},
			"A quoted instruction",
		),
		h(
			"p",
			null,
			h(
				"code",
				{
					id: `${prefix}-inline-code`,
					"data-streamdown": "inline-code",
					className: "rounded bg-muted px-1.5 py-0.5 font-mono text-sm",
				},
				"inline code",
			),
		),
		h(
			"div",
			{
				"data-streamdown": "table-wrapper",
				className:
					"my-4 flex flex-col gap-2 rounded-lg border border-border bg-sidebar p-2",
			},
			h(
				"div",
				{
					className:
						"border-collapse overflow-x-auto rounded-md border border-border bg-background",
				},
				h(
					"table",
					{ "data-streamdown": "table" },
					h(
						"thead",
						{ className: "bg-muted/80", "data-streamdown": "table-header" },
						h("tr", null, h("th", { id: `${prefix}-table-header` }, "Result")),
					),
					h(
						"tbody",
						null,
						h(
							"tr",
							null,
							h(
								"td",
								{ id: `${prefix}-table-cell` },
								"Table text ",
								h(
									"button",
									{
										id: `${prefix}-table-link`,
										type: "button",
										"data-streamdown": "link",
										className: "text-primary underline",
									},
									"with a link",
								),
							),
						),
					),
				),
			),
		),
		h(
			"div",
			{ "data-streamdown": "code-block" },
			h(
				"div",
				{ "data-streamdown": "code-block-body", className: "bg-background" },
				h(
					"pre",
					null,
					h("code", { id: `${prefix}-code-block` }, "const color = 'iris';"),
				),
			),
		),
	);
const markdownTextIds = [
	"paragraph",
	"link",
	"item",
	"quote",
	"inline-code",
	"table-header",
	"table-cell",
	"table-link",
	"code-block",
];
const fixture = renderToStaticMarkup(
	h(
		"main",
		{
			id: "theme",
			className: "cline-ui-theme",
			style: {
				backgroundColor: "var(--background)",
				color: "var(--foreground)",
				padding: 24,
			},
		},
		h(
			"div",
			{
				id: "surface",
				style: {
					display: "flex",
					alignItems: "center",
					flexWrap: "wrap",
					gap: 16,
					padding: 24,
					backgroundColor: "var(--surface-1)",
				},
			},
			...variants.flatMap((variant) =>
				tones.map((tone) =>
					h(
						Button,
						{
							id: `${variant}-${tone}`,
							key: `${variant}-${tone}`,
							variant,
							tone,
						},
						`${variant} ${tone}`,
					),
				),
			),
			...(["welcome", "conversation"] as const).flatMap((variant) => [
				h(
					AgentComposerSendButton,
					{ id: `send-${variant}`, key: `send-${variant}`, variant },
					"Send",
				),
				h(
					AgentComposerStopButton,
					{ id: `stop-${variant}`, key: `stop-${variant}`, variant },
					"Stop",
				),
			]),
			h(AgentApprovalCard, {
				title: "Approval",
				error: "An example error",
				onApprove() {},
				onReject() {},
			}),
			h(AgentAskQuestion, {
				items: [
					{
						id: "question",
						question: "Choose a response",
						options: ["Answer"],
					},
				],
				onAnswer() {},
			}),
			...semanticPairs.map(([background, color]) =>
				h(
					"span",
					{
						id: background,
						key: background,
						style: {
							padding: 8,
							backgroundColor: `var(--${background})`,
							color: `var(--${color})`,
						},
					},
					background,
				),
			),
			...[
				"accent-foreground",
				"success-text",
				"error-text",
				"warning-text",
				"info-text",
			].map((color) =>
				h(
					"span",
					{
						id: color,
						key: color,
						style: { color: `var(--${color})`, fontSize: 12 },
					},
					color,
				),
			),
			h(Switch, {
				id: "switch",
				defaultChecked: true,
				"aria-label": "Enabled",
			}),
			h(Badge, { id: "badge" }, "Status badge"),
			h(AgentPromptQueue, {
				items: [{ id: "queued", prompt: "Follow up", steer: true }],
				onEdit() {},
				onRemove() {},
				onSteer() {},
			}),
			h(
				"section",
				{ id: "regular-queue" },
				h(AgentPromptQueue, {
					items: [
						{ id: "regular", prompt: "A queued follow-up", steer: false },
					],
					onEdit() {},
					onRemove() {},
					onSteer() {},
				}),
			),

			h(
				Message,
				{ from: "user" },
				h(MessageContent, { id: "user-bubble" }, markdown("user")),
			),
			h(
				Message,
				{ from: "assistant" },
				h(MessageContent, null, markdown("assistant")),
			),
			h(
				Message,
				{ from: "error" },
				h(MessageContent, { id: "error-message" }, "The operation failed"),
			),
		),
	),
);
// compile() does not scan @source files. Include real rendered utilities so the
// composer and approval checks exercise their styles, including hover variants.
const utilities = Array.from(
	new Set(
		Array.from(fixture.matchAll(/class="([^"]+)"/g)).flatMap((match) =>
			match[1]
				.replaceAll("&gt;", ">")
				.replaceAll("&lt;", "<")
				.replaceAll("&quot;", '"')
				.replaceAll("&#x27;", "'")
				// Decode ampersands last so nested entities are only unescaped once.
				.replaceAll("&amp;", "&")
				.split(/\s+/),
		),
	),
);
const interactiveSelectors = [
	...buttonIds.map((id) => `#${id}`),
	...composerIds.map((id) => `#${id}`),
	".cline-ui-agent-approval-card__button--approve",
	".cline-ui-agent-approval-card__button--reject",
	"#user-link",
	"#user-table-link",
	"#assistant-link",
	"#assistant-table-link",
];
const textSelectors = [
	...semanticPairs.map(([background]) => `#${background}`),
	"#accent-foreground",
	"#success-text",
	"#error-text",
	"#warning-text",
	"#info-text",
	".cline-ui-agent-approval-card__error",
	"#badge",
	".cline-ui-agent-prompt-queue__badge",
	"#error-message",
	"#user-bubble",
	...["user", "assistant"].flatMap((prefix) =>
		markdownTextIds.map((id) => `#${prefix}-${id}`),
	),
];

async function contrast(
	page: Page,
	selector: string,
	property: "color" | "backgroundColor" | "outlineColor" = "color",
	pseudo?: string,
) {
	return page.locator(selector).evaluate(
		(element, { property, pseudo }) => {
			const canvas = document.createElement("canvas");
			canvas.width = canvas.height = 1;
			const context = canvas.getContext("2d");
			if (!context) throw new Error("Canvas unavailable");
			const rgba = (color: string) => {
				if (!CSS.supports("color", color))
					throw new Error(`Invalid color: ${color}`);
				context.clearRect(0, 0, 1, 1);
				context.fillStyle = color;
				context.fillRect(0, 0, 1, 1);
				return Array.from(context.getImageData(0, 0, 1, 1).data);
			};
			const blend = (foreground: number[], background: number[]) => [
				...foreground
					.slice(0, 3)
					.map(
						(channel, i) =>
							channel * (foreground[3] / 255) +
							background[i] * (1 - foreground[3] / 255),
					),
				255,
			];
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
			// Composite every ancestor: approval cards have their own alpha surface.
			const backgroundBehind = (node: Element | null): number[] => {
				if (!node) return [255, 255, 255, 255];
				const style = getComputedStyle(node);
				if (style.backgroundImage !== "none") {
					throw new Error("An ancestor gradient requires an explicit fixture");
				}
				return blend(
					rgba(style.backgroundColor),
					backgroundBehind(node.parentElement),
				);
			};
			const style = getComputedStyle(element, pseudo);
			if (style.filter !== "none" || style.opacity !== "1") {
				throw new Error(
					`${element.id}: contrast fixture must not ignore filters or opacity`,
				);
			}
			const behind = backgroundBehind(element.parentElement);
			let backgrounds = [
				property === "color"
					? blend(rgba(style.backgroundColor), behind)
					: behind,
			];
			if (property === "color" && style.backgroundImage !== "none") {
				// The welcome send button interpolates between primary and its darker
				// emphasis. Verify both endpoints, including the lighter worst case.
				const gradient = style.backgroundImage;
				if (!gradient.startsWith("linear-gradient(")) {
					throw new Error(`Unsupported gradient: ${gradient}`);
				}
				const parts: string[] = [];
				let depth = 0;
				let start = gradient.indexOf("(") + 1;
				for (let i = start; i < gradient.length - 1; i++) {
					if (gradient[i] === "(") depth++;
					if (gradient[i] === ")") depth--;
					if (gradient[i] === "," && depth === 0) {
						parts.push(gradient.slice(start, i).trim());
						start = i + 1;
					}
				}
				parts.push(gradient.slice(start, -1).trim());
				const stops = parts.filter((part) => CSS.supports("color", part));
				if (stops.length !== 2)
					throw new Error(`Unexpected gradient stops: ${gradient}`);
				backgrounds = stops.map((stop) => blend(rgba(stop), backgrounds[0]));
			}
			const foreground = rgba(style[property]);
			const ratios = backgrounds.map((background) => {
				const a = luminance(blend(foreground, background));
				const b = luminance(background);
				return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
			});
			return {
				ratio: Math.min(...ratios),
				foreground,
				backgrounds,
				outlineStyle: style.outlineStyle,
				outlineWidth: style.outlineWidth,
			};
		},
		{ property, pseudo },
	);
}

async function alphaPalettePairs(page: Page) {
	return page.locator("#theme").evaluate((element) => {
		const style = getComputedStyle(element);
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = 1;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas unavailable");
		const paint = (color: string) => {
			if (!CSS.supports("color", color))
				throw new Error(`Invalid palette color: ${color}`);
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
		};
		const pixel = () =>
			Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
		const background = style.getPropertyValue("--neutral-1");
		return ["neutral", "accent", "error", "success", "warning", "info"].flatMap(
			(palette) =>
				Array.from({ length: 12 }, (_, index) => {
					const step = index + 1;
					context.clearRect(0, 0, 1, 1);
					paint(style.getPropertyValue(`--${palette}-${step}`));
					const solid = pixel();
					context.clearRect(0, 0, 1, 1);
					paint(background);
					paint(style.getPropertyValue(`--${palette}-a${step}`));
					const composite = pixel();
					return {
						token: `${palette}-a${step}`,
						solid,
						composite,
						error: Math.max(
							...solid.map((channel, i) => Math.abs(channel - composite[i])),
						),
					};
				}),
		);
	});
}

const browser = await chromium.launch();
try {
	const page = await browser.newPage({
		viewport: { width: 1600, height: 1000 },
	});
	await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "none" });
	const reference = new Map<string, Awaited<ReturnType<typeof contrast>>>();
	const failures: string[] = [];
	let checkedPairs = 0;
	let checkedAlphaPairs = 0;
	let minimumTextContrast = Infinity;
	const record = (condition: boolean, message: string) => {
		if (!condition) failures.push(message);
	};
	const compare = (actual: unknown, expected: unknown, message: string) =>
		record(
			isDeepStrictEqual(actual, expected),
			`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`,
		);
	const check = async (
		context: string,
		key: string,
		selector: string,
		threshold = 4.5,
		property: "color" | "backgroundColor" | "outlineColor" = "color",
		pseudo?: string,
	) => {
		let result: Awaited<ReturnType<typeof contrast>>;
		try {
			result = await contrast(page, selector, property, pseudo);
		} catch (error) {
			failures.push(
				`${context}/${key}: ${error instanceof Error ? error.message : String(error)}`,
			);
			return;
		}
		if (result.ratio < threshold) {
			failures.push(
				`${context}/${key}: ${result.ratio.toFixed(2)}:1 < ${threshold}:1`,
			);
		}
		if (property === "outlineColor") {
			compare(result.outlineStyle, "solid", `${context}/${key}: outline style`);
			compare(result.outlineWidth, "2px", `${context}/${key}: outline width`);
		}
		if (context === "global") reference.set(key, result);
		else compare(result, reference.get(key), `${context}/${key}: theme parity`);
		if (property === "color")
			minimumTextContrast = Math.min(minimumTextContrast, result.ratio);
		checkedPairs++;
	};

	for (const context of [
		"global",
		"scoped-root",
		"scoped-ancestor",
		"full-theme",
	]) {
		const tokens = context === "global" ? "tokens" : "scoped-tokens";
		// Load the complete entry point without a standalone Markdown import,
		// so the fixture cannot hide cascade regressions in its import chain.
		const themeImports =
			context === "full-theme"
				? '@import "./theme/index.css";'
				: `@import "./theme/${tokens}.css"; @import "./theme/theme.css"; @import "./components/markdown.css";`;
		const compiled = await compile(
			`@import "tailwindcss"; ${themeImports} @import "./components.css"; @import "./components/agent-chat/agent-chat.css";`,
			{ base: packageRoot, onDependency() {} },
		);
		await page.setContent(
			`<!doctype html><style>${compiled.build(utilities)} * { transition: none !important; }</style>${fixture}`,
		);
		for (const mode of ["light", "dark"]) {
			await page.evaluate(
				({ context, mode }) => {
					document.body.classList.toggle(
						"dark",
						mode === "dark" && context !== "scoped-root",
					);
					document
						.querySelector("#theme")
						?.classList.toggle(
							"dark",
							mode === "dark" && context === "scoped-root",
						);
				},
				{ context, mode },
			);
			if (context === "global") {
				for (const pair of await alphaPalettePairs(page)) {
					record(
						pair.error <= 3,
						`${mode}/${pair.token}: alpha composite differs by ${pair.error}/255 (${pair.composite} vs ${pair.solid})`,
					);
					checkedAlphaPairs++;
				}
			}
			for (const surface of ["surface-1", "surface-2", "surface-3"]) {
				await page.locator("#surface").evaluate((element, surface) => {
					(element as HTMLElement).style.backgroundColor = `var(--${surface})`;
				}, surface);
				for (const selector of interactiveSelectors) {
					for (const hover of [false, true]) {
						if (hover) await page.locator(selector).hover();
						else await page.mouse.move(0, 0);
						await check(
							context,
							`${mode}/${surface}/${selector}/${hover ? "hover" : "rest"}`,
							selector,
						);
					}
				}
				await page.mouse.move(0, 0);
				for (const selector of textSelectors) {
					await check(context, `${mode}/${surface}/${selector}`, selector);
				}
				// Options use an unlayered lightweight hover role, so checking the
				// shared Button alone would miss a transparent-token regression.
				const questionOption = ".cline-ui-agent-ask-question__option";
				const restOption = await contrast(page, questionOption);
				await page.locator(questionOption).hover();
				const hoveredOption = await contrast(page, questionOption);
				record(
					!isDeepStrictEqual(hoveredOption.backgrounds, restOption.backgrounds),
					`${context}/${mode}/${surface}: answer options retain a visible hover background`,
				);
				for (const queueItem of [
					"#regular-queue .cline-ui-agent-prompt-queue__item",
				]) {
					await page.mouse.move(0, 0);
					const restQueue = await contrast(page, queueItem);
					await page.locator(queueItem).hover();
					const hoveredQueue = await contrast(page, queueItem);
					record(
						!isDeepStrictEqual(hoveredQueue.backgrounds, restQueue.backgrounds),
						`${context}/${mode}/${surface}/${queueItem}: queued prompts retain a visible hover background`,
					);
				}
				await page.mouse.move(0, 0);
				for (const prefix of ["user", "assistant"]) {
					await check(
						context,
						`${mode}/${surface}/${prefix}-marker`,
						`#${prefix}-item`,
						4.5,
						"color",
						"::marker",
					);
				}
				for (const hover of [false, true]) {
					if (hover) await page.locator("#switch").hover();
					else await page.mouse.move(0, 0);
					await check(
						context,
						`${mode}/${surface}/switch-thumb/${hover ? "hover" : "rest"}`,
						".cline-ui-switch__thumb",
						3,
						"backgroundColor",
					);
				}
				await page.mouse.move(0, 0);
				for (const [target, indicator] of [
					["#switch", ".cline-ui-switch__track"],
				]) {
					await page.locator(target).focus();
					record(
						await page
							.locator(target)
							.evaluate((element) => element.matches(":focus-visible")),
						`${context}/${mode}/${surface}/${target}: keyboard focus must be visible`,
					);
					await check(
						context,
						`${mode}/${surface}/${target}/focus`,
						indicator,
						3,
						"outlineColor",
					);
				}
			}
		}
	}
	assert.equal(
		checkedAlphaPairs,
		144,
		"Every solid/alpha pair must be checked in both modes",
	);
	assert.equal(failures.length, 0, failures.join("\n"));
	console.log(
		`Theme browser checks passed: ${checkedPairs} contrast pairs (minimum text ${minimumTextContrast.toFixed(2)}:1), ${checkedAlphaPairs} solid/alpha composites within 3/255, existing buttons, composer, approval, badge, queue and message content, switch thumbs/focus; full-theme/global/scoped parity in light and dark modes.`,
	);
} finally {
	await browser.close();
}
