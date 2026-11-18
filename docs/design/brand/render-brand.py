#!/usr/bin/env python3
"""Export the TaxSorted brand from its native VectorCraft master into the repository.

  python3 docs/design/brand/render-brand.py           # check the sources, then write every export in place
  python3 docs/design/brand/render-brand.py --check   # check, export to a temporary folder, compare bytes only

Before exporting it stops on: a CLI other than the pinned version, a font that is not exact or misses glyphs,
an import warning, a TaxSortedMark.tsx whose reader paint is not on its one circle, native symbols that differ
from TaxSortedMark.tsx, or a Local icon glyph that differs from the symbol. README.md says what each export is
for. Stdlib only.
"""

import argparse
import json
import os
from pathlib import Path
import re
import struct
import subprocess
import tempfile


DESIGN = Path(__file__).resolve().parent
PROJECT = DESIGN.parents[2]
MASTER = DESIGN / "taxsorted-brand.vectorcraft"
EXPORTS = DESIGN / "exports"
APP = PROJECT / "frontend/src/app"
ICONS = PROJECT / "frontend/public/icons"
DESKTOP = PROJECT / "desktop/assets"
MARK_TSX = PROJECT / "frontend/src/components/brand/TaxSortedMark.tsx"
LOCKUP_TSX = PROJECT / "frontend/src/components/brand/TaxSortedLockup.tsx"
TOOLS = {"VECTORCRAFT_CLI": ("vectorcraft-cli-0.13.1", "0.13.1"),   # env override: (default, pinned version)
         "PHOTOCRAFT_CLI": ("photocraft-cli-0.10.0", "0.10.0")}
ARTBOARDS = ["Mark", "Lockup", "LockupSmall", "Wordmark", "Icon", "Maskable", "Local", "Social", "Favicon16",
             "Tile", "LockupPlate"]
SYMBOLS = {32: ("Common Reader", "Mark"), 16: ("Common Reader small", "Favicon16")}   # viewBox -> symbol, artboard
LOCAL_PARTS = ["local-leaf-left", "local-leaf-right", "local-block-left", "local-block-right", "local-reader"]
READER = 'style="fill:var(--ts-mark-reader,currentColor)"'
READER_JSX = 'style={{ fill: "var(--ts-mark-reader, currentColor)" }}'
SVG = {"outlineText": True, "responsive": True, "minify": True, "metadata": False,
       "preserveEditing": False, "objectIds": "minimal"}
MACHINE_PATH = re.compile(r"/Users/|/home/|/private/|/var/folders/|file:|[A-Za-z]:\\")


def run(*args):
    try:
        return subprocess.run(args, check=True, capture_output=True, text=True, timeout=300).stdout
    except subprocess.CalledProcessError as error:
        raise SystemExit(f"{Path(args[0]).name} failed: {(error.stderr or error.stdout).strip()}")


def pinned_tools():
    """Exports differ byte for byte between ArtCraft releases, so only the pinned versions may run."""
    tools = []
    for env, (default, version) in TOOLS.items():
        executable = os.environ.get(env, default)
        try:
            reported = run(executable, "--version").split()
        except FileNotFoundError:
            raise SystemExit(f"{executable} was not found. Install {version} or set {env} to its path.")
        if len(reported) < 2 or reported[1] != version:
            raise SystemExit(f"{executable} reports {' '.join(reported)}; this pipeline is pinned to {version}. "
                             f"Set {env} to a {version} executable.")
        tools.append(executable)
    return tools


def vector(vc, source, steps):
    """One headless VectorCraft session. Any warning stops the export (warnings never change its exit code)."""
    args = [vc, "run", "--in", str(source)]
    for command, params in steps:
        args.extend(["--cmd", command, "--params", json.dumps(params)])
    for line in run(*args).splitlines():
        result = json.loads(line).get("result")
        if isinstance(result, dict) and (result.get("warnings") or result.get("importWarnings")):
            raise SystemExit(f"VectorCraft warnings: {result.get('warnings') or result.get('importWarnings')}")


def native(path):
    return json.loads(Path(path).read_text())["document"]


def swatches(document):
    return {item["name"]: "#" + "".join(f"{round(item['paint']['color'][c] * 255):02x}" for c in "rgb")
            for item in document["swatches"] if item["name"].startswith("Brand ")}


def symbol(document, name):
    return next(item["art"] for item in document["symbols"] if item["name"] == name)


