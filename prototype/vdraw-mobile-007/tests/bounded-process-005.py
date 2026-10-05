"""Timeout regression: hung child cannot outlive its own command group."""
import os,subprocess,sys,tempfile,time,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from bounded_process import run_bounded

class BoundedProcessTests(unittest.TestCase):
    def test_success_output(self):
        p=run_bounded([sys.executable,'-c','print("ready")'],timeout=2,stdout=subprocess.PIPE,text=True)
        self.assertEqual(p.returncode,0)
        self.assertEqual(p.stdout.strip(),'ready')
    def test_failure_is_returned_without_retry(self):
        with tempfile.TemporaryDirectory() as directory:
            marker=Path(directory)/'attempts'
            command='from pathlib import Path;import sys;p=Path(sys.argv[1]);p.write_text(p.read_text()+"x" if p.exists() else "x");sys.exit(3)'
            p=run_bounded([sys.executable,'-c',command,str(marker)],timeout=2)
            self.assertEqual(p.returncode,3)
            self.assertEqual(marker.read_text(),'x')
    @unittest.skipUnless(os.name=='posix','process group verification requires POSIX')
    def test_timeout_kills_parent_and_descendant(self):
        with tempfile.TemporaryDirectory() as directory:
            marker=Path(directory)/'child'
            command='import subprocess,sys,time;from pathlib import Path;p=subprocess.Popen([sys.executable,"-c","import time;time.sleep(30)"]);Path(sys.argv[1]).write_text(str(p.pid));time.sleep(30)'
            started=time.monotonic()
            with self.assertRaises(subprocess.TimeoutExpired):
                run_bounded([sys.executable,'-c',command,str(marker)],timeout=.4,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
            self.assertLess(time.monotonic()-started,3)
            child=int(marker.read_text())
            for _ in range(20):
                path=Path('/proc')/str(child)/'stat'
                if not path.exists() or path.read_text().split(') ',1)[1][0]=='Z':break
                time.sleep(.02)
            else:self.fail('child process remained alive after timeout')
    def test_expired_deadline_does_not_spawn(self):
        with tempfile.TemporaryDirectory() as directory:
            marker=Path(directory)/'unexpected'
            with self.assertRaises(subprocess.TimeoutExpired):
                run_bounded([sys.executable,'-c','from pathlib import Path;import sys;Path(sys.argv[1]).touch()',str(marker)],timeout=0)
            self.assertFalse(marker.exists())

if __name__=='__main__':unittest.main(verbosity=2)
