import { useState } from "react";
import { clsx } from "clsx";
import { RotateCcw } from "lucide-react";
import {
  ALL_PERMISSION_KEYS, PERMISSION_GROUPS, RoleId, ROLES, roleHasPermission, useAdminState,
} from "../../state/adminState";

export function AdminRoles() {
  const { permissionMatrix, togglePermission, resetPermissions } = useAdminState();
  const [roleId, setRoleId] = useState<RoleId>("net_admin");

  const role = ROLES.find((item) => item.id === roleId)!;
  const enabledCount = (permissionMatrix[roleId] || []).length;

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-xs text-text-muted">
        Local prototype RBAC. Toggling a permission updates the local role definition and records an audit event. These toggles are not globally enforced yet — see PERMISSIONS_AND_RBAC_PLAN.md for what is UI-only vs. enforced.
      </p>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Role list */}
        <div className="space-y-1">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Roles</span>
            <button onClick={resetPermissions} className="flex items-center gap-1 text-[11px] font-bold text-text-secondary hover:text-text-primary" title="Reset all roles to defaults">
              <RotateCcw size={12} /> Reset
            </button>
          </div>
          {ROLES.map((item) => (
            <button
              key={item.id}
              onClick={() => setRoleId(item.id)}
              className={clsx(
                "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                roleId === item.id ? "border-accent-primary/50 bg-surface-selected text-text-primary" : "border-border-default text-text-secondary hover:bg-surface-hover",
              )}
            >
              <span className="truncate font-semibold">{item.label}</span>
              <span className="shrink-0 rounded-full bg-surface-hover px-1.5 text-[10px] text-text-secondary">{(permissionMatrix[item.id] || []).length}</span>
            </button>
          ))}
        </div>

        {/* Permission editor for selected role */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border-default bg-surface-card p-4">
            <h3 className="text-sm font-bold text-text-primary">{role.label}</h3>
            <p className="mt-1 text-xs text-text-secondary">{role.description}</p>
            <p className="mt-2 text-[11px] text-text-muted">{enabledCount} of {ALL_PERMISSION_KEYS.length} permissions enabled (preview of what this role can do).</p>
          </div>

          {PERMISSION_GROUPS.map((group) => (
            <div key={group.group} className="rounded-2xl border border-border-default bg-surface-card p-4">
              <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">{group.group}</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.permissions.map((permission) => {
                  const on = roleHasPermission(permissionMatrix, roleId, permission.key);
                  return (
                    <label key={permission.key} className="flex items-center gap-2 rounded-lg border border-border-default bg-background-secondary px-3 py-2 cursor-pointer hover:bg-surface-hover">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => togglePermission(roleId, permission.key)}
                        className="h-4 w-4 accent-current text-accent-primary"
                      />
                      <span className="text-xs text-text-primary">{permission.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compact matrix summary */}
      <div className="rounded-2xl border border-border-default bg-surface-card p-4">
        <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Permission matrix (totals by role)</h4>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-border-default bg-background-secondary px-3 py-2">
              <span className="text-xs text-text-secondary">{item.label}</span>
              <span className="text-xs font-bold text-text-primary">{(permissionMatrix[item.id] || []).length}/{ALL_PERMISSION_KEYS.length}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
