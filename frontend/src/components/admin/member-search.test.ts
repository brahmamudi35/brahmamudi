import { describe, expect, it } from "vitest";

import {
  BLANK_FILTERS,
  buildMemberQuery,
  EDUCATION_OPTIONS,
  type MemberFilters,
} from "./member-search";

const params = (
  f: MemberFilters,
  opts: { limit: number; offset?: number } = { limit: 25 },
) => new URLSearchParams(buildMemberQuery(f, opts));

describe("buildMemberQuery", () => {
  it("always carries the preset, limit and offset", () => {
    const p = params(BLANK_FILTERS);
    expect(p.get("filter")).toBe("unverified");
    expect(p.get("limit")).toBe("25");
    expect(p.get("offset")).toBe("0");
  });

  it("passes the offset through", () => {
    const p = params(BLANK_FILTERS, { limit: 25, offset: 50 });
    expect(p.get("offset")).toBe("50");
  });

  it("trims and includes single-value filters, skips blank ones", () => {
    const p = params({
      ...BLANK_FILTERS,
      gender: "F",
      age_min: " 25 ",
      designation: "",
    });
    expect(p.get("gender")).toBe("F");
    expect(p.get("age_min")).toBe("25");
    expect(p.has("designation")).toBe(false);
  });

  it("repeats multi-value filters as separate params", () => {
    const p = params({
      ...BLANK_FILTERS,
      subcaste: ["goldsmith", "carpenter"],
      region: ["telangana"],
    });
    expect(p.getAll("subcaste")).toEqual(["goldsmith", "carpenter"]);
    expect(p.getAll("region")).toEqual(["telangana"]);
  });

  it("includes a non-empty trimmed search term", () => {
    expect(params({ ...BLANK_FILTERS, search: "  Meena  " }).get("search")).toBe(
      "Meena",
    );
    expect(params({ ...BLANK_FILTERS, search: "   " }).has("search")).toBe(false);
  });
});

describe("EDUCATION_OPTIONS", () => {
  it("covers the nine backend qualification groups", () => {
    expect(EDUCATION_OPTIONS.map((o) => o.value)).toEqual([
      "group1",
      "doctor",
      "masters",
      "bachelors",
      "abroad",
      "ca_icwai",
      "pg_mcom",
      "graduate",
      "remarriage",
      "other",
    ]);
  });
});
