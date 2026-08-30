# Legacy import

Loads the old `brahmamu_vbss` mysqldump into the new schema.

```bash
cd backend
python manage.py migrate
python manage.py seed_reference           # required first
python manage.py import_legacy --dump ../brahmamu_vbss.sql.gz

# preview without writing:
python manage.py import_legacy --dry-run
python manage.py import_legacy --dry-run --limit 50
```

`--dump` defaults to `../brahmamu_vbss.sql.gz` (repo root).

## Modules

| File | Purpose |
|------|---------|
| `dump_parser.py` | Streams row dicts from the gzipped `.sql` (no MySQL server). Handles multi-statement extended INSERTs and MySQL backslash escaping. |
| `transforms.py` | Pure field cleaners: dates, `height1` feet.inches → cm, HTML stripping, sibling/contact/expectation table parsers, education derivation. |
| `../../apps/profiles/management/commands/import_legacy.py` | Orchestrates the load in one transaction. |

## Idempotency

Re-running updates rather than duplicates, matched on: `User.legacy_rid`,
`Profile.legacy_rid`, `PaymentTransaction.txnid`, `Interest.legacy_mid`,
`Subscription(profile, is_legacy=True)`, admin email.

## Known gaps (need the old production server, not in the dump)

- **Profile photos** — `photo1`/`photo2` are filenames only; ~1,657 image files
  must be copied from the old upload dir, then a follow-up command creates
  `ProfilePhoto` rows.
- **PayU production Key/Salt** — dump only carries the staging pair.
- **Education code table** — `Edu_code` lookup was never exported; `education` is
  derived from the `edu_qual` free text first, `Edu_code` only as fallback
  (see `reference/data.py` for the reconstructed levels).
- **~2,356 interest messages** reference profiles deleted years ago and are skipped.
- Legacy `contact_no` sometimes has two numbers (mother/father) with ambiguous
  labelling; the parser makes a best effort.
