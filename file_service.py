import os
import time
import config
from flask import request, jsonify

_MD_DIR = os.path.realpath(config.MD_DIRECTORY)


def _scan_files():
    if not os.path.isdir(_MD_DIR):
        return []
    files = []
    for root, _dirs, names in os.walk(_MD_DIR):
        for name in names:
            if not name.lower().endswith(".md"):
                continue
            full = os.path.join(root, name)
            if not os.path.isfile(full):
                continue
            relpath = os.path.relpath(full, _MD_DIR)
            stat = os.stat(full)
            mtime = stat.st_mtime
            size = stat.st_size
            files.append({
                "name": name,
                "path": relpath.replace(os.sep, "/"),
                "dir": os.path.relpath(root, _MD_DIR).replace(os.sep, "/") if root != _MD_DIR else "",
                "mtime": mtime,
                "mtime_display": time.strftime("%Y-%m-%d %H:%M", time.localtime(mtime)),
                "size": size,
                "size_display": _format_size(size),
            })
    return files


def _format_size(size):
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    else:
        return f"{size / (1024 * 1024):.1f} MB"


_SORT_KEYS = {
    "name": lambda f: (f["dir"], f["name"].lower()),
    "mtime": lambda f: f["mtime"],
    "size": lambda f: f["size"],
}


def list_files(sort_by="name", sort_order="asc", page=1, page_size=50):
    files = _scan_files()
    key_fn = _SORT_KEYS.get(sort_by, _SORT_KEYS["name"])
    reverse = sort_order == "desc"
    files.sort(key=key_fn, reverse=reverse)
    total = len(files)
    start = (page - 1) * page_size
    end = start + page_size
    return {
        "files": files[start:end],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def read_file(relative_path):
    real = os.path.realpath(os.path.join(_MD_DIR, relative_path))
    if not real.startswith(_MD_DIR + os.sep) and real != _MD_DIR:
        return None
    if not os.path.isfile(real):
        return None
    with open(real, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def handle_list_files():
    sort_by = request.args.get("sort_by", "name")
    sort_order = request.args.get("sort_order", "asc")
    try:
        page = int(request.args.get("page", "1"))
    except ValueError:
        page = 1
    try:
        page_size = int(request.args.get("page_size", str(config.DEFAULT_PAGE_SIZE)))
    except ValueError:
        page_size = config.DEFAULT_PAGE_SIZE
    page = max(1, page)
    page_size = max(1, min(500, page_size))
    result = list_files(sort_by, sort_order, page, page_size)
    return jsonify(result)


def handle_get_file(relpath):
    content = read_file(relpath)
    if content is None:
        return jsonify({"error": "File not found"}), 404
    name = os.path.basename(relpath)
    return jsonify({"name": name, "content": content})
