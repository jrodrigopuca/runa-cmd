// What the CLI does, apart from how it's called. It doesn't change when the CLI
// moves from commander to Runa.
export interface BadgeOptions {
	style: 'flat' | 'round';
	textColor: string;
	uppercase: boolean;
}

const escapeXml = (text: string) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderBadge(label: string, { style, textColor, uppercase }: BadgeOptions): string {
	const text = escapeXml(uppercase ? label.toUpperCase() : label);
	const width = 10 + label.length * 7;
	const radius = style === 'round' ? 8 : 0;
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20">`,
		`<rect width="${width}" height="20" rx="${radius}" fill="#555"/>`,
		`<text x="5" y="14" fill="${textColor}" font-family="sans-serif" font-size="11">${text}</text>`,
		'</svg>',
	].join('');
}
