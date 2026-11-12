import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PasswordInput } from "./password-input";

describe("<PasswordInput>", () => {
  it("hides the password until the eye button is pressed, then hides it again", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" />);
    const box = screen.getByLabelText("Password");
    await user.type(box, "Secret#123");
    expect(box).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(box).toHaveAttribute("type", "text");
    expect(box).toHaveValue("Secret#123");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(box).toHaveAttribute("type", "password");
  });

  it("the eye button doesn't submit the form", async () => {
    let submitted = false;
    render(
      <form onSubmit={(e) => { e.preventDefault(); submitted = true; }}>
        <PasswordInput aria-label="Password" />
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(submitted).toBe(false);
  });
});
