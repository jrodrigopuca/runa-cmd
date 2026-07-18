/**
 * @runa-cmd/core — "Did you mean" suggestion helpers
 *
 * Shared by the command-not-found path (cli.ts) and the unknown-option
 * strict check (parse/strict.ts). Internal module — not exported from
 * the package barrel (index.ts).
 */

/**
 * Levenshtein distance for "did you mean" suggestions.
 */
export function levenshtein(a: string, b: string): number {
	const rows = b.length + 1;
	const cols = a.length + 1;

	// Use a flat array for guaranteed index access without non-null assertions
	const matrix = new Array<number>(rows * cols).fill(0);
	const at = (i: number, j: number) => matrix[i * cols + j] ?? 0;
	const set = (i: number, j: number, v: number) => {
		matrix[i * cols + j] = v;
	};

	for (let i = 0; i < rows; i++) set(i, 0, i);
	for (let j = 0; j < cols; j++) set(0, j, j);

	for (let i = 1; i < rows; i++) {
		for (let j = 1; j < cols; j++) {
			if (b[i - 1] === a[j - 1]) {
				set(i, j, at(i - 1, j - 1));
			} else {
				set(
					i,
					j,
					Math.min(
						at(i - 1, j - 1) + 1, // substitution
						at(i, j - 1) + 1, // insertion
						at(i - 1, j) + 1, // deletion
					),
				);
			}
		}
	}

	return at(b.length, a.length);
}

/**
 * Find the best suggestion for a misspelled name.
 * Returns undefined if no close match exists (distance > 3).
 */
export function findSuggestion(input: string, candidates: string[]): string | undefined {
	let best: string | undefined;
	let bestDist = Infinity;

	for (const candidate of candidates) {
		const dist = levenshtein(input, candidate);
		if (dist < bestDist) {
			bestDist = dist;
			best = candidate;
		}
	}

	// Only suggest if reasonably close
	return bestDist <= 3 ? best : undefined;
}
