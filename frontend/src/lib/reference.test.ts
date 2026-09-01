import { describe, expect, it } from "vitest";

import { toChoices } from "./reference";

describe("toChoices", () => {
  it("maps {id,name} rows to {value,label}", () => {
    expect(
      toChoices([
        { id: 1, name: "Ashwini" },
        { id: 2, name: "Bharani" },
      ]),
    ).toEqual([
      { value: 1, label: "Ashwini" },
      { value: 2, label: "Bharani" },
    ]);
  });

  it("returns an empty array for no rows", () => {
    expect(toChoices([])).toEqual([]);
  });
});
