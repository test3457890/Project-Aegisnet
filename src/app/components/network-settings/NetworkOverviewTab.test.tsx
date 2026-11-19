import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { renderWithMockState } from "../../../test/renderWithMockState";
import { NetworkOverviewTab } from "./NetworkOverviewTab";
import { MockNetwork } from "../../data/mockNetworks";

const mockNetwork: MockNetwork = {
  id: "net_123",
  name: "Alpha Network",
  initials: "AN",
  color: "bg-blue-500",
  ownerId: "user_me",
  memberIds: ["user_me", "user_other"],
  categories: [],
  roles: [],
  invites: [],
  safety: { invites: "owner", joinApproval: "open" }
};

describe("NetworkOverviewTab", () => {
  it("renders network info and danger zone for owners", async () => {
    renderWithMockState(
      <MemoryRouter>
        <NetworkOverviewTab network={mockNetwork} isOwner={true} />
      </MemoryRouter>
    );
    
    expect(screen.getByText("Alpha Network")).toBeInTheDocument();
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    
    // Archive button
    expect(screen.getByRole("button", { name: "Archive Network" })).toBeInTheDocument();
    // Delete button
    expect(screen.getByRole("button", { name: "Delete Network" })).toBeInTheDocument();
  });

  it("does not show owner actions for non-owners", () => {
    renderWithMockState(
      <MemoryRouter>
        <NetworkOverviewTab network={{...mockNetwork, ownerId: "user_other"}} isOwner={false} />
      </MemoryRouter>
    );
    
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive Network" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Network" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave Network" })).toBeInTheDocument();
  });

  it("requires typing the network name to confirm delete", async () => {
    const user = userEvent.setup();
    renderWithMockState(
      <MemoryRouter>
        <NetworkOverviewTab network={mockNetwork} isOwner={true} />
      </MemoryRouter>
    );
    
    await user.click(screen.getByRole("button", { name: "Delete Network" }));
    
    const confirmButton = screen.getByRole("button", { name: "Confirm Delete" });
    expect(confirmButton).toBeDisabled();
    
    const input = screen.getByPlaceholderText("Alpha Network");
    await user.type(input, "Alpha Network");
    
    expect(confirmButton).not.toBeDisabled();
  });
});
