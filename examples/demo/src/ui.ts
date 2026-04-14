/**
 * Tiny ANSI styling helpers for the demo CLI.
 * Zero dependencies — just escape codes.
 */

const isColor = process.stdout.isTTY !== false && !process.env.NO_COLOR;

const esc = (code: string) => (isColor ? `\x1b[${code}m` : '');

export const bold = (s: string) => `${esc('1')}${s}${esc('22')}`;
export const dim = (s: string) => `${esc('2')}${s}${esc('22')}`;
export const green = (s: string) => `${esc('32')}${s}${esc('39')}`;
export const yellow = (s: string) => `${esc('33')}${s}${esc('39')}`;
export const cyan = (s: string) => `${esc('36')}${s}${esc('39')}`;
export const red = (s: string) => `${esc('31')}${s}${esc('39')}`;
export const magenta = (s: string) => `${esc('35')}${s}${esc('39')}`;
export const gray = (s: string) => `${esc('90')}${s}${esc('39')}`;

/** Print a labeled key-value line. */
export const kv = (key: string, value: string) => `  ${dim(`${key}:`)} ${value}`;

/** Section header with underline. */
export const section = (title: string) => `\n${bold(title)}\n${'─'.repeat(title.length)}`;

/** Render a compact success box. */
export function successBox(title: string, lines: string[]): string {
	const content = lines.map((l) => `  ${l}`).join('\n');
	return `\n  ${green('✔')} ${bold(title)}\n${content}\n`;
}

/** Render a warning line. */
export const warn = (msg: string) => `  ${yellow('⚠')} ${msg}`;

/** Render an info line. */
export const info = (msg: string) => `  ${cyan('ℹ')} ${msg}`;

/** Simulated spinner-like step message. */
export const step = (n: number, total: number, msg: string) => `  ${dim(`[${n}/${total}]`)} ${msg}`;
