#!/usr/bin/env python3
"""Export v3 ball seal via CDP."""
import json, time, urllib.request, base64, os, sys

CDP = "http://localhost:9222"
OUT = "/Coze/Drive/绒球/所有对话/主对话/rongball-xr/gallery/studio/painting/process/绒球印章图案/v1"
URL = "http://localhost:8765/gallery/tools/seal-studio.html?v=" + str(int(time.time()))

def cdp_new_tab(url):
    req = urllib.request.Request(f"{CDP}/json/new?{url}", method="PUT")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def cdp_close(tid):
    try:
        urllib.request.urlopen(f"{CDP}/json/close/{tid}", timeout=5).read()
    except: pass

def ws_send(ws, mid, method, params=None):
    import websocket
    msg = json.dumps({"id": mid, "method": method, "params": params or {}})
    ws.send(msg)
    while True:
        raw = ws.recv()
        data = json.loads(raw)
        if data.get("id") == mid:
            return data

def evaluate(ws, expr, mid=1):
    r = ws_send(ws, mid, "Runtime.evaluate", {
        "expression": expr,
        "returnByValue": True,
        "awaitPromise": True
    })
    return r.get("result", {}).get("result", {}).get("value")

def export(style, aging, filename):
    tab = cdp_new_tab(URL)
    tid = tab["id"]
    ws_url = tab["webSocketDebuggerUrl"]
    import websocket
    ws = websocket.create_connection(ws_url, timeout=30)
    ws_send(ws, 1, "Page.enable")
    ws_send(ws, 2, "Runtime.enable")
    # Wait for load
    for _ in range(40):
        time.sleep(0.25)
        ready = evaluate(ws, "typeof window.__sealStudio === 'object' && typeof window.__sealStudio.renderSeal === 'function'", 3)
        if ready: break
    # Configure
    js = f"""
    (function() {{
      var s = window.__sealStudio;
      s.state.patternId = 'ball';
      s.state.shape = 'square';
      s.state.style = '{style}';
      s.state.border = 'thin';
      s.state.aging = {aging};
      s.state.color = '#c8161d';
      s.rerender();
      s.renderSeal(s.renderCanvas, s.state);
      return s.renderCanvas.toDataURL('image/png');
    }})()
    """
    data_url = evaluate(ws, js, 10)
    ws.close()
    cdp_close(tid)
    if not data_url or not data_url.startswith("data:image/png;base64,"):
        print(f"FAIL {filename}: no data URL")
        return False
    b64 = data_url.split(",",1)[1]
    path = os.path.join(OUT, filename)
    with open(path, "wb") as f:
        f.write(base64.b64decode(b64))
    print(f"OK {filename} ({len(b64)//1024}KB b64)")
    return True

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    export("zhuwen", 20, "ben-zhuwen.png")
    time.sleep(1)
    export("baiwen", 20, "ben-baiwen.png")
    time.sleep(1)
    export("zhuwen", 40, "ben-aging40.png")
    print("DONE")
