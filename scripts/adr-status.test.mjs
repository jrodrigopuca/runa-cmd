// An ADR is "pendiente de código" while a task in its Implementación isn't
// done (T-249). Run with `node --test "scripts/*.test.mjs"`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adrStatusMismatch, implementationTasks } from './adr-status.mjs';

const states = new Map([
	['T-101', 'Hecho'],
	['T-102', 'Hecho'],
	['T-103', 'Pendiente'],
]);

test('reads the tasks of the Implementación line', () => {
	const text = '- **Estado:** aceptada\n- **Implementación:** [T-101](../backlog.md#t-101), [T-103](x)\n';
	assert.deepEqual(implementationTasks(text), ['T-101', 'T-103']);
});

test('an ADR without Implementación has no tasks', () => {
	assert.deepEqual(implementationTasks('- **Estado:** aceptada\n- **Código:** T-101\n'), []);
});

test('pending with a task not done, and the index says so: fine', () => {
	assert.equal(adrStatusMismatch(['T-101', 'T-103'], true, states), undefined);
});

test('every task done, and the index still says pending: fails, naming them', () => {
	assert.equal(
		adrStatusMismatch(['T-101', 'T-102'], true, states),
		"the index says 'pendiente de código', but T-101 and T-102 are done",
	);
});

test('a task not done, and the index says accepted: fails, naming it', () => {
	assert.equal(
		adrStatusMismatch(['T-101', 'T-103'], false, states),
		"T-103 isn't done, so the index should say 'pendiente de código'",
	);
});

test('without tasks, nothing is checked', () => {
	assert.equal(adrStatusMismatch([], true, states), undefined);
	assert.equal(adrStatusMismatch([], false, states), undefined);
});
