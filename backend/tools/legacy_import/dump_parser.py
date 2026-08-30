"""Minimal reader for the legacy ``brahmamu_vbss`` mysqldump.

Yields row dicts per table straight from the gzipped .sql file - no MySQL server
needed. Handles multi-statement extended INSERTs and MySQL backslash escaping.
"""

from __future__ import annotations

import gzip
import re
from pathlib import Path
from typing import Iterator

_INSERT_RE = re.compile(
    r"INSERT INTO `(?P<table>\w+)` \((?P<cols>[^)]*)\) VALUES ",
    re.IGNORECASE,
)

_UNESCAPE = {
    "0": "\0", "b": "\b", "n": "\n", "r": "\r", "t": "\t",
    "Z": "\x1a", "\\": "\\", "'": "'", '"': '"',
}


def _split_columns(raw: str) -> list[str]:
    return [c.strip().strip("`") for c in raw.split(",")]


def _parse_values(text: str, start: int) -> tuple[list[list], int]:
    """Parse ``(v,v,...),(v,v,...);`` beginning at ``text[start]``.

    Returns (rows, index just past the terminating ';').
    """
    rows: list[list] = []
    i = start
    n = len(text)
    while i < n:
        # skip whitespace / commas between tuples
        while i < n and text[i] in " \t\r\n,":
            i += 1
        if i < n and text[i] == ";":
            return rows, i + 1
        if i >= n or text[i] != "(":
            raise ValueError(f"expected '(' at offset {i}: {text[i:i+40]!r}")
        i += 1  # consume '('
        row: list = []
        while True:
            while i < n and text[i] in " \t\r\n":
                i += 1
            ch = text[i]
            if ch == "'":
                i += 1
                buf = []
                while i < n:
                    c = text[i]
                    if c == "\\" and i + 1 < n:
                        buf.append(_UNESCAPE.get(text[i + 1], text[i + 1]))
                        i += 2
                        continue
                    if c == "'":
                        if i + 1 < n and text[i + 1] == "'":  # '' -> literal '
                            buf.append("'")
                            i += 2
                            continue
                        i += 1
                        break
                    buf.append(c)
                    i += 1
                row.append("".join(buf))
            else:  # unquoted token: number, NULL, etc.
                j = i
                while j < n and text[j] not in ",)":
                    j += 1
                token = text[i:j].strip()
                row.append(None if token.upper() == "NULL" else token)
                i = j
            while i < n and text[i] in " \t\r\n":
                i += 1
            if text[i] == ",":
                i += 1
                continue
            if text[i] == ")":
                i += 1
                break
            raise ValueError(f"unexpected {text[i]!r} at {i}")
        rows.append(row)
    raise ValueError("unterminated VALUES list")


def iter_rows(dump_path: str | Path, table: str) -> Iterator[dict]:
    """Yield each row of ``table`` as a dict keyed by column name."""
    path = Path(dump_path)
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8", errors="replace") as fh:
        sql = fh.read()

    for m in _INSERT_RE.finditer(sql):
        if m.group("table").lower() != table.lower():
            continue
        cols = _split_columns(m.group("cols"))
        rows, _ = _parse_values(sql, m.end())
        for row in rows:
            yield dict(zip(cols, row))


def count_rows(dump_path: str | Path, table: str) -> int:
    return sum(1 for _ in iter_rows(dump_path, table))
