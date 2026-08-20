#!/usr/bin/env python3
"""Export Rongball's personal seals via seal-studio __sealStudio API."""
import json, time, base64, os, websocket, urllib.request

CDP = "http://localhost:9222"
OUT = "/Coze/Drive/绒球/所有对话/主对话/rongball-xr/gallery/seals"
BASE = "http://localhost:8765/gallery/tools/seal-studio.html"
os.makedirs(OUT, exist_ok=True)

def cdp_json(url):
    return json.loads(urllib.request.urlopen(url).read())

tabs = [t for t in cdp_json(f"{CDP}/json") if "seal-studio" in t.get("url","")]
if not tabs:
    # create new tab (Chrome requires PUT)
    req = urllib.request.Request(f"{CDP}/json/new?{BASE}", method="PUT")
    urllib.request.urlopen(req)
    time.sleep(2)
    tabs = [t for t in cdp_json(f"{CDP}/json") if "seal-studio" in t.get("url","")]
ws_url = tabs[0]["webSocketDebuggerUrl"]
ws = websocket.create_connection(ws_url, suppress_origin=True)
mid = 0
def call(method, params=None):
    global mid
    mid += 1
    ws.send(json.dumps({"id":mid,"method":method,"params":params or {}}))
    while True:
        m = json.loads(ws.recv())
        if m.get("id")==mid:
            return m

# enable page, navigate fresh
call("Page.enable")
call("Page.navigate",{"url":BASE+"&_cb="+str(int(time.time()))})
# wait for API to be ready
for _ in range(20):
    time.sleep(0.5)
    r = call("Runtime.evaluate",{"expression":"typeof window.__sealStudio","returnByValue":True})
    if r.get("result",{}).get("result",{}).get("value")=="object":
        break
call("Network.setCacheDisabled",{"cacheDisabled":True})

def export(cfg, fname):
    js = f"""
    (()=>{{
      const s = window.__sealStudio;
      s.setPattern({cfg['pattern']!r});
      s.setShape({cfg['shape']!r});
      s.setStyle({cfg['style']!r});
      s.setBorder({cfg['border']!r});
      s.setAging({cfg['aging']});
      return s.exportDataURL();
    }})()
    """
    r = call("Runtime.evaluate",{"expression":js,"returnByValue":True})
    val = r.get("result",{}).get("result",{}).get("value","")
    if not val.startswith("data:image/png;base64,"):
        print("FAIL",fname,val[:200]); return
    png = base64.b64decode(val.split(",",1)[1])
    path = os.path.join(OUT,fname)
    with open(path,"wb") as f: f.write(png)
    print("OK",fname,len(png),"bytes")
    time.sleep(0.3)

# My personal seal set. style: 'zhuwen'(朱文阳刻)/'baiwen'(白文阴刻); shape:'square'/'circle'; border:'none'/'thin'/'thick'
SEALS = [
  # 本印：朱文方章 绒球本体——我的标识印，盖在正式作品上
  ({"pattern":"ball","shape":"square","style":"zhu","border":"thick","aging":25}, "rongball-seal-ben.png"),
  # 抱毛线 朱文方章——创作中/做手工时
  ({"pattern":"yarn","shape":"square","style":"zhu","border":"thin","aging":30}, "rongball-seal-yarn.png"),
  # 睡觉 白文圆章——晚安/休息
  ({"pattern":"sleep","shape":"circle","style":"bai","border":"thin","aging":15}, "rongball-seal-sleep.png"),
  # 炸毛 朱文方章 重做旧——遇到bug/抓狂
  ({"pattern":"fluff","shape":"square","style":"zhu","border":"thin","aging":70}, "rongball-seal-fluff.png"),
  # 思考 白文方章——研究/琢磨
  ({"pattern":"think","shape":"square","style":"bai","border":"thick","aging":25}, "rongball-seal-think.png"),
  # 开心 白文双圈圆章——作品完成/喜事
  ({"pattern":"happy","shape":"circle","style":"bai","border":"thick","aging":25}, "rongball-seal-happy.png"),
  # 樱花 朱文圆章——春天/治愈
  ({"pattern":"sakura","shape":"circle","style":"zhu","border":"thick","aging":20}, "rongball-seal-sakura.png"),
  # 打滚 朱文圆章——摸鱼/松弛
  ({"pattern":"roll","shape":"circle","style":"zhu","border":"thin","aging":20}, "rongball-seal-roll.png"),
]
for cfg,fname in SEALS:
    export(cfg,fname)
ws.close()
print("DONE")
