"""Press TAB in a real interactive zsh, and print what it offers.

Usage: zsh-tab.py <home> <bin dir> <line>...

zsh only reads a completion spec when completing, so `zsh -n` can't see a broken
one. A marker command ends each case, so this waits for zsh instead of sleeping.
"""
import os
import pty
import re
import select
import sys
import time

home, bin_dir, *lines = sys.argv[1:]
env = dict(os.environ, HOME=home, ZDOTDIR=home, PATH=f"{bin_dir}:{os.environ['PATH']}", TERM="dumb")

pid, fd = pty.fork()
if pid == 0:
    os.execvpe("zsh", ["zsh", "-i"], env)


def read_until(pattern, timeout=15):
    data = b""
    end = time.time() + timeout
    while time.time() < end:
        ready, _, _ = select.select([fd], [], [], 0.1)
        if ready:
            try:
                data += os.read(fd, 65536)
            except OSError:
                break
        if re.search(pattern, data):
            break
    return data.decode(errors="replace")


startup = read_until(rb"\$ ")
print(f"STARTUP {startup}")

for index, line in enumerate(lines):
    marker = f"DONE{index}END"
    os.write(fd, line.encode() + b"\t")
    # Give zsh a moment to list, then clear the line and ask for the marker
    time.sleep(0.8)
    os.write(fd, b"\x15")
    split = len(marker) // 2
    os.write(fd, f"echo {marker[:split]}''{marker[split:]}\n".encode())
    # The marker alone isn't enough: a TAB before the next prompt gets lost
    output = read_until(marker.encode() + rb"[\s\S]*\$ ")
    print(f"CASE {line}")
    print(re.sub(r"\x1b\[[0-9;?]*[a-zA-Z]", "", output).replace("\r", "").replace("\x07", ""))

os.write(fd, b"exit\n")
