#!/usr/bin/env python3
"""Bundles all curated JSON data into a single JS file (data-bundle.js).

This guarantees the "Kesfet" (Explore) section works inside the packaged
Android APK even under file:// protocol, where fetch() of local JSON may fail.
"""
import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
OUT_PATH = os.path.join(os.path.dirname(__file__), "data-bundle.js")

def main():
    bundle = {}
    for fname in sorted(os.listdir(DATA_DIR)):
        if not fname.endswith(".json"):
            continue
        with open(os.path.join(DATA_DIR, fname), "r", encoding="utf-8") as f:
            bundle[fname] = json.load(f)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("/* Auto-generated curated data bundle. Do not edit by hand. */\n")
        f.write("window.CURATED_DATA = ")
        json.dump(bundle, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    print("Wrote {} with {} files".format(OUT_PATH, len(bundle)))

if __name__ == "__main__":
    main()
