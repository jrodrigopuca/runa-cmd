// Child process for the subprocess gate (T-300). It uses no Runa code on
// purpose: it answers whether the platform supports what ADR-0030 needs.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, writeSync } from 'node:fs';

const INPUT_FD = 3;
const RESULT_FD = 4;

const modes = {
	// Reads JSON from one channel and answers on the other, synchronously, so
	// the answer survives the process.exit that follows.
	echo() {
		const input = JSON.parse(readFileSync(INPUT_FD, 'utf8'));
		const result = Buffer.from(JSON.stringify({ size: input.text.length, reply: input.text }));

		let written = 0;
		while (written < result.length) {
			written += writeSync(RESULT_FD, result, written);
		}
		process.exit(0);
	},

	// Cleanup must run when the parent drops the channel.
	cancellable() {
		process.on('disconnect', () => {
			writeFileSync(process.env.MARKER, 'cleanup ran');
			process.exit(0);
		});
		setInterval(() => {}, 1000);
		process.send?.('ready');
	},

	// Plays a server that dies abruptly: its child must still find out.
	parent() {
		const child = spawn(process.execPath, [process.argv[1], 'cancellable'], {
			stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
			detached: true, // On Windows, without it a job object kills the child with this process
			windowsHide: true,
		});
		child.once('message', () => process.send?.('ready'));
	},

	// Starts a process of its own, which must die with this one.
	tree() {
		const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
			stdio: 'ignore',
		});
		setInterval(() => {}, 1000);
		process.send?.(grandchild.pid);
	},
};

modes[process.argv[2]]();
