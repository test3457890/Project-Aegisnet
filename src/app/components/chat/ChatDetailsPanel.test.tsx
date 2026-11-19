import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithMockState } from "../../../test/renderWithMockState";
import { ChatDetailsPanel } from "./ChatDetailsPanel";

const baseProps = {
  title: "Sarah Connor",
  subtitle: "Private prototype session",
  members: [],
  targetId: "chat_sarah",
};

describe("ChatDetailsPanel disappearing-messages control", () => {
  it("reads the per-conversation override when one is set", () => {
    renderWithMockState(<ChatDetailsPanel {...baseProps} />, {
      conversationExpiry: { chat_sarah: 86_400 },
      disappearDefaultSeconds: 0,
    });

    expect(screen.getByRole("combobox", { name: "Disappearing Messages" })).toHaveValue("86400");
  });

  it("falls back to the default lifetime when there is no override", () => {
    renderWithMockState(<ChatDetailsPanel {...baseProps} />, {
      conversationExpiry: {},
      disappearDefaultSeconds: 3_600,
    });

    expect(screen.getByRole("combobox", { name: "Disappearing Messages" })).toHaveValue("3600");
  });

  it("sets the per-conversation expiry on change", async () => {
    const setConversationExpiry = vi.fn();
    const user = userEvent.setup();
    renderWithMockState(<ChatDetailsPanel {...baseProps} />, { setConversationExpiry });

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Disappearing Messages" }),
      "604800",
    );

    expect(setConversationExpiry).toHaveBeenCalledWith("chat_sarah", 604_800);
  });

  it("keeps the wording local-only and avoids implying encryption", () => {
    renderWithMockState(<ChatDetailsPanel {...baseProps} />);

    expect(screen.getByText(/this device only/i)).toBeInTheDocument();
    expect(screen.getByText(/not encryption/i)).toBeInTheDocument();
  });
});
