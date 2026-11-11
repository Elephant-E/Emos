#!/usr/bin/env python3
"""把 api.postman_collection.json 转成 docs/api-reference.md。

分组、名称、方法、路径、说明、请求体、示例响应原样搬运，不做改写；
路径中的 {{url}} 收敛为空（本站 API 均为 /api/... 相对路径）。
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "api.postman_collection.json"
OUT = ROOT / "docs" / "api-reference.md"


def clean_path(raw: str) -> str:
    """{{url}}/api/video/list?... → /api/video/list"""
    path = raw.replace("{{url}}", "")
    return path or "/"


def query_keys(item: dict) -> list[str]:
    url = item.get("request", {}).get("url", {})
    keys = []
    for q in url.get("query", []) or []:
        key = q.get("key")
        if key and key not in keys:
            keys.append(key)
    if not keys:
        m = re.search(r"\?(.+)$", url.get("raw", ""))
        if m:
            for pair in m.group(1).split("&"):
                key = pair.split("=")[0].strip()
                if key and key not in keys:
                    keys.append(key)
    return keys


def collect(items, trail, out):
    for it in items:
        if "item" in it:
            collect(it["item"], trail + [it.get("name", "")], out)
        else:
            out.append((trail, it))


def render(items, trail, lines, level=2):
    """按分组递归输出；同级的叶子请求跟在自己的分组里。"""
    # 先输出本组直接的请求
    for it in items:
        if "item" in it:
            continue
        render_request(it, trail, lines, level)
    for it in items:
        if "item" not in it:
            continue
        title = it.get("name", "")
        lines.append("")
        lines.append(f"{'#' * level} {title}")
        render(it["item"], trail + [title], lines, min(level + 1, 4))


def render_request(it, trail, lines, level):
    req = it.get("request", {})
    method = req.get("method", "GET")
    url = req.get("url", {})
    raw = url.get("raw", "") if isinstance(url, dict) else str(url)
    path = clean_path(raw)
    name = it.get("name", "")

    lines.append("")
    lines.append(f"{'#' * level} {name}")
    lines.append("")
    lines.append(f"`{method} {path}`")

    desc = req.get("description")
    if desc:
        lines.append("")
        lines.append(str(desc).strip())

    keys = query_keys(it)
    if keys:
        lines.append("")
        lines.append("参数：" + "、".join(f"`{k}`" for k in keys))

    body = req.get("body", {})
    body_raw = body.get("raw") if isinstance(body, dict) else None
    if body_raw:
        lines.append("")
        lines.append("```json5")
        lines.append(body_raw.strip())
        lines.append("```")

    form = body.get("urlencoded") if isinstance(body, dict) else None
    if form:
        lines.append("")
        lines.append("表单：" + "、".join(f"`{f.get('key')}`" for f in form))

    for resp in it.get("response", []) or []:
        payload = resp.get("body")
        if not payload:
            continue
        lines.append("")
        lines.append(f"返回（{resp.get('name', '示例')}）：")
        lines.append("")
        lines.append("```json")
        lines.append(str(payload).strip())
        lines.append("```")


def main():
    data = json.loads(SRC.read_text())
    lines = [
        "# API 参考",
        "",
        f"由 `api.postman_collection.json` 生成（{len(data.get('item', []))} 个分组）。",
        "只做格式转换：分组、名称、说明、请求体、示例响应都按原样搬过来。",
        "",
        "路径里的 `{{url}}` 已收敛，其余路径参数（如 `{{video_id}}`）保留。",
        "「这个接口接了没有」看 `docs/api-coverage.md`。",
        "",
    ]
    render(data.get("item", []), [], lines, level=2)
    OUT.write_text("\n".join(lines).rstrip() + "\n")

    # 统计
    leaves = []

    def walk(items):
        for it in items:
            if "item" in it:
                walk(it["item"])
            else:
                leaves.append(it)

    walk(data.get("item", []))
    print(f"写入 {OUT.relative_to(ROOT)}：{len(leaves)} 个接口，{len(data.get('item', []))} 个分组")


if __name__ == "__main__":
    main()