def subpaths(art, scale=(1, 1)):
    """Every subpath in an art tree as its points (anchors and handles), whatever the grouping."""
    found = []

    def visit(node):
        kind = node.get("kind", {})
        if kind.get("type") == "path":
            for subpath in kind["path"]["subpaths"]:
                found.append([(point[0] * scale[0], point[1] * scale[1]) for anchor in subpath["anchors"]
                              for point in (anchor["p"], anchor.get("in"), anchor.get("out")) if point])
        for child in kind.get("children") or []:
            visit(child)
    visit(art)
    return found


def same_shape(a, b):
    """Equal up to position and uniform scale, to 1/10,000 of the drawing's width."""
    def fitted(paths):
        xs, ys = [x for path in paths for x, _ in path], [y for path in paths for _, y in path]
        x0, y0, width = min(xs), min(ys), max(xs) - min(xs)
        return sorted([((x - x0) / width, (y - y0) / width) for x, y in path] for path in paths)
    a, b = fitted(a), fitted(b)
    return len(a) == len(b) and all(len(p) == len(q) and all(abs(s - t) < 1e-4 for u, v in zip(p, q)
                                                             for s, t in zip(u, v)) for p, q in zip(a, b))


def natural(document, name):
    """Symbol art is stored in a 20 x 20 box; scale it back to the symbol's natural proportions."""
    width, height = document["unknown"]["symbolSizes"][name]
    return subpaths(symbol(document, name), (width / 20, height / 20))


def placement(document, rect):
    """Scale and centre of the symbol instance on an artboard, relative to the artboard's corner."""
    for node in document["layers"][0]["kind"]["children"]:
        if node["kind"]["type"] == "symbolinstance":
            a, _, _, d, e, f = node["kind"]["xf"]
            if rect["x0"] <= e <= rect["x1"] and rect["y0"] <= f <= rect["y1"]:
                return a, d, e - rect["x0"], f - rect["y0"]
    raise SystemExit("Each compared artboard must show one instance of its symbol")


def component_marks():
    """TaxSortedMark's drawings by viewBox size: (black copy for import, standalone currentColor SVG)."""
    marks = {}
    for size, body in re.findall(r'<svg viewBox="0 0 (\d+) \1"[^>]*>(.*?)</svg>', MARK_TSX.read_text(), re.S):
        body = re.sub(r"\s+", " ", body.replace(READER_JSX, READER)).strip().replace(" />", "/>").replace("> <", "><")
        if "{" in body:
            raise SystemExit("TaxSortedMark.tsx must hold static geometry and the documented reader style")
        # The shape comparison below is colour-blind, so the paint is checked here: the one circle is the reader.
        circles, paths = re.findall(r"<circle\b[^>]*>", body), re.findall(r"<path\b[^>]*>", body)
        if (len(circles) != 1 or READER not in circles[0] or body.count(READER) != 1 or not paths
                or any('fill="currentColor"' not in path for path in paths)):
            raise SystemExit("TaxSortedMark.tsx must paint its one circle with the reader style and its paths "
                             "with currentColor")
        head = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}"'
        black = body.replace(READER, 'fill="#000000"').replace("currentColor", "#000000")
        marks[int(size)] = (f'{head} width="{size}" height="{size}">{black}</svg>',
                            f"{head}><title>TaxSorted</title>{body}</svg>")
    if set(marks) != set(SYMBOLS):
        raise SystemExit("TaxSortedMark.tsx must keep its 32- and 16-unit drawings")
    return marks


def check_sources(vc, document, marks, temp):
    names = [board["name"] for board in document["artboards"]]
    if names != ARTBOARDS:
        raise SystemExit(f"The native master's artboards changed ({names}); update ARTBOARDS and README.md")
    info = json.loads(run(vc, "info", str(MASTER)))
    fonts = info.get("fonts") or []
    if info.get("warnings") or not fonts or any(font["status"] != "exact" or font["missingGlyphs"] for font in fonts):
        raise SystemExit(f"Resolve native import or font warnings before exporting: {info.get('warnings')} {fonts}")
    # Symbol art is normalised, so shape is compared alone, then size and position through the instance that
    # each drawing makes on its own artboard (the component's viewBox; the master's Mark or Favicon16).
    for size, (black, _) in marks.items():
        name, artboard = SYMBOLS[size]
        source, reference = temp / f"component-{size}.svg", temp / f"component-{size}.vectorcraft"
        source.write_text(black)
        vector(vc, source, [("select.all", {}), ("symbol.new", {"name": "Component", "registration": 4}),
                            ("document.save", {"path": str(reference)})])
        mine = native(reference)
        board = next(item["rect"] for item in document["artboards"] if item["name"] == artboard)
        if not same_shape(natural(mine, "Component"), natural(document, name)) or any(
                abs(s - t) > 1e-3 for s, t in zip(placement(mine, mine["artboards"][0]["rect"]),
                                                  placement(document, board))):
            raise SystemExit(f"TaxSortedMark ({size}-unit drawing) and the native '{name}' symbol differ; "
                             "reconcile the mark before export")
    # The Local icon draws the mark in place (paper pages, lifted reader), so symbol edits do not reach it.
    parts = {node.get("name"): node for node in document["layers"][0]["kind"]["children"]}
    if not set(LOCAL_PARTS) <= set(parts):
        raise SystemExit(f"The Local artboard must keep its named glyph parts: {', '.join(LOCAL_PARTS)}")
    local = {"kind": {"type": "group", "children": [parts[name] for name in LOCAL_PARTS]}}
    if not same_shape(subpaths(local), natural(document, SYMBOLS[32][0])):
        raise SystemExit("The Local icon glyph no longer matches the 'Common Reader' symbol; redraw it")


