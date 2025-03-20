from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Serve static files
        if self.path == '/':
            self.path = '/index.html'
        
        # Handle JSON file requests
        if self.path.endswith('.json'):
            try:
                with open(self.path[1:], 'r') as f:
                    data = json.load(f)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())
                return
            except FileNotFoundError:
                # Return empty array if file doesn't exist
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps([]).encode())
                return
            except Exception as e:
                self.send_error(500, str(e))
                return
        
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        # Handle JSON file updates
        if self.path.endswith('.json'):
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                with open(self.path[1:], 'w') as f:
                    json.dump(data, f, indent=2)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode())
                return
            except Exception as e:
                self.send_error(500, str(e))
                return

        self.send_error(404)

def run(server_class=HTTPServer, handler_class=CORSRequestHandler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Starting server on port {port}...')
    httpd.serve_forever()

if __name__ == '__main__':
    run() 