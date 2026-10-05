"""Independent loopback-only static preview. No APIs, external AI or deployment."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
import argparse
p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=4197);args=p.parse_args()
root=Path(__file__).resolve().parent/'web'
ThreadingHTTPServer(('127.0.0.1',args.port),partial(SimpleHTTPRequestHandler,directory=str(root))).serve_forever()
