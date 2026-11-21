#!/usr/bin/env python3
"""Raster helper for the Velvet Hour screenshot renderer.

The app's render core is pure JavaScript canvas code. In the browser the
platform decodes JPEG photos, rasterises text and encodes images; under
Node this small helper plays that platform role (decode / text mask /
measure / encode) while every drawing decision stays in the app's code.

Modes:
  decode  <in.jpg> <out.raw>                       -> prints "W H"
  encode  <in.raw> <w> <h> <out.jpg> <quality>
  textmask <font> <size> <stroke> <fill|stroke> <text> <out.raw>
                                                   -> prints "W H LEFT TOP"
  measure <font> <size> <text>                     -> prints width
  metrics <font> <size>                            -> prints "ASCENT DESCENT"
"""
import json
import sys

from PIL import Image, ImageDraw, ImageFont


def main():
    mode = sys.argv[1]
    if mode == "decode":
        im = Image.open(sys.argv[2]).convert("RGBA")
        with open(sys.argv[3], "wb") as fh:
            fh.write(im.tobytes())
        print(im.width, im.height)
        return
    if mode == "encode":
        w, h = int(sys.argv[3]), int(sys.argv[4])
        with open(sys.argv[2], "rb") as fh:
            data = fh.read()
        im = Image.frombytes("RGBA", (w, h), data).convert("RGB")
        im.save(sys.argv[5], format="JPEG", quality=int(sys.argv[6]),
                subsampling=1, optimize=True)
        return
    if mode == "textmask":
        font = ImageFont.truetype(sys.argv[2], int(sys.argv[3]))
        stroke = int(sys.argv[4])
        kind = sys.argv[5]
        text = sys.argv[6]
        out = sys.argv[7]
        pad = stroke + 6
        probe = ImageDraw.Draw(Image.new("L", (8, 8)))
        bbox = probe.textbbox((0, 0), text, font=font, stroke_width=stroke)
        w = max(1, bbox[2] - bbox[0] + pad * 2)
        h = max(1, bbox[3] - bbox[1] + pad * 2)
        ox, oy = pad - bbox[0], pad - bbox[1]
        if kind == "fill":
            mask = Image.new("L", (w, h), 0)
            d = ImageDraw.Draw(mask)
            d.text((ox, oy), text, font=font, fill=255)
        else:
            both = Image.new("L", (w, h), 0)
            d = ImageDraw.Draw(both)
            d.text((ox, oy), text, font=font, fill=255, stroke_width=stroke,
                   stroke_fill=255)
            inner = Image.new("L", (w, h), 0)
            d2 = ImageDraw.Draw(inner)
            d2.text((ox, oy), text, font=font, fill=255)
            mask = Image.new("L", (w, h), 0)
            bp, ip, mp = both.load(), inner.load(), mask.load()
            for yy in range(h):
                for xx in range(w):
                    v = bp[xx, yy] - ip[xx, yy]
                    mp[xx, yy] = 0 if v < 0 else v
        with open(out, "wb") as fh:
            fh.write(mask.tobytes())
        ascent, descent = font.getmetrics()
        print(w, h, bbox[0], bbox[1], ascent, descent, pad)
        return
    if mode == "measure":
        font = ImageFont.truetype(sys.argv[2], int(sys.argv[3]))
        d = ImageDraw.Draw(Image.new("L", (8, 8)))
        print(d.textlength(sys.argv[4], font=font))
        return
    if mode == "metrics":
        font = ImageFont.truetype(sys.argv[2], int(sys.argv[3]))
        ascent, descent = font.getmetrics()
        print(ascent, descent)
        return
    raise SystemExit("unknown mode " + mode)


if __name__ == "__main__":
    main()
