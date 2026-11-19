import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { renderWithMockState } from "../../../test/renderWithMockState";
import { buildTrustRecord } from "../../state/trust";
import { mockUsers } from "../../data/mockUsers";
import { TrustReviewModal } from "./TrustReviewModal";

const sarah = mockUsers.user_sarah;

function renderModal(overrides = {}, props = {}) {
  return renderWithMockState(
    <MemoryRouter>
      <TrustReviewModal user={sarah} open onClose={() => undefined} {...props} />
    </MemoryRouter>,
    overrides,
  );
}

describe("TrustReviewModal", () => {
  it("opens with honest prototype wording and no crypto claims", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: /review trust for sarah/i })).toBeInTheDocument();
    expect(screen.getByText(/local prototype label/i)).toBeInTheDocument();
    expect(screen.getAllByText(/not cryptographic identity verification/i).length).toBeGreaterThan(0);
    // Planned levels are visible but disabled.
    expect(screen.getByText(/organization verified \(planned\)/i)).toBeInTheDocument();
    expect(screen.getByText(/device verified \(planned\)/i)).toBeInTheDocument();
  });

  it("saves a chosen trust level with reason and note", () => {
    const setTrustLevel = vi.fn();
    const onClose = vi.fn();
    renderModal({ setTrustLevel }, { onClose });

    fireEvent.click(screen.getByRole("radio", { name: /verified in person/i }));
    fireEvent.change(screen.getByLabelText(/why do you trust/i), { target: { value: "met at school" } });
    fireEvent.change(screen.getByLabelText(/private note/i), { target: { value: "June meetup" } });
    fireEvent.click(screen.getByRole("button", { name: /save trust level/i }));

    expect(setTrustLevel).toHaveBeenCalledWith(sarah.id, "verified-in-person", {
      reason: "met at school",
      note: "June meetup",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("requires confirmation before removing a trusted contact", () => {
    const removeTrustedContact = vi.fn();
    renderModal({
      removeTrustedContact,
      trustedContacts: { [sarah.id]: buildTrustRecord(sarah.id, "trusted", "user_me") },
    });

    fireEvent.click(screen.getByRole("button", { name: /remove trusted contact/i }));
    expect(removeTrustedContact).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /yes, remove/i }));
    expect(removeTrustedContact).toHaveBeenCalledWith(sarah.id);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    renderModal({}, { onClose });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
