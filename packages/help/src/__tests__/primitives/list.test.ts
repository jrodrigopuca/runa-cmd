/**
 * Unit tests for list() primitive (primitives/list.ts)
 *
 * Tests: bullet, indent, multi-line items, custom bullet, custom indent
 */
import { describe, expect, it } from 'vitest';
import { list } from '../../primitives/list.js';

// ─── Basic List ─────────────────────────────────────────────

describe('list — basic rendering', () => {
	it('renders a single-item list with default bullet and indent', () => {
		const result = list(['hello']);
		expect(result).toBe('  • hello');
	});

	it('renders multiple items', () => {
		const result = list(['one', 'two', 'three']);
		const lines = result.split('\n');
		expect(lines).toEqual(['  • one', '  • two', '  • three']);
	});

	it('handles empty items array', () => {
		const result = list([]);
		expect(result).toBe('');
	});
});

// ─── Custom Bullet ──────────────────────────────────────────

describe('list — custom bullet', () => {
	it('uses custom bullet character', () => {
		const result = list(['item'], { bullet: '-' });
		expect(result).toBe('  - item');
	});

	it('uses multi-char bullet', () => {
		const result = list(['item'], { bullet: '>>' });
		expect(result).toBe('  >> item');
	});
});

// ─── Custom Indent ──────────────────────────────────────────

describe('list — custom indent', () => {
	it('uses custom indent of 4', () => {
		const result = list(['item'], { indent: 4 });
		expect(result).toBe('    • item');
	});

	it('uses zero indent', () => {
		const result = list(['item'], { indent: 0 });
		expect(result).toBe('• item');
	});
});

// ─── Multi-line Items ───────────────────────────────────────

describe('list — multi-line items', () => {
	it('aligns continuation lines after bullet', () => {
		const result = list(['first line\nsecond line']);
		const lines = result.split('\n');
		expect(lines).toHaveLength(2);
		// First line: "  • first line" (indent=2, bullet="•", space)
		expect(lines[0]).toBe('  • first line');
		// Continuation: indent(2) + bullet(1) + space(1) = 4 spaces
		expect(lines[1]).toBe('    second line');
	});

	it('handles item with multiple continuation lines', () => {
		const result = list(['a\nb\nc']);
		const lines = result.split('\n');
		expect(lines).toHaveLength(3);
		expect(lines[0]).toBe('  • a');
		expect(lines[1]).toBe('    b');
		expect(lines[2]).toBe('    c');
	});

	it('continuation indent matches custom bullet width', () => {
		const result = list(['line1\nline2'], { bullet: '>>', indent: 3 });
		const lines = result.split('\n');
		// First: "   >> line1"
		expect(lines[0]).toBe('   >> line1');
		// Continuation: indent(3) + bullet(2) + space(1) = 6 spaces
		expect(lines[1]).toBe('      line2');
	});

	it('mixed single and multi-line items', () => {
		const result = list(['solo', 'multi\nline']);
		const lines = result.split('\n');
		expect(lines).toHaveLength(3);
		expect(lines[0]).toBe('  • solo');
		expect(lines[1]).toBe('  • multi');
		expect(lines[2]).toBe('    line');
	});
});
