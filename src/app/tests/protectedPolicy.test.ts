import { describe, it, expect } from "vitest";
import { evaluateDirectMessagePolicy } from "../state/protectedPolicy";
import { MockNetwork } from "../data/mockNetworks";
import { NetworkProtectedSettings } from "../state/networkPrototypeSettings";

describe("Protected Communications Policy", () => {
  const mockNetworks: Record<string, MockNetwork> = {
    "net_1": {
      id: "net_1",
      name: "Youth Network",
      initials: "YN",
      color: "bg-blue-500",
      memberIds: ["youth1", "youth2", "supervisor1", "outsider1"],
      memberProtectedCategories: {
        "youth1": ["youth"],
        "youth2": ["youth"]
      },
      memberSupervisorRoles: {
        "supervisor1": ["supervisor"]
      }
    }
  };

  const getSettings = (mode: any): NetworkProtectedSettings => ({
    enabled: true,
    template: "youth",
    mode,
    protectedCategories: ["youth"],
    supervisorRoles: ["supervisor"],
    requireSecondPerson: true,
    convertUnsafe: false,
    blockUnsafe: false,
    showWarning: true,
    pauseIfSupervisorLeaves: true,
    showPolicyBadge: true,
    enableMetadataAudit: true,
  });

  it("allows messaging if neither person is protected", () => {
    const result = evaluateDirectMessagePolicy("outsider1", "outsider2", mockNetworks, () => getSettings("block"));
    expect(result.action).toBe("allow");
  });

  it("allows messaging if one person is protected but the other is a supervisor", () => {
    const result = evaluateDirectMessagePolicy("youth1", "supervisor1", mockNetworks, () => getSettings("block"));
    expect(result.action).toBe("allow");
    
    const result2 = evaluateDirectMessagePolicy("supervisor1", "youth1", mockNetworks, () => getSettings("block"));
    expect(result2.action).toBe("allow");
  });

  it("blocks messaging between two protected persons if policy is block", () => {
    const result = evaluateDirectMessagePolicy("youth1", "youth2", mockNetworks, () => getSettings("block"));
    expect(result.action).toBe("block");
    expect(result.reason).toContain("requires supervision");
  });

  it("warns messaging between protected person and regular member if policy is warning-only", () => {
    const result = evaluateDirectMessagePolicy("youth1", "outsider1", mockNetworks, () => getSettings("warning-only"));
    expect(result.action).toBe("warn");
  });

  it("converts messaging if policy is convert-to-supervised-thread", () => {
    const result = evaluateDirectMessagePolicy("youth1", "youth2", mockNetworks, () => getSettings("convert-to-supervised-thread"));
    expect(result.action).toBe("convert");
  });

  it("allows messaging if policy is off", () => {
    const result = evaluateDirectMessagePolicy("youth1", "youth2", mockNetworks, () => getSettings("off"));
    expect(result.action).toBe("allow");
  });
});
