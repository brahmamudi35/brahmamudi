"""Field-level cleaners for the legacy import. Pure functions, no Django models."""

from __future__ import annotations

import base64
import binascii
import datetime as dt
import html
import re

# --- generic ---------------------------------------------------------------

_WS = re.compile(r"\s+")
_TAG = re.compile(r"<[^>]+>")


def clean(value: str | None) -> str:
    if not value:
        return ""
    return _WS.sub(" ", value).strip()


def strip_html(value: str | None) -> str:
    if not value:
        return ""
    text = _TAG.sub(" ", value)
    text = html.unescape(text)
    return _WS.sub(" ", text).strip()


def parse_date(value: str | None) -> dt.date | None:
    value = (value or "").strip()
    if not value or value.startswith("0000"):
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return dt.datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def parse_bool(value: str | None) -> bool | None:
    v = (value or "").strip().lower()
    if v in {"yes", "y", "true", "1"}:
        return True
    if v in {"no", "n", "false", "0"}:
        return False
    return None


def height_to_cm(value: str | None) -> int | None:
    """Legacy `height1` is feet.inches text: '5.11' = 5ft 11in, '6' = 6ft."""
    v = (value or "").strip()
    if not v:
        return None
    m = re.match(r"^(\d)(?:[.'\s]+(\d{1,2}))?", v)
    if not m:
        return None
    feet = int(m.group(1))
    inches = int(m.group(2)) if m.group(2) else 0
    if inches > 11 or feet > 7:
        return None
    # A handful of legacy rows have height1='4' with no real data anywhere
    # else (height double is always 0.0) - an implausible 4'0" for an adult,
    # not a real short stature. Below ~4'6" treat it as unset.
    if feet < 4 or (feet == 4 and inches < 6):
        return None
    return round((feet * 12 + inches) * 2.54)


def decode_legacy_password(value: str | None) -> str | None:
    """Legacy `passwd` is base64 of the plaintext (e.g. 'eWFzaDU1NDE=' -> 'yash5541')."""
    v = (value or "").strip()
    if not v:
        return None
    try:
        raw = base64.b64decode(v, validate=True)
        text = raw.decode("utf-8")
    except (binascii.Error, ValueError, UnicodeDecodeError):
        return None
    if not text or not text.isprintable():
        return None
    return text


def split_name(username: str | None) -> tuple[str, str]:
    """Legacy `username` crams name + qualifications: 'Sanju    M.Tech'."""
    raw = (username or "").strip()
    if not raw:
        return "", ""
    parts = re.split(r"\s{2,}|\s*,\s*", raw, maxsplit=1)
    name = parts[0].strip()
    extra = parts[1].strip() if len(parts) > 1 else ""
    # a lone trailing token like "B.Tech" with a single space
    if not extra and " " in name:
        head, tail = name.rsplit(" ", 1)
        if re.search(r"[.\d]", tail) or tail.isupper():
            name, extra = head.strip(), tail.strip()
    return name, extra


def clean_surname(value: str | None) -> str:
    s = clean(value)
    # drop trailing status markers the old site appended
    s = re.sub(r"\b(DIV|Div|Divorce[d]?|WD|Widow[ed]*|USA|oltr)\b.*$", "", s).strip()
    return s.strip(" -,")


# --- normalisers ----------------------------------------------------------

def normalize_mtongue(value: str | None) -> str:
    v = clean(value).lower()
    if not v or "@" in v:
        return "Telugu"
    if v.startswith(("telugu", "telegu", "tlugu", "teluguii")):
        return "Telugu"
    return clean(value).title()


def normalize_citizenship(value: str | None) -> str:
    v = clean(value).lower()
    if v in {"india", "indian", ""}:
        return "Indian" if v else ""
    return clean(value)


# --- HTML table parsers -------------------------------------------------------

