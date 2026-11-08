/**
 * Whether the ADR index says "pendiente de código" when, and only when, a task
 * in the ADR's Implementación isn't done (T-249). Without this, the index kept
 * nine decisions as pending long after their code shipped.
 */

/** The tasks named in an ADR's `Implementación` line. */
export function implementationTasks(text) {
	const line = text.split('\n').find((row) => row.includes('**Implementación:**'));
	return line ? [...new Set(line.match(/T-\d{3}/g) ?? [])] : [];
}

const list = (ids) => (ids.length > 1 ? `${ids.slice(0, -1).join(', ')} and ${ids.at(-1)}` : ids[0]);

/** Why the index is wrong about this ADR, or undefined if it's right. */
export function adrStatusMismatch(tasks, indexSaysPending, states) {
	if (tasks.length === 0) return undefined;
	const open = tasks.filter((task) => states.get(task) !== 'Hecho');

	if (indexSaysPending && open.length === 0) {
		return `the index says 'pendiente de código', but ${list(tasks)} ${tasks.length > 1 ? 'are' : 'is'} done`;
	}
	if (!indexSaysPending && open.length > 0) {
		return `${list(open)} ${open.length > 1 ? "aren't" : "isn't"} done, so the index should say 'pendiente de código'`;
	}
	return undefined;
}
