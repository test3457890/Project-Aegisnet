import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithMockState } from "../../../test/renderWithMockState";
import { mockUsers } from "../../data/mockUsers";
import { AvatarLightbox } from "./AvatarLightbox";

const sarah = mockUsers.user_sarah;

describe("AvatarLightbox", () => {
  it("opens a larger preview on click and falls back to initials", () => {
    renderWithMockState(
      <AvatarLightbox user={sarah}><span>avatar</span></AvatarLightbox>,
    );
    fireEvent.click(screen.getByRole("button", { name: /view larger profile photo for sarah/i }));
    expect(screen.getByRole("dialog", { name: /profile photo for sarah/i })).toBeInTheDocument();
    // No uploaded photo → large initials block with alt-style label.
    expect(screen.getByLabelText(/no photo set for sarah/i)).toHaveTextContent(sarah.initials);
  });

  it("closes with Escape and with the close button", () => {
    renderWithMockState(
      <AvatarLightbox user={sarah}><span>avatar</span></AvatarLightbox>,
    );
    fireEvent.click(screen.getByRole("button", { name: /view larger profile photo/i }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /view larger profile photo/i }));
    fireEvent.click(screen.getByRole("button", { name: /close photo preview/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("masks the photo behind tap-to-reveal in Lockdown Mode", () => {
    renderWithMockState(
      <AvatarLightbox user={{ ...sarah, profilePictureUrl: "data:image/webp;base64,Zm9v" }}><span>avatar</span></AvatarLightbox>,
      { privacyMode: "lockdown" },
    );
    fireEvent.click(screen.getByRole("button", { name: /view larger profile photo/i }));
    expect(screen.getByText(/tap to reveal photo/i)).toBeInTheDocument();
    expect(screen.queryByAltText(/profile photo of sarah/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/tap to reveal photo/i));
    expect(screen.getByAltText(/profile photo of sarah/i)).toBeInTheDocument();
  });
});
