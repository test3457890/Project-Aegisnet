import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MockAppStateProvider } from "./MockAppStateContext";
import { useMockAppState } from "./mockAppState";
import React from "react";

describe("MockAppStateContext (Member Lifecycle & Roles)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MockAppStateProvider>{children}</MockAppStateProvider>
  );

  it("handles role requests", async () => {
    const { result } = renderHook(() => useMockAppState(), { wrapper });

    // Wait for the provider to initialize networks
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const netId = "net_family"; // default network
    expect(result.current.networks[netId]).toBeDefined();

    act(() => {
      result.current.createNetworkRole(netId, "Parent", "bg-red-500", ["manage_rooms"]);
    });

    act(() => {
      result.current.requestRole(netId, "Parent", "Need admin access");
    });

    let network = result.current.networks[netId];
    expect(network.roleRequests).toBeDefined();
    expect(network.roleRequests!.length).toBeGreaterThan(0);
    expect(network.roleRequests![0].status).toBe("pending");
    expect(network.roleRequests![0].roleName).toBe("Parent");
    
    const reqId = network.roleRequests![0].id;

    act(() => {
      result.current.approveRoleRequest(netId, reqId);
    });

    network = result.current.networks[netId];
    expect(network.roleRequests![0].status).toBe("approved");

    // The role should have been granted to the user if it exists in the network
    const userRoles = network.memberRoles?.[result.current.me.id];
    expect(userRoles).toBeDefined();
  });

  it("handles role rejection", async () => {
    const { result } = renderHook(() => useMockAppState(), { wrapper });
    
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const netId = "net_family";

    act(() => {
      result.current.requestRole(netId, "Kid", "I am a kid");
    });

    let network = result.current.networks[netId];
    const reqId = network.roleRequests![network.roleRequests!.length - 1].id;

    act(() => {
      result.current.rejectRoleRequest(netId, reqId);
    });

    network = result.current.networks[netId];
    const updatedReq = network.roleRequests!.find(r => r.id === reqId);
    expect(updatedReq!.status).toBe("rejected");
  });

  it("handles lifecycle updates", async () => {
    const { result } = renderHook(() => useMockAppState(), { wrapper });
    
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const netId = "net_family";
    const targetUserId = "user_sarah";

    act(() => {
      result.current.updateMemberLifecycle(netId, targetUserId, "suspended");
    });

    const network = result.current.networks[netId];
    expect(network.memberLifecycle?.[targetUserId]).toBe("suspended");
  });

  it("handles welcome and rules acknowledgment", async () => {
    const { result } = renderHook(() => useMockAppState(), { wrapper });
    
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const netId = "net_family";
    const myId = result.current.me.id;

    act(() => {
      result.current.acknowledgeWelcome(netId);
      result.current.acknowledgeRules(netId);
    });

    const network = result.current.networks[netId];
    expect(network.welcomeAcknowledged?.[myId]).toBe(true);
    expect(network.rulesAcknowledged?.[myId]).toBe(true);
  });

  it("handles admin notes updates", async () => {
    const { result } = renderHook(() => useMockAppState(), { wrapper });
    
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const netId = "net_family";
    const targetUserId = "user_sarah";
    const myNote = "This is a prototype note.";

    act(() => {
      result.current.updateAdminNote(netId, targetUserId, myNote);
    });

    let network = result.current.networks[netId];
    expect(network.adminNotes?.[targetUserId]).toBe(myNote);

    // Clear note
    act(() => {
      result.current.updateAdminNote(netId, targetUserId, "");
    });

    network = result.current.networks[netId];
    expect(network.adminNotes?.[targetUserId]).toBe("");
  });
});
