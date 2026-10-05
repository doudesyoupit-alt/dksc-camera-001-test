"""One command attempt, with a deadline and cleanup of its own process group."""
import os,signal,subprocess

def run_bounded(argv, *, timeout, **kwargs):
    if timeout <= 0:
        raise subprocess.TimeoutExpired(argv, timeout)
    process = subprocess.Popen(argv, start_new_session=(os.name == 'posix'), **kwargs)
    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired as error:
        if os.name == 'posix':
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        else:
            process.kill()
        stdout, stderr = process.communicate(timeout=2)
        error.output, error.stderr = stdout, stderr
        raise
    return subprocess.CompletedProcess(argv, process.returncode, stdout, stderr)
