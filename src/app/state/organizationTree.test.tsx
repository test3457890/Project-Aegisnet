import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MockAppStateProvider } from "./MockAppStateContext";
import { useMockAppState } from "./mockAppState";
import { sanitizeQaEvent, clearQaEvents, getQaEvents, QaEventType } from "../qa/qaEvents";
import { currentUser } from "../data/mockUsers";
import React from "react";

vi.mock("../api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("../api/client")>();
  return {
    ...original,
    apiClient: { ...original.apiClient, get: vi.fn().mockRejectedValue(new Error("Offline test")), post: vi.fn().mockResolvedValue({}) },
  };
});

describe("Organization Tree State", () => {
  beforeEach(() => {
    localStorage.clear();
    clearQaEvents();
  });

  afterEach(() => {
    localStorage.clear();
    clearQaEvents();
  });

  it("should aggressively drop description and responsibilities in sanitizeQaEvent", () => {
    const rawEvent = {
      type: "org_tree.node.created" as QaEventType,
      networkId: "net_123",
      nodeId: "node_123",
      description: "Secret base location",
      responsibilities: "Launch codes",
      reason: "test",
    };
    
    const sanitized = sanitizeQaEvent(rawEvent);
    
    expect((sanitized as any).description).toBeUndefined();
    expect((sanitized as any).responsibilities).toBeUndefined();
    expect(sanitized.networkId).toBe("net_123");
    expect(sanitized.nodeId).toBe("node_123");
    expect(sanitized.type).toBe("org_tree.node.created");
  });

  it("should create, update, and delete org nodes", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MockAppStateProvider>{children}</MockAppStateProvider>
    );

    const { result } = renderHook(() => useMockAppState(), { wrapper });

    // Ensure a network exists
    let networkId: string;
    act(() => {
      const res = result.current.createNetwork("Test Org Network");
      networkId = res.networkId;
    });

    let rootNodeId: string;
    let childNodeId: string;

    act(() => {
      rootNodeId = result.current.createOrgNode(networkId, {
        name: "Commander",
        type: "network_command",
        description: "Should not be in QA event",
      });
    });

    expect(result.current.networks[networkId].orgNodes).toHaveLength(1);
    expect(result.current.networks[networkId].orgNodes?.[0].name).toBe("Commander");
    
    const qaEvents = getQaEvents();
    const createEvent = qaEvents.find(e => e.type === "org_tree.node.created" && e.nodeId === rootNodeId);
    expect(createEvent).toBeDefined();

    act(() => {
      childNodeId = result.current.createOrgNode(networkId, {
        name: "Deputy",
        type: "department",
        parentId: rootNodeId,
      });
    });

    expect(result.current.networks[networkId].orgNodes).toHaveLength(2);

    // Test prevent circular references
    act(() => {
      result.current.updateOrgNode(networkId, rootNodeId, { parentId: rootNodeId });
    });

    // Parent should not have changed
    expect(result.current.networks[networkId].orgNodes?.find(n => n.id === rootNodeId)?.parentId).toBeUndefined();

    // Prevent making a node a child of its descendant
    act(() => {
      result.current.updateOrgNode(networkId, rootNodeId, { parentId: childNodeId });
    });

    expect(result.current.networks[networkId].orgNodes?.find(n => n.id === rootNodeId)?.parentId).toBeUndefined();

    // Assign member
    act(() => {
      result.current.assignMemberToOrgNode(networkId, rootNodeId, currentUser.id);
    });

    expect(result.current.networks[networkId].orgNodes?.find(n => n.id === rootNodeId)?.assignedMemberId).toBe(currentUser.id);

    // Delete parent node, check if child shifts to root
    act(() => {
      result.current.deleteOrgNode(networkId, rootNodeId);
    });

    const nodesAfterDelete = result.current.networks[networkId].orgNodes;
    expect(nodesAfterDelete).toHaveLength(1);
    expect(nodesAfterDelete?.[0].id).toBe(childNodeId);
    expect(nodesAfterDelete?.[0].parentId).toBeUndefined(); // Shifted to root
  });
});
