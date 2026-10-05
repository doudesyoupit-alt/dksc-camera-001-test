"""Preserve the four archive checks; read /proc death evidence without TOCTOU.

The original test remains byte-exact. Only its descendant state observation is
adapted: a vanished PID directory is equivalent to the old not-exists branch.
A living descendant, permission failure or malformed stat still fails.
"""
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

raw_path = Path(__file__).with_name('bounded-process-005.py')
spec = importlib.util.spec_from_file_location('vdraw_bounded_process_archive', raw_path)
raw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(raw)


def descendant_exited(stat_path):
    try:
        state = stat_path.read_text().split(') ', 1)[1][0]
    except FileNotFoundError:
        # Confirm the PID itself vanished, rather than hiding a missing stat
        # for a PID that still exists (including possible PID reuse).
        if stat_path.parent.exists():
            raise
        return True
    return state == 'Z'


class RaceSafeBoundedProcessTests(raw.BoundedProcessTests):
    def test_timeout_kills_parent_and_descendant(self):
        if raw.os.name != 'posix':
            self.fail('process group verification requires POSIX; no skipped acceptance')
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory) / 'child'
            command = 'import subprocess,sys,time;from pathlib import Path;p=subprocess.Popen([sys.executable,"-c","import time;time.sleep(30)"]);Path(sys.argv[1]).write_text(str(p.pid));time.sleep(30)'
            started = time.monotonic()
            with self.assertRaises(subprocess.TimeoutExpired):
                raw.run_bounded([sys.executable, '-c', command, str(marker)], timeout=.4, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.assertLess(time.monotonic() - started, 3)
            child = int(marker.read_text())
            for _ in range(20):
                stat_path = Path('/proc') / str(child) / 'stat'
                if descendant_exited(stat_path):
                    break
                time.sleep(.02)
            else:
                self.fail('child process remained alive after timeout')


if __name__ == '__main__':
    unittest.main(defaultTest='RaceSafeBoundedProcessTests', verbosity=2)