def mono(svg, colours):
    """Light lockup -> inline encoding: ink follows the text colour, heather becomes the reader variable."""
    svg = svg.replace(f'fill="{colours["Brand ink"]}"', 'fill="currentColor"')
    svg = svg.replace(f'fill="{colours["Brand heather"]}"', READER)
    if re.search(r'fill="#', svg):
        raise SystemExit("Unexpected paint in a lockup export; only Brand ink and Brand heather may appear")
    return svg


def lockup_component(bodies):
    """Write the exported geometry into TaxSortedLockup.tsx's two <svg> elements (small first, then regular)."""
    found = iter(bodies)

    def swap(match):
        view_box, body = next(found)
        body = re.sub(r"<title>.*?</title>", "", body).replace(READER, READER_JSX)
        return f"{match[1]}{view_box}{match[3]}{body}{match[5]}"
    text, count = re.subn(r'(<svg viewBox=")([^"]+)("[^>]*>\s*)(.*?)(\s*</svg>)', swap, LOCKUP_TSX.read_text(),
                          flags=re.S)
    if count != 2:
        raise SystemExit("TaxSortedLockup.tsx must keep exactly two <svg> elements: small, then regular")
    return text


def favicon_svg(svg, colours):
    """Tab icon: the small drawing on its tile, which lifts to dark accent when the browser reports a dark scheme."""
    tile = f'fill="{colours["Brand heather"]}"'
    if svg.count(tile) != 1:
        raise SystemExit("The Favicon16 artboard must paint only its tile in Brand heather")
    style = (f'<style>.t{{fill:{colours["Brand heather"]}}}'
             f'@media (prefers-color-scheme:dark){{.t{{fill:{colours["Brand dark accent"]}}}}}</style>')
    return re.sub(r"(<svg\b[^>]*>)", r"\1" + style, svg.replace(tile, 'class="t"'), count=1)


def combine_ico(files):
    """Package PhotoCraft's single-frame ICO exports without touching their encoded pixels."""
    frames = []
    for path in files:
        data = path.read_bytes()
        reserved, kind, count = struct.unpack_from("<HHH", data)
        if (reserved, kind) != (0, 1):
            raise SystemExit(f"Not an ICO: {path.name}")
        for index in range(count):
            entry = data[6 + index * 16:22 + index * 16]
            size, offset = struct.unpack_from("<II", entry, 8)
            frames.append((entry[:8], data[offset:offset + size]))
    offset = 6 + 16 * len(frames)
    directory, pixels = bytearray(), bytearray()
    for header, payload in frames:
        directory.extend(header + struct.pack("<II", len(payload), offset))
        pixels.extend(payload)
        offset += len(payload)
    return struct.pack("<HHH", 0, 1, len(frames)) + directory + pixels


