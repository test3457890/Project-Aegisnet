import { MockNetwork } from "../data/mockNetworks";
import { NetworkProtectedSettings } from "./networkPrototypeSettings";

export type PolicyAction = "allow" | "warn" | "convert" | "block";

export interface PolicyResult {
  action: PolicyAction;
  reason?: string;
  networkName?: string;
}

export function evaluateDirectMessagePolicy(
  senderId: string,
  recipientId: string,
  networks: Record<string, MockNetwork>,
  getProtectedSettings: (networkId: string) => NetworkProtectedSettings
): PolicyResult {
  let strictestAction: PolicyAction = "allow";
  let reason = "";
  let blockingNetwork = "";

  const actionSeverity: Record<PolicyAction, number> = {
    "allow": 0,
    "warn": 1,
    "convert": 2,
    "block": 3
  };

  for (const network of Object.values(networks)) {
    // Check if both users are in this network
    if (!network.memberIds?.includes(senderId) || !network.memberIds?.includes(recipientId)) {
      continue;
    }

    const settings = getProtectedSettings(network.id);
    if (!settings.enabled || settings.mode === "off" || settings.mode === "custom") {
      continue;
    }

    const senderProtected = network.memberProtectedCategories?.[senderId] || [];
    const senderSupervisors = network.memberSupervisorRoles?.[senderId] || [];
    const recipientProtected = network.memberProtectedCategories?.[recipientId] || [];
    const recipientSupervisors = network.memberSupervisorRoles?.[recipientId] || [];

    // Is there a protected person involved?
    const involvesProtected = senderProtected.length > 0 || recipientProtected.length > 0;
    if (!involvesProtected) continue;

    // Is the other person a supervisor?
    // If sender is protected, is recipient a supervisor?
    // If recipient is protected, is sender a supervisor?
    let hasSupervisor = false;
    if (senderProtected.length > 0 && recipientSupervisors.length > 0) hasSupervisor = true;
    if (recipientProtected.length > 0 && senderSupervisors.length > 0) hasSupervisor = true;

    // If there is a supervisor, it's allowed
    if (hasSupervisor) continue;

    // Otherwise, policy applies
    let action: PolicyAction = "allow";
    if (settings.mode === "warning-only") action = "warn";
    else if (settings.mode === "convert-to-supervised-thread") action = "convert";
    else if (settings.mode === "block" || settings.mode === "require-second-person" || settings.mode === "require-supervisor") action = "block";

    if (actionSeverity[action] > actionSeverity[strictestAction]) {
      strictestAction = action;
      reason = `This conversation includes a Protected Person. Mutual network "${network.name}" policy requires supervision.`;
      blockingNetwork = network.name;
    }
  }

  return { action: strictestAction, reason, networkName: blockingNetwork };
}
