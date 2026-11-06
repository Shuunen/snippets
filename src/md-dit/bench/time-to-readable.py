#!/usr/bin/env python3
"""usage: time-to-readable.py runs wait_s cmd...
Launches cmd (it must run under XWayland, e.g. `env GDK_BACKEND=x11 md-dit file.md`), polls captures of its new window
and reports two times : "text visible" (text density of the central column reaches 80% of its final value, the readable one, side panels are ignored) and "settled" (the picture stops changing, includes lazy extras). Needs wmctrl, imagemagick and numpy.
Resolution is ~100 ms (one capture). Sandboxed apps must be given a file under $HOME, e.g. :
  bench/time-to-readable.py 5 9 flatpak run --socket=x11 --nosocket=wayland --env=GDK_BACKEND=x11 org.gnome.gitlab.somas.Apostrophe ~/big.md
Sanity check : on md-dit it matches its own `--exit-after-head` signal under X11 (973 ms polled vs 970 ms internal)."""
import os, subprocess, sys, time
import numpy as np

W, H = 430, 468


def windows():
    out = subprocess.run(["wmctrl", "-l"], capture_output=True, text=True).stdout
    return {line.split()[0] for line in out.splitlines() if line.strip()}


def capture(win):
    start = time.monotonic()
    raw = subprocess.run(["import", "-window", win, "-resize", f"{W}x{H}!", "-colorspace", "Gray", "-depth", "8", "gray:-"],
                         capture_output=True).stdout
    end = time.monotonic()
    if len(raw) != W * H:
        return None
    return (start + end) / 2, np.frombuffer(raw, np.uint8).reshape(H, W).astype(np.int16)


def one_run(wait, cmd):
    before = windows()
    t0 = time.monotonic()
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    win, shots = None, []
    while time.monotonic() - t0 < wait:
        if win is None:
            new = windows() - before
            if new:
                win = sorted(new)[0]
            else:
                time.sleep(0.01)
                continue
        shot = capture(win)
        if shot:
            shots.append((shot[0] - t0, shot[1]))
        time.sleep(float(os.environ.get("GAP", "0")))
    if cmd[0] == "flatpak":
        subprocess.run(["flatpak", "kill", cmd[-2]], capture_output=True)
    try:
        os.killpg(proc.pid, 15)
    except ProcessLookupError:
        pass
    time.sleep(1.5)
    if len(shots) < 3:
        return None
    final = shots[-1][1]
    diffs = [(np.abs(f - final) > 30).mean() for _, f in shots]
    first = shots[0][0]
    ready = len(diffs) - 1
    while ready > 0 and diffs[ready - 1] < 0.01:
        ready -= 1
    # text density of the central document column (30%-80% of the width) : share of pixels on a sharp edge,
    # ignores lazy side panels like a table of contents or a file list
    density = [(np.abs(np.diff(f[:, int(W * 0.3):int(W * 0.8)], axis=1)) > 40).mean() for _, f in shots]
    reached = next(i for i, d in enumerate(density) if d >= 0.8 * density[-1])
    return shots[ready][0] * 1000, first * 1000, len(shots), diffs[0], shots[reached][0] * 1000


if __name__ == "__main__":
    runs, wait, cmd = int(sys.argv[1]), float(sys.argv[2]), sys.argv[3:]
    vals, texts = [], []
    for i in range(runs):
        r = one_run(wait, cmd)
        print(f"run {i + 1}: " + ("failed" if r is None else f"first capture {r[1]:.0f} ms, text visible {r[4]:.0f} ms, settled {r[0]:.0f} ms ({r[2]} captures)"), flush=True)
        if r:
            vals.append(r[0])
            texts.append(r[4])
    if vals:
        print(f"text visible mean {np.mean(texts):.0f} ms  min {min(texts):.0f}  max {max(texts):.0f}  |  settled mean {np.mean(vals):.0f} ms  min {min(vals):.0f}  max {max(vals):.0f}")
