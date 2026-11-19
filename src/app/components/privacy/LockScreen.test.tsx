import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithMockState } from "../../../test/renderWithMockState";
import { LockScreen } from "./LockScreen";

describe("LockScreen", () => {
  it("unlocks when the PIN is accepted", async () => {
    const unlockApp = vi.fn(() => true);
    const user = userEvent.setup();
    renderWithMockState(<LockScreen />, { unlockApp });

    await user.type(screen.getByLabelText("Local unlock PIN"), "1234");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    expect(unlockApp).toHaveBeenCalledWith("1234");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error and clears the field when the PIN is rejected", async () => {
    const unlockApp = vi.fn(() => false);
    const user = userEvent.setup();
    renderWithMockState(<LockScreen />, { unlockApp });

    const input = screen.getByLabelText("Local unlock PIN");
    await user.type(input, "0000");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    expect(unlockApp).toHaveBeenCalledWith("0000");
    expect(await screen.findByRole("alert")).toHaveTextContent("did not match");
    expect(input).toHaveValue("");
  });

  it("keeps its honest, non-encryption disclaimer visible", () => {
    renderWithMockState(<LockScreen />);
    expect(screen.getByText(/not encryption/i)).toBeInTheDocument();
  });
});
