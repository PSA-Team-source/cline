import type { Meta } from "@storybook/react-vite";
import { useLayoutEffect, useRef, useState } from "react";

const sizes = [
	"xxs",
	"xs",
	"sm",
	"md",
	"base",
	"lg",
	"xl",
	"2xl",
	"3xl",
	"4xl",
	"6xl",
] as const;
const weights = ["normal", "medium", "semibold", "bold"] as const;

const meta: Meta = {
	title: "Foundations/Typography",
	tags: ["autodocs"],
	parameters: {
		docs: {
			description: {
				component:
					"Cline font families, type sizes, and weights. Values are read from the active theme; use the toolbar to compare light and dark modes.",
			},
		},
	},
};

export default meta;

type SizeValues = {
	size: string;
	pixels: string;
	lineHeight: string;
	lineHeightPixels: string;
	letterSpacing: string;
};

const formatPixels = (value: string) =>
	`${Number(Number.parseFloat(value).toFixed(3))}px`;

export const Overview = () => {
	const root = useRef<HTMLElement>(null);
	const [values, setValues] = useState<{
		rootSize: string;
		sizes: Record<string, SizeValues>;
		weights: Record<string, string>;
	} | null>(null);

	useLayoutEffect(() => {
		const element = root.current;
		if (!element) return;

		const measure = () => {
			const style = getComputedStyle(element);
			const sizeValues: Record<string, SizeValues> = {};
			for (const sample of element.querySelectorAll<HTMLElement>(
				"[data-type-size]",
			)) {
				const size = sample.dataset.typeSize;
				if (!size) continue;
				const sampleStyle = getComputedStyle(sample);
				sizeValues[size] = {
					size: style.getPropertyValue(`--text-${size}`).trim(),
					pixels: formatPixels(sampleStyle.fontSize),
					lineHeight: style
						.getPropertyValue(`--text-${size}--line-height`)
						.trim(),
					lineHeightPixels: formatPixels(sampleStyle.lineHeight),
					letterSpacing: style
						.getPropertyValue(`--text-${size}--letter-spacing`)
						.trim(),
				};
			}
			setValues({
				rootSize: formatPixels(
					getComputedStyle(document.documentElement).fontSize,
				),
				sizes: sizeValues,
				weights: Object.fromEntries(
					weights.map((weight) => [
						weight,
						style.getPropertyValue(`--font-weight-${weight}`).trim(),
					]),
				),
			});
		};

		measure();
		// Storybook's theme toolbar changes the class on the document root.
		const observer = new MutationObserver(measure);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "style"],
		});
		return () => observer.disconnect();
	}, []);

	return (
		<main className="mx-auto grid max-w-6xl gap-10 p-8" ref={root}>
			<header className="space-y-3">
				<p className="font-medium text-accent-foreground text-sm">@cline/ui</p>
				<h1 className="font-semibold text-4xl tracking-tight">Typography</h1>
				<p className="max-w-3xl text-base text-muted-foreground">
					Font families, type sizes, and weights from the Cline theme. Pixel
					values use the current {values?.rootSize ?? "…"} root font size.
				</p>
			</header>

			<section className="space-y-4">
				<h2 className="font-semibold text-xl">Font families</h2>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-3 rounded-xl border bg-card p-5">
						<h3 className="font-sans text-3xl">Inter</h3>
						<code className="text-muted-foreground text-xs">
							font-sans · --font-sans
						</code>
						<p className="font-sans">
							The quick brown fox jumps over the lazy dog.
						</p>
						<p className="font-sans text-muted-foreground">0123456789</p>
					</div>
					<div className="space-y-3 rounded-xl border bg-card p-5">
						<h3 className="font-mono text-3xl">Geist Mono</h3>
						<code className="text-muted-foreground text-xs">
							font-mono · --font-mono
						</code>
						<p className="font-mono">bun run build</p>
						<p className="font-mono text-muted-foreground">0123456789</p>
					</div>
				</div>
			</section>

			<section className="space-y-4">
				<div className="space-y-1">
					<h2 className="font-semibold text-xl">Type scale</h2>
					<p className="text-muted-foreground text-sm">
						Each sample uses its size, line height, and letter spacing tokens.
					</p>
				</div>
				<div className="divide-y overflow-hidden rounded-xl border bg-card">
					{sizes.map((size) => (
						<div
							className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
							key={size}
						>
							<div className="min-w-0 space-y-2">
								<code className="text-muted-foreground text-xs">
									--text-{size}
								</code>
								<p
									className="break-words font-sans"
									data-type-size={size}
									style={{
										fontSize: `var(--text-${size})`,
										lineHeight: `var(--text-${size}--line-height)`,
										letterSpacing: `var(--text-${size}--letter-spacing)`,
									}}
								>
									Build with Cline
								</p>
							</div>
							<dl className="grid grid-cols-3 gap-4 text-xs lg:w-96">
								<div className="space-y-1">
									<dt className="text-muted-foreground">Font size</dt>
									<dd className="font-mono">
										{values?.sizes[size]?.pixels ?? "…"}
									</dd>
									<dd className="font-mono text-muted-foreground">
										{values?.sizes[size]?.size ?? "…"}
									</dd>
								</div>
								<div className="space-y-1">
									<dt className="text-muted-foreground">Line height</dt>
									<dd className="font-mono">
										{values?.sizes[size]?.lineHeightPixels ?? "…"}
									</dd>
									<dd className="font-mono text-muted-foreground">
										{values?.sizes[size]?.lineHeight ?? "…"}
									</dd>
								</div>
								<div className="space-y-1">
									<dt className="text-muted-foreground">Letter spacing</dt>
									<dd className="font-mono">
										{values?.sizes[size]?.letterSpacing ?? "…"}
									</dd>
								</div>
							</dl>
						</div>
					))}
				</div>
			</section>

			<section className="space-y-4">
				<div className="space-y-1">
					<h2 className="font-semibold text-xl">Font weights</h2>
					<p className="text-muted-foreground text-sm">
						Weights adjust with the theme. Bold shares the semibold value.
					</p>
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{weights.map((weight) => (
						<div
							className="space-y-3 rounded-xl border bg-card p-5"
							key={weight}
						>
							<p
								className="text-2xl"
								style={{ fontWeight: `var(--font-weight-${weight})` }}
							>
								Aa {values?.weights[weight] ?? "…"}
							</p>
							<code className="block text-muted-foreground text-xs">
								font-{weight}
							</code>
							<code className="block text-muted-foreground text-xs">
								--font-weight-{weight}
							</code>
						</div>
					))}
				</div>
			</section>
		</main>
	);
};