def render(vc, pc, document, marks, temp):
    """Every export in a temporary folder, keyed by its destination in the repository."""
    colours = swatches(document)
    boards = {name: index for index, name in enumerate(ARTBOARDS)}
    outputs, steps = {}, [("select.all", {}), ("symbol.breakLink", {}), ("select.none", {})]

    def export(destination, board, **options):
        path = temp / f"{len(steps)}-{destination.name}"
        if destination.parent != temp:
            outputs[destination] = path
        steps.append(("document.export", {"path": str(path), "artboard": boards[board], **options}))
        return path

    paper, ink, heather = colours["Brand paper"], colours["Brand ink"], colours["Brand heather"]
    lockups = [export(EXPORTS / "lockup-small.svg", "LockupSmall", **SVG),
               export(EXPORTS / "lockup.svg", "Lockup", **SVG)]
    tab = export(temp / "favicon.svg", "Favicon16", **SVG)
    export(DESKTOP / "icon.svg", "Local", **SVG)
    # ICO frames: 16/32/48 are the pixel-grid drawing at 1x/2x/3x; 256 is the regular drawing on the rounded tile.
    frames = [export(temp / f"favicon-{size}.png", board, scale=scale)
              for size, board, scale in ((16, "Favicon16", 1), (32, "Favicon16", 2), (48, "Favicon16", 3),
                                         (256, "Tile", 8))]
    export(ICONS / "icon-192.png", "Icon", scale=192 / 512)
    export(ICONS / "icon-512.png", "Icon")
    export(DESKTOP / "icon.png", "Local")
    opaque = [export(APP / "apple-icon.png", "Maskable", scale=180 / 512, background=heather),
              export(ICONS / "maskable-192.png", "Maskable", scale=192 / 512, background=heather),
              export(ICONS / "maskable-512.png", "Maskable", background=heather),
              export(APP / "opengraph-image.png", "Social", background=paper),
              export(EXPORTS / "lockup.png", "LockupPlate", background=paper),
              export(EXPORTS / "lockup@2x.png", "LockupPlate", scale=2, background=paper)]
    # Dark variants: ink and paper swap, and the reader lifts to dark accent (4.31:1 on ink).
    steps += [("swatch.edit", {"name": "Brand ink", "color": paper}),
              ("swatch.edit", {"name": "Brand paper", "color": ink}),
              ("swatch.edit", {"name": "Brand heather", "color": colours["Brand dark accent"]})]
    export(EXPORTS / "lockup-small-dark.svg", "LockupSmall", **SVG)
    export(EXPORTS / "lockup-dark.svg", "Lockup", **SVG)
    opaque += [export(EXPORTS / "lockup-dark.png", "LockupPlate", background=ink),
               export(EXPORTS / "lockup-dark@2x.png", "LockupPlate", scale=2, background=ink)]
    vector(vc, MASTER, steps)

    # The inline encodings, the tab icon and the standalone marks are text edits of VectorCraft's SVG.
    bodies = []
    for path, name in zip(lockups, ("lockup-small-mono.svg", "lockup-mono.svg")):
        outputs[EXPORTS / name] = temp / name
        (temp / name).write_text(mono(path.read_text(), colours))
        bodies.append(re.search(r'viewBox="([^"]+)"[^>]*>(.*)</svg>', (temp / name).read_text(), re.S).groups())
    outputs[LOCKUP_TSX] = temp / LOCKUP_TSX.name
    outputs[LOCKUP_TSX].write_text(lockup_component(bodies))
    outputs[APP / "icon.svg"] = temp / "icon.svg"
    outputs[APP / "icon.svg"].write_text(favicon_svg(tab.read_text(), colours))
    for size, name in ((32, "mark.svg"), (16, "mark-small.svg")):
        outputs[EXPORTS / name] = temp / name
        (temp / name).write_text(marks[size][1])
    for destination, path in outputs.items():
        if destination.suffix in (".svg", ".tsx"):
            text = path.read_text()
            name = destination.name
            inline = destination.suffix == ".tsx" or "-mono" in name or name.startswith("mark")
            if "<text" in text or MACHINE_PATH.search(text) or (inline and ' id="' in text):
                raise SystemExit(f"{destination.name}: live <text>, a machine path or an id in an exported SVG")

    # The pinned VectorCraft writes opaque rasters without an alpha channel; the PNG header must show colour
    # type 0 or 2.
    for path in opaque:
        if path.read_bytes()[25] not in (0, 2):
            raise SystemExit(f"{path.name} has an alpha channel; an opaque export must not")
    icos = []
    for frame in frames:
        icos.append(frame.with_suffix(".ico"))
        run(pc, "convert", str(frame), str(icos[-1]))
    outputs[APP / "favicon.ico"] = temp / "favicon.ico"
    outputs[APP / "favicon.ico"].write_bytes(combine_ico(icos))
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="verify the exports without changing them")
    args = parser.parse_args()
    vc, pc = pinned_tools()
    document = native(MASTER)
    marks = component_marks()
    with tempfile.TemporaryDirectory(prefix="taxsorted-brand-") as folder:
        temp = Path(folder)
        check_sources(vc, document, marks, temp)
        outputs = render(vc, pc, document, marks, temp)
        stale = sorted(str(path.relative_to(PROJECT)) for path, rendered in outputs.items()
                       if not path.exists() or path.read_bytes() != rendered.read_bytes())
        if args.check:
            if stale:
                raise SystemExit("Brand exports need regeneration: " + ", ".join(stale))
            print(f"Sources check out and all {len(outputs)} exports match their bytes.")
        else:
            for path, rendered in outputs.items():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(rendered.read_bytes())
            print(f"Sources check out; wrote {len(outputs)} exports ({len(stale)} changed).")


if __name__ == "__main__":
    main()
