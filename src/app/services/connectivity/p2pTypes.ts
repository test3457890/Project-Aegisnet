/**
 * Architecture Scaffolding for AegisNet P2P Types.
 * 
 * Defines the planned protocol structures for P2P mesh relaying.
 */

export interface MeshNodeMetadata {
  nodeId: string;
  publicKey: ArrayBuffer;
  lastSeen: number;
  batteryLevel?: number;
  supportedTransports: string[];
}

export interface RelayPacket {
  packetId: string;
  sourceNodeId: string;
  destinationNodeId: string;
  hopCount: number;
  maxHops: number;
  encryptedPayload: ArrayBuffer;
}

export interface WebRTCSignalingMessage {
  type: "offer" | "answer" | "ice-candidate";
  senderId: string;
  targetId: string;
  payload: string; // JSON string of WebRTC data
}
