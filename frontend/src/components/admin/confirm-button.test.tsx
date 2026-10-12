import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmButton } from "./confirm-button";

function setup(onConfirm = vi.fn()) {
  render(
    <ConfirmButton title="Suspend this member?" confirmLabel="Suspend" onConfirm={onConfirm}>
      Suspend
    </ConfirmButton>,
  );
  return onConfirm;
}

describe("<ConfirmButton>", () => {
  it("does nothing until the dialog is confirmed", async () => {
    const onConfirm = setup();
    await userEvent.click(screen.getByRole("button", { name: "Suspend" }));
    expect(await screen.findByText("Suspend this member?")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByText("Suspend this member?")).not.toBeInTheDocument());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("runs the action on confirm and closes", async () => {
    const onConfirm = setup(vi.fn().mockResolvedValue(undefined));
    await userEvent.click(screen.getByRole("button", { name: "Suspend" }));
    const dialog = await screen.findByRole("alertdialog");
    const confirm = Array.from(dialog.querySelectorAll("button")).find(
      (b) => b.textContent === "Suspend",
    )!;
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
});
