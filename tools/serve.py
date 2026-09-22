import http.server, socketserver, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__))+'/..')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
with socketserver.TCPServer(("127.0.0.1", 8099), H) as s:
    s.serve_forever()
