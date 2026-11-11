#!/usr/bin/env python3
"""对照 api.postman_collection.json 与 src/api/endpoints.ts，得出覆盖情况。

三类结论：
  已接+有调用   wrapper 存在，且 src/ 里有非 endpoints.ts 的地方调它
  已接+无调用   wrapper 存在，但没有任何界面/查询调它（要么是遗留，要么是刻意备着）
  未接          文档里有、代码里没有封装

反向也查一遍：代码里调了、文档里没有的接口（可能是新接口还没进 postman）。
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COLLECTION = ROOT / "api.postman_collection.json"
ENDPOINTS = ROOT / "src" / "api" / "endpoints.ts"
SRC = ROOT / "src"



# 对「未接」和「已接无调用」的判断。key 用归一化后的「方法 路径」。
# skip = 刻意不接；gap = 该补的缺口；tool = 后台工具类，界面上没有场景
VERDICTS = {
    # —— 刻意不接 ——
    ("GET", "/link"): ("skip", "浏览器跳转用的授权链接，不是 API 调用；LoginView 里拼字符串"),
    ("PUT", "https://emos.local/{var}"): ("skip", "客户端分片上传的 PUT 目标，走 uploader 的 uploadObject，不是接口"),
    ("GET", "/api/upload/store/disk"): ("skip", "暂存区需单独申请权限，管理员 token 也 422，已整体删除"),
    ("GET", "/api/upload/store/file"): ("skip", "同上"),
    ("POST", "/api/upload/store/archive"): ("skip", "同上"),
    ("POST", "/api/upload/music/saveHeadless"): ("skip", "「保存为群星版本」，契约里写明不建议；正常路径是先去 todb 补歌"),
    ("POST", "/api/redPacket/createTelegramHtml"): ("skip", "发到 Telegram 频道，bot 侧入口，后台没有场景"),
    ("GET", "/api/user/base"): ("skip", "字段是 /api/user 的子集，已有 /api/user"),
    ("GET", "/api/pay/getUserCarrot"): ("skip", "支付服务里查对方余额；本站转赠走 /api/carrot/transfer"),
    ("POST", "/api/pay/transfer"): ("skip", "支付服务内的转账；胡萝卜转赠已用 /api/carrot/transfer"),
    ("POST", "/api/pay/testNotify"): ("skip", "回调自测，联调用"),
    ("POST", "/api/pay/sendNotifyEmail"): ("skip", "手工发通知邮件，运营一次性动作"),
    ("POST", "/api/pay/create"): ("skip", "支付单由用户侧发起，后台只处理已有订单"),
    ("GET", "/api/video/tree"): ("tool", "取目录树，后台用不上（列表页走 /api/video/list）"),
    ("PUT", "/api/video/record/change"): ("tool", "改观影记录，属于用户侧行为，后台不改"),
    ("GET", "/api/video/getVideoId"): ("tool", "按 todb/tmdb id 反查 video_id，后台各页都已有 video_id"),
    ("PATCH", "/api/music/syncSpotifyArtist"): ("tool", "从 Spotify 同步歌手，一次性数据修补"),
    ("POST", "/api/music/song/batchHashExist"): ("tool", "按 hash 批量判重，上传前的客户端逻辑"),
    ("PUT", "/api/music/song/{var}/updateVideoId"): ("tool", "手工关联歌曲与影片，数据修补"),
    ("PUT", "/api/music/album/{var}/updateVideoId"): ("tool", "同上（专辑）"),
    ("POST", "/api/upload/video/saveInternal"): ("tool", "内部入库，服务端任务用"),

    # —— 缺口：旧项目有、这里没有 ——
    ("GET", "/api/rank/carrot"): ("gap", "萝卜排行榜，旧项目 CarrotModal 有"),
    ("GET", "/api/rank/upload"): ("gap", "上传量排行榜，旧项目 UploadRankModal 有"),
    ("GET", "/api/rank/sign"): ("gap", "签到排行榜，旧项目 SignRankModal 有"),
    ("GET", "/api/rank/userVideoRecordPlaying"): ("gap", "正在播放，旧项目 ViewingModal 有"),
    ("GET", "/api/rank/userLiveRecordPlaying"): ("gap", "正在播放（直播），同上"),
    ("POST", "/api/telegram/vote/create"): ("gap", "创建投票，旧项目 VoteModal 有"),
    ("GET", "/api/telegram/vote/result"): ("gap", "查看投票结果，同上"),
    ("POST", "/api/lottery/create"): ("gap", "创建抽奖，旧项目 LotteryModal 有"),
    ("GET", "/api/lottery/win"): ("gap", "中奖列表，同上"),
    ("PUT", "/api/lottery/cancel"): ("gap", "取消抽奖，同上"),
    ("PUT", "/api/lottery/stop"): ("gap", "手动开奖，同上"),
    ("GET", "/api/seek/query"): ("gap", "求片详情；求片页现在只有列表，看不到谁给了胡萝卜"),
    ("GET", "/api/seek/history"): ("gap", "求片的胡萝卜记录，同上"),
    ("POST", "/api/watch/{var}/video/update"): ("gap", "批量设置片单内视频；现在只能一条条加/删"),
    ("GET", "/api/watch/{var}/user"): ("gap", "查看片单订阅用户；旧项目片单详情有"),
    ("POST", "/api/invite/exit"): ("gap", "退出被邀请的关系；邀请页没有这个入口"),
    ("POST", "/api/invite/emps"): ("gap", "邀请用户进入 emps"),
    ("GET", "/api/pay/getUserSign"): ("gap", "查用户签到信息（支付服务）"),

    # —— 新接口，后台还没评估过 ——
    ("GET", "/api/reel/rand"): ("todo", "影院域 6 个接口，旧项目也没有，用途未确认"),
    ("GET", "/api/reel/info/{var}"): ("todo", "同上"),
    ("POST", "/api/reel/create"): ("todo", "同上"),
    ("GET", "/api/reel/media"): ("todo", "同上"),
    ("POST", "/api/reel/manifest"): ("todo", "同上"),
    ("POST", "/api/reel/progress"): ("todo", "同上"),
    ("POST", "/api/fund/order/check"): ("todo", "资金下单前的资格检查；资金页现在是直接下单，失败才知道"),
}

UNUSED_VERDICTS = {
    "watchApi.emptyVideos": ("gap", "清空片单内视频；片单详情现在只能一条条移除"),
    "watchApi.emptyMusic": ("gap", "清空片单内音乐，同上"),
    "musicApi.playUrl": ("gap", "音乐资源没有试听，视频详情有「复制播放地址」"),
    "musicApi.moveMedia": ("gap", "音乐资源不能移动，视频详情可以移动到别的集"),
    "payApi.close": ("gap", "支付服务没有「关闭」入口；申请下来之后只能一直开着"),
    "videoApi.getVideoId": ("tool", "按 todb/tmdb 反查 video_id，页面都有 video_id"),
    "recordApi.change": ("tool", "改观影记录，用户侧行为"),
    "payApi.userCarrot": ("skip", "见 pay/transfer：本站转赠走 carrot 域"),
}


def norm(path: str) -> str:
    """把动态段统一成 {var}：{{video_id}} / ${videoId} / :id 都算一处"""
    path = path.replace("{{url}}", "")
    path = re.sub(r"\{\{[^}]+\}\}", "{var}", path)
    path = re.sub(r"\$\{[^}]+\}", "{var}", path)
    path = re.sub(r"\{[A-Za-z_][\w]*\}", "{var}", path)
    path = path.split("?")[0].rstrip("/")
    return path or "/"


def path_regex(path: str):
    """已归一化的路径 → 正则，能匹配 endpoints.ts 里带 ${...} 的模板串"""
    parts = re.split(r"(\{var\})", path)
    out = ""
    for part in parts:
        if part == "{var}":
            out += r"\$\{[^}]+\}|\{\{[^}]+\}\}|\{[^}]+\}"
        else:
            out += re.escape(part)
    return re.compile(out)


def collection_endpoints():
    data = json.loads(COLLECTION.read_text())
    out = []

    def walk(items, trail):
        for it in items:
            if "item" in it:
                walk(it["item"], trail + [it.get("name", "")])
            else:
                req = it.get("request", {})
                url = req.get("url", {})
                raw = url.get("raw", "") if isinstance(url, dict) else str(url)
                out.append(
                    {
                        "group": " / ".join(trail),
                        "name": it.get("name", ""),
                        "method": (req.get("method") or "GET").upper(),
                        "raw": raw,
                        "path": norm(raw),
                    }
                )

    walk(data.get("item", []), [])
    return out


def wrapper_index():
    """扫 endpoints.ts：得到 (归一化路径, 对象名, 函数名, 方法) 四条信息"""
    text = ENDPOINTS.read_text()
    lines = text.splitlines()
    wrappers = []
    obj = None
    obj_start = 0
    for i, line in enumerate(lines):
        m = re.match(r"export const (\w+) = \{", line)
        if m:
            obj = m.group(1)
            obj_start = i
        if obj is None:
            continue
        m = re.search(r"^\s{2}(\w+):\s*(?:async\s*)?\(", line)
        if not m:
            continue
        name = m.group(1)
        # 该函数体：从这一行到下一个同级属性或对象结束
        body = [line]
        for nxt in lines[i + 1 :]:
            if re.match(r"^\s{2}\w+:", nxt) or re.match(r"^\}", nxt):
                break
            body.append(nxt)
        chunk = "\n".join(body)
        pm = re.search(r"request<[^(]*\(\s*[`'\"]([^`'\"]+)[`'\"]", chunk)
        if not pm:
            continue
        path = norm(pm.group(1))
        mm = re.search(r"method:\s*'(\w+)'", chunk)
        wrappers.append(
            {
                "object": obj,
                "fn": name,
                "path": path,
                "method": (mm.group(1) if mm else "GET").upper(),
                "line": i + 1,
            }
        )
    return wrappers


def call_sites(object_name: str, fn: str) -> list[str]:
    hits = []
    # 链式调用常被写成 mediaApi\n  .move(...)，中间允许换行与空白
    pattern = re.compile(rf"\b{re.escape(object_name)}\s*\.\s*{re.escape(fn)}\b")
    for file in SRC.rglob("*"):
        if file.suffix not in {".ts", ".tsx"} or file == ENDPOINTS:
            continue
        try:
            content = file.read_text()
        except Exception:
            continue
        if pattern.search(content):
            hits.append(str(file.relative_to(ROOT)))
    return sorted(hits)


def main():
    eps = collection_endpoints()
    wraps = wrapper_index()

    by_path = {}
    for w in wraps:
        by_path.setdefault((w["method"], w["path"]), []).append(w)

    rows = []
    for ep in eps:
        if not ep["raw"]:
            rows.append({**ep, "status": "文档缺路径", "wrappers": [], "callers": []})
            continue
        key = (ep["method"], ep["path"])
        matches = by_path.get(key, [])
        if not matches:
            rows.append({**ep, "status": "未接", "wrappers": [], "callers": []})
            continue
        callers = []
        for w in matches:
            for file in call_sites(w["object"], w["fn"]):
                callers.append(f"{w['object']}.{w['fn']} → {file}")
        rows.append(
            {
                **ep,
                "status": "已接+有调用" if callers else "已接+无调用",
                "wrappers": [f"{w['object']}.{w['fn']}" for w in matches],
                "callers": sorted(set(callers)),
            }
        )

    # 反向：代码有、文档没有
    doc_keys = {(ep["method"], ep["path"]) for ep in eps}
    extra = [w for w in wraps if (w["method"], w["path"]) not in doc_keys]

    from collections import Counter

    counter = Counter(r["status"] for r in rows)
    print(f"文档接口 {len(rows)} 个：{dict(counter)}")
    print(f"代码封装 {len(wraps)} 个；文档里没有的：{len(extra)}")
    for w in extra:
        callers = call_sites(w["object"], w["fn"])
        print(f"  {w['method']:6} {w['path']:58} {w['object']}.{w['fn']:<22} 调用方 {len(callers)}")

    out = ROOT / "docs" / "api-coverage.md"
    lines = [
        "# API 覆盖对照",
        "",
        f"文档（`api.postman_collection.json`）：**{len(rows)}** 个接口；",
        f"代码（`src/api/endpoints.ts`）：**{len(wraps)}** 个封装。",
        "",
        f"- 已接且有界面调用：**{counter.get('已接+有调用', 0)}**",
        f"- 已接但无调用：**{counter.get('已接+无调用', 0)}**",
        f"- 未接：**{counter.get('未接', 0)}**",
        f"- 代码有、文档没有：**{len(extra)}**",
        f"- 文档里 url 是空的：**{counter.get('文档缺路径', 0)}**",
        "",
        "由 `scripts/check-api-coverage.py` 生成，结论按代码静态扫描得出。",
        "",
        "## 未接（文档有、代码无封装）",
        "",
        "| 分组 | 接口 | 方法 路径 |",
        "|---|---|---|",
    ]
    for r in rows:
        if r["status"] == "未接":
            lines.append(f"| {r['group']} | {r['name']} | `{r['method']} {r['path']}` |")

    missing_url = [r for r in rows if r["status"] == "文档缺路径"]
    if missing_url:
        lines += ["", "## 文档里 url 是空的（没法判断）", "", "| 分组 | 接口 |", "|---|---|"]
        for r in missing_url:
            lines.append(f"| {r['group']} | {r['name']} |")

    lines += [
        "",
        "## 已接但无调用（封装在、没人调）",
        "",
        "| 分组 | 封装 | 方法 路径 | 判断 |",
        "|---|---|---|---|",
    ]
    for r in rows:
        if r["status"] == "已接+无调用":
            note = UNUSED_VERDICTS.get(r["wrappers"][0].split(", ")[0], ("", ""))
            lines.append(
                f"| {r['group']} | `{', '.join(r['wrappers'])}` | `{r['method']} {r['path']}` | {note[1] if note[0] else ''} |"
            )

    gap = [r for r in rows if r["status"] == "未接" and VERDICTS.get((r["method"], r["path"]), ("todo", ""))[0] == "gap"]
    if gap:
        lines += ["", "## 该补的缺口", "", "| 分组 | 接口 | 方法 路径 | 说明 |", "|---|---|---|---|"]
        for r in gap:
            lines.append(
                f"| {r['group']} | {r['name']} | `{r['method']} {r['path']}` | {VERDICTS[(r['method'], r['path'])][1]} |"
            )

    skipped = [r for r in rows if r["status"] == "未接" and VERDICTS.get((r["method"], r["path"]), ("todo", ""))[0] in {"skip", "tool"}]
    if skipped:
        lines += ["", "## 刻意不接 / 后台工具", "", "| 接口 | 方法 路径 | 原因 |", "|---|---|---|"]
        for r in skipped:
            lines.append(f"| {r['name']} | `{r['method']} {r['path']}` | {VERDICTS[(r['method'], r['path'])][1]} |")

    if extra:
        lines += ["", "## 代码有、文档没有", "", "| 封装 | 方法 路径 | 调用方 |", "|---|---|---|"]
        for w in extra:
            callers = call_sites(w["object"], w["fn"])
            lines.append(
                f"| `{w['object']}.{w['fn']}` | `{w['method']} {w['path']}` | {len(callers)} |"
            )
    out.write_text("\n".join(lines) + "\n")
    print(f"写入 {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