def parse_siblings(html_blob: str | None) -> list[dict]:
    """Legacy `family_bg` holds a Brothers/Sisters table.

    Layout: a header row names the group ("Brothers(Edu. Qual.)" | "Marital Status"),
    then data rows of two cells: education/name, marital status.
    """
    if not html_blob:
        return []
    out: list[dict] = []
    current = None
    for row_html in re.findall(r"<tr[^>]*>(.*?)</tr>", html_blob, re.I | re.S):
        cells = [strip_html(c) for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", row_html, re.I | re.S)]
        joined = " ".join(cells).lower()
        if "brother" in joined:
            current = "brother"
            continue
        if "sister" in joined:
            current = "sister"
            continue
        if current is None:
            continue
        detail = cells[0].strip() if cells else ""
        marital = cells[1].strip() if len(cells) > 1 else ""
        if not detail and not marital:
            continue
        out.append({"relation": current, "detail": detail, "marital_status": marital})
    return out


def derive_education(edu_qual: str | None, name_map: dict):
    """Pick an EducationLevel from the legacy free-text `edu_qual`.

    `name_map` maps a normalised level name -> EducationLevel. Returns an object
    or None; the caller falls back to Edu_code.
    """
    text = strip_html(edu_qual)
    if not text:
        return None
    norm = re.sub(r"\s*/\s*", " / ", text).strip().lower()
    norm = _WS.sub(" ", norm)
    if norm in name_map:
        return name_map[norm]
    low = text.lower()
    if any(w in low for w in ("phd", "ph.d", "doctor", "post doc")):
        return name_map.get("__doctorate__")
    if any(w in low for w in ("master", "m.tech", "mtech", "m.s", "msc", "mba", "m.b.a",
                              "m.a", "m.com", "pg ", "md ", "m.d", "ms ", "mds", "pg diploma")):
        return name_map.get("__masters__")
    if any(w in low for w in ("bachelor", "b.tech", "btech", "b.e", "b.sc", "bsc", "b.com",
                              "b.a", "degree", "graduat", "bds", "mbbs", "bams", "bhms",
                              "b.pharm", "bpharm", "ca ", "c.a", "llb", "l.l.b")):
        return name_map.get("__bachelors__")
    if "diploma" in low:
        return name_map.get("__diploma__")
    if any(w in low for w in ("school", "ssc", "intermediate", "10th", "12th")):
        return name_map.get("__school__")
    return None


def parse_contact(html_blob: str | None) -> dict:
    """Legacy `contact_no` holds a Landline/Mobile/Parent Mobile table."""
    result = {"mobile": "", "parent_mobile": "", "landline": ""}
    if not html_blob:
        return result
    text = strip_html(html_blob)
    nums = re.findall(r"\+?\d[\d\s-]{7,}\d", text)
    nums = [_WS.sub("", n) for n in nums]
    low = text.lower()
    for n in nums:
        idx = text.find(n)
        window = low[max(0, idx - 20): idx + len(n) + 20]
        if "parent" in window or "father" in window or "mother" in window:
            result["parent_mobile"] = result["parent_mobile"] or n
        elif "landline" in window:
            result["landline"] = result["landline"] or n
        else:
            result["mobile"] = result["mobile"] or n
    if not result["mobile"] and nums:
        result["mobile"] = nums[0]
    return result


_AGE_RE = re.compile(r"between\s+(\d{1,2})\s+and\s+(\d{1,2})", re.I)
_HGT_RE = re.compile(
    r"(\d)\s*feet\s*(\d{1,2})?\s*inch(?:es)?\s*and\s*(\d)\s*feet\s*(\d{1,2})?", re.I
)


def parse_expectations(html_blob: str | None) -> dict:
    """Legacy `exp_qualities` holds an Age/Height/Edu. Qual. table."""
    pref: dict = {"legacy_raw": html_blob or ""}
    if not html_blob:
        return pref
    text = strip_html(html_blob)

    m = _AGE_RE.search(text)
    if m:
        pref["age_min"], pref["age_max"] = int(m.group(1)), int(m.group(2))

    m = _HGT_RE.search(text)
    if m:
        f1, i1, f2, i2 = m.group(1), m.group(2) or 0, m.group(3), m.group(4) or 0
        pref["height_min_cm"] = round((int(f1) * 12 + int(i1)) * 2.54)
        pref["height_max_cm"] = round((int(f2) * 12 + int(i2)) * 2.54)

    edu_match = re.search(r"Edu\. Qual\.:?\s*(.+)$", text, re.I)
    if edu_match:
        pref["notes"] = "Preferred education: " + edu_match.group(1).strip()
    return pref
