/**
 * Architecture Scaffolding for AegisNet Transport Router.
 * 
 * This file defines the planned interfaces for routing payloads 
 * over different transport modes (Internet, WebRTC, BLE, LoRa).
 * 
 * Currently acts as a placeholder for Sprint 4 planning.
 */

export type TransportMode = "auto" | "internet" | "local_wifi" | "ble_mesh" | "lora_radio" | "satellite";

export interface TransportProvider {
  mode: TransportMode;
  isAvailable: () => Promise<boolean>;
  sendPayload: (recipientId: string, encryptedPayload: ArrayBuffer) => Promise<boolean>;
  onPayloadReceived: (callback: (payload: ArrayBuffer) => void) => void;
}

export class TransportRouter {
  private providers: TransportProvider[] = [];

  registerProvider(provider: TransportProvider) {
    this.providers.push(provider);
  }

  async routePayload(recipientId: string, encryptedPayload: ArrayBuffer, preferredMode: TransportMode = "auto"): Promise<boolean> {
    console.log(`[Scaffold] Routing payload to ${recipientId} via ${preferredMode}`);
    // Implementation planned for future sprints
    return true;
  }
}
