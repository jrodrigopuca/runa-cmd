/**
 * testCLI() keeps the exact bytes a command writes (T-262). It decoded every
 * write as UTF-8, so a PNG on stdout came back with U+FFFD in place of each
 * byte over 127, and nothing said so.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineCommand } from '../command.js';
import { testCLI } from '../testing.js';

const PNG = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 255, 128]);

const writing = (write: () => void) =>
	defineCommand({ meta: { name: 'probe', description: 'Writes' }, run: write });

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
	warn = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe('the bytes a command writes', () => {
	it('reach stdoutBytes exactly', async () => {
		const result = await testCLI(
			writing(() => {
				process.stdout.write(PNG);
			}),
		);

		expect(result.code).toBe(0);
		expect([...result.stdoutBytes]).toEqual([...PNG]);
	});

	it('keep the encoding of a string write', async () => {
		const result = await testCLI(
			writing(() => {
				process.stdout.write('ff00', 'hex');
			}),
		);
		expect([...result.stdoutBytes]).toEqual([0xff, 0x00]);
	});

	it('reach stderrBytes too', async () => {
		const result = await testCLI(
			writing(() => {
				process.stderr.write(PNG);
			}),
		);
		expect([...result.stderrBytes]).toEqual([...PNG]);
	});

	it('that are not UTF-8 make testCLI warn, naming the stream and the bytes', async () => {
		await testCLI(
			writing(() => {
				process.stdout.write(PNG);
			}),
		);

		expect(warn).toHaveBeenCalledTimes(1);
		const [message, options] = warn.mock.calls[0] as [string, { code: string }];
		expect(message).toContain("stdout of 'probe' isn't valid UTF-8");
		expect(message).toContain('result.stdoutBytes');
		expect(options.code).toBe('RUNA_TESTCLI_NOT_UTF8');
	});
});

describe('text', () => {
	it('is the same in stdout as before, and warns nothing', async () => {
		const result = await testCLI(
			writing(() => {
				console.log('héllo ✓');
			}),
		);

		expect(result.stdout).toBe('héllo ✓\n');
		expect(new TextDecoder().decode(result.stdoutBytes)).toBe('héllo ✓\n');
		expect(warn).not.toHaveBeenCalled();
	});

	it('split across two writes is decoded whole', async () => {
		const check = new TextEncoder().encode('✓');
		const result = await testCLI(
			writing(() => {
				process.stdout.write(check.subarray(0, 1));
				process.stdout.write(check.subarray(1));
			}),
		);

		expect(result.stdout).toBe('✓');
		expect(warn).not.toHaveBeenCalled();
	});
});
