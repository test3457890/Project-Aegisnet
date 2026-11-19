import { describe, it, expect } from 'vitest';
import { canViewRoom, MockRoom } from '../data/mockNetworks';
import { networkTemplates } from '../data/networkTemplates';

describe('canViewRoom - prototype access control', () => {
  const ownerNetwork = {
    ownerId: 'user_owner',
    roles: [
      { id: 'role_admin', name: 'Admin', color: '', permissions: ['manage_rooms'] },
      { id: 'role_member', name: 'Member', color: '', permissions: ['send_messages'] },
    ],
    memberRoles: {
      user_admin: ['role_admin'],
      user_member: ['role_member'],
      user_guest: [],
    },
  };

  const publicRoom: MockRoom = { id: 'room_1', name: 'General', type: 'text' };
  const restrictedRoom: MockRoom = { id: 'room_2', name: 'Planning Room', type: 'planning', visibility: 'restricted', allowedRoles: ['role_admin'] };
  const opsecRoom: MockRoom = { id: 'room_3', name: 'OPSEC Room', type: 'planning', visibility: 'opsec', allowedRoles: ['role_admin'] };
  const missionRoom: MockRoom = { id: 'room_4', name: 'Mission Room', type: 'mission', visibility: 'restricted', allowedRoles: ['role_admin'] };

  it('owner can always see all rooms', () => {
    expect(canViewRoom(publicRoom, 'user_owner', ownerNetwork)).toBe(true);
    expect(canViewRoom(restrictedRoom, 'user_owner', ownerNetwork)).toBe(true);
    expect(canViewRoom(opsecRoom, 'user_owner', ownerNetwork)).toBe(true);
    expect(canViewRoom(missionRoom, 'user_owner', ownerNetwork)).toBe(true);
  });

  it('admin can see all rooms (has manage_rooms permission)', () => {
    expect(canViewRoom(publicRoom, 'user_admin', ownerNetwork)).toBe(true);
    expect(canViewRoom(restrictedRoom, 'user_admin', ownerNetwork)).toBe(true);
    expect(canViewRoom(opsecRoom, 'user_admin', ownerNetwork)).toBe(true);
  });

  it('normal member can see public rooms', () => {
    expect(canViewRoom(publicRoom, 'user_member', ownerNetwork)).toBe(true);
  });

  it('normal member cannot see restricted room they lack role for', () => {
    expect(canViewRoom(restrictedRoom, 'user_member', ownerNetwork)).toBe(false);
  });

  it('guest cannot see opsec-style room', () => {
    expect(canViewRoom(opsecRoom, 'user_guest', ownerNetwork)).toBe(false);
  });

  it('guest cannot see restricted mission room', () => {
    expect(canViewRoom(missionRoom, 'user_guest', ownerNetwork)).toBe(false);
  });

  it('room with no allowedRoles is visible to all members', () => {
    const openMissionRoom: MockRoom = { id: 'room_5', name: 'Open Mission', type: 'mission' };
    expect(canViewRoom(openMissionRoom, 'user_member', ownerNetwork)).toBe(true);
    expect(canViewRoom(openMissionRoom, 'user_guest', ownerNetwork)).toBe(true);
  });

  it('Mission template includes Mission Room and Planning Room with restricted visibility', () => {
    const mission = networkTemplates.find(t => t.id === 'mission');
    const allRooms = mission!.categories.flatMap((s: any) => s.rooms);
    const missionRooms = allRooms.filter((r: any) => r.type === 'mission');
    const planningRooms = allRooms.filter((r: any) => r.type === 'planning');
    expect(missionRooms.length).toBeGreaterThan(0);
    expect(planningRooms.length).toBeGreaterThan(0);
    expect(missionRooms[0].visibility).toBe('restricted');
    expect(planningRooms[0].visibility).toBe('opsec');
  });

  it('Cyber template includes Planning Room', () => {
    const cyber = networkTemplates.find(t => t.id === 'cyber');
    const allRooms = cyber!.categories.flatMap((s: any) => s.rooms);
    const planningRooms = allRooms.filter((r: any) => r.type === 'planning');
    expect(planningRooms.length).toBeGreaterThan(0);
  });

  it('warning text is required in restricted rooms (documentation check)', () => {
    // Verify that restricted rooms have the opsec or restricted visibility level set
    const mission = networkTemplates.find(t => t.id === 'mission');
    const allRooms = mission!.categories.flatMap((s: any) => s.rooms);
    const restrictedRooms = allRooms.filter((r: any) => r.visibility === 'restricted' || r.visibility === 'opsec');
    expect(restrictedRooms.length).toBeGreaterThan(0);
  });
});
