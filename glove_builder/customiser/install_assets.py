"""Copy named layers out of a scratch build_assets.py run into the page's
assets, and add only their entries to glove-data.json.

    python glove_builder/customiser/install_assets.py --build /tmp/assets \\
        --keys back2_swap,back3_swap --top swapZones

A full build re-encodes every asset, and with a different Pillow or libwebp
that changes bytes nobody asked to change. This takes each key and its _hi
layer, their bbox and sheen scale, and any whole top-level keys named with
--top; nothing already in glove-data.json is altered, and the file must
round-trip byte for byte before it is touched.
"""

import argparse
import json
import pathlib
import shutil

HERE = pathlib.Path(__file__).parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", required=True, type=pathlib.Path)
    ap.add_argument("--keys", required=True)
    ap.add_argument("--top", default="")
    ap.add_argument("--assets", type=pathlib.Path, default=HERE / "assets")
    args = ap.parse_args()
    src = json.loads((args.build / "glove-data.json").read_text())
    path = args.assets / "glove-data.json"
    text = path.read_text()
    data = json.loads(text)
    if json.dumps(data, separators=(",", ":")) != text:
        raise SystemExit(f"{path} does not round-trip; not touching it")
    keys = [k for k in args.keys.split(",") if k]
    keys += [k + "_hi" for k in keys if k + "_hi" in src["assets"]]
    for k in keys:
        if k in data["assets"]:
            raise SystemExit(f"{k} is already installed; not overwriting it")
        name = pathlib.Path(src["assets"][k]).name
        shutil.copyfile(args.build / name, args.assets / name)
        data["assets"][k] = f"{args.assets.name}/{name}"
        data["bbox"][k] = src["bbox"][k]
        if k in src["sheen"]:
            data["sheen"][k] = src["sheen"][k]
    for t in [t for t in args.top.split(",") if t]:
        if t in data:
            raise SystemExit(f"top-level '{t}' already exists; not overwriting it")
        data[t] = src[t]
    path.write_text(json.dumps(data, separators=(",", ":")))
    print(f"installed {', '.join(keys)}"
          + (f" and {args.top}" if args.top else ""))


if __name__ == "__main__":
    main()
