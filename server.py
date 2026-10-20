#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import os
import sys
import socket

PORT = 8000

def get_local_ips():
    ips = []
    try:
        import subprocess
        out = subprocess.check_output("ifconfig", shell=True).decode('utf-8')
        for line in out.splitlines():
            line = line.strip()
            if line.startswith("inet ") and "127.0.0.1" not in line:
                ip = line.split()[1]
                if not ip.startswith("198.18."): # 过滤代理 tun 虚拟网卡
                    ips.append(ip)
    except Exception:
        pass
    if not ips:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            ips.append(s.getsockname()[0])
            s.close()
        except Exception:
            ips.append('127.0.0.1')
    return ips

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

def run():
    web_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(web_dir, "dist")
    if os.path.exists(dist_dir):
        os.chdir(dist_dir)
    else:
        os.chdir(web_dir)
    
    handler = QuietHandler
    socketserver.TCPServer.allow_reuse_address = True
    
    local_ips = get_local_ips()
    local_url = f"http://localhost:{PORT}"
    
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print("=" * 64)
        print("🚀【微机与单片机 · 极速刷题宝】服务已启动！")
        print("=" * 64)
        print(f"💻 电脑浏览器访问 : {local_url}")
        for ip in local_ips:
            print(f"📱 手机/平板访问   : http://{ip}:{PORT}  (连同Wi-Fi或手机热点)")
        print("=" * 64)
        print("✨ 专为手机优化：")
        print("  • 左右滑动屏幕手势切题")
        print("  • 底部吸底拇指控制栏（上一题/看解析/答题卡/下一题）")
        print("  • 完美适配 iPhone / Android 刘海屏与小屏")
        print("  • 离线轻量，即开即刷，关网页不丢进度")
        print("=" * 64)
        print("按 Ctrl + C 可随时停止服务器。\n")
        
        # 本地自动打开
        webbrowser.open(local_url)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止运行。祝刷题顺利，逢考必过！✨")

if __name__ == '__main__':
    run()
