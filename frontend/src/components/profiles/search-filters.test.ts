import { describe, expect, it } from "vitest";

import {
  EMPTY_FILTERS,
  filtersToObject,
  filtersToQuery,
  objectToFilters,
  type Filters,
} from "./search-filters";

const withValues = (o: Partial<Filters>): Filters => ({ ...EMPTY_FILTERS, ...o });

describe("filtersToQuery", () => {
  it("renames q -> search and drops empty values", () => {
    const p = filtersToQuery(withValues({ q: "doctor", age_min: "25", age_max: "" }));
    expect(p.get("search")).toBe("doctor");
    expect(p.get("age_min")).toBe("25");
    expect(p.has("age_max")).toBe(false);
  });

  it("appends each multi-value entry", () => {
    const p = filtersToQuery(withValues({ subcaste: ["goldsmith", "shilpi"] }));
    expect(p.getAll("subcaste")).toEqual(["goldsmith", "shilpi"]);
  });

  it("always includes the default ordering", () => {
    expect(filtersToQuery(EMPTY_FILTERS).get("ordering")).toBe("-created_at");
  });
});

describe("filtersToObject / objectToFilters", () => {
  it("keeps only set fields and omits ordering", () => {
    const o = filtersToObject(
      withValues({ q: "meena", region: ["telangana"], gothram: "" }),
    );
    expect(o).toEqual({ search: "meena", region: ["telangana"] });
    expect("ordering" in o).toBe(false);
  });

  it("round-trips a saved search back into full Filters", () => {
    const original = withValues({
      q: "engineer",
      age_min: "27",
      subcaste: ["carpenter"],
      marital_status: ["unmarried"],
    });
    const restored = objectToFilters(filtersToObject(original));
    expect(restored).toEqual(original);
  });

  it("accepts a scalar where an array is expected", () => {
    expect(objectToFilters({ subcaste: "goldsmith" }).subcaste).toEqual([
      "goldsmith",
    ]);
  });
});
