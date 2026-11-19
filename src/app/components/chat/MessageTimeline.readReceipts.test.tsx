import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { renderWithMockState } from "../../../test/renderWithMockState";
import { MessageTimeline } from "./MessageTimeline";

const basePreferences = {
  readReceipts: true,
  safetyCheckReminders: true,
  groupInvites: true,
  watermarkEnabled: false,
};

function renderTimeline(readReceipts: boolean) {
  return renderWithMockState(
    <MemoryRouter>
      <MessageTimeline targetId="chat_sarah" />
    </MemoryRouter>,
    { preferences: { ...basePreferences, readReceipts } },
  );
}

describe("MessageTimeline read receipts preference", () => {
  it("shows delivery state on outgoing messages when read receipts are on", () => {
    renderTimeline(true);
    expect(screen.getAllByText(/delivered|read|sent/i).length).toBeGreaterThan(0);
  });

  it("hides delivery state on outgoing messages when read receipts are off", () => {
    renderTimeline(false);
    expect(screen.queryByText(/^delivered$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^read$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^sent$/i)).not.toBeInTheDocument();
  });
});
