import { useState } from "react";
import { useMockAppState } from "../../state/mockAppState";

export function FilePermissionsEditor({ fileId, currentViewRoles = [], currentDownloadRoles = [] }: { 
  fileId: string, 
  currentViewRoles?: string[], 
  currentDownloadRoles?: string[] 
}) {
  const { updateVaultFilePermissions } = useMockAppState();
  const [viewRoles, setViewRoles] = useState(currentViewRoles.join(", "));
  const [downloadRoles, setDownloadRoles] = useState(currentDownloadRoles.join(", "));

  const handleSave = () => {
    updateVaultFilePermissions(fileId, {
      viewRoleIds: viewRoles.split(",").map(r => r.trim()).filter(Boolean),
      downloadRoleIds: downloadRoles.split(",").map(r => r.trim()).filter(Boolean),
    } as any);
  };

  return (
    <div className="p-4 border border-slate-700 bg-slate-800/50 rounded-md mt-4 text-sm text-slate-300">
      <div className="text-amber-400 font-semibold mb-3">
        Prototype Warning: File permissions are prototype access controls unless backend enforcement is enabled.
      </div>
      <div className="mb-2">
        <label className="block text-slate-400 text-xs mb-1">View Role IDs (comma separated)</label>
        <input 
          type="text" 
          value={viewRoles}
          onChange={(e) => setViewRoles(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
          placeholder="e.g. role_admin, role_user"
        />
      </div>
      <div className="mb-3">
        <label className="block text-slate-400 text-xs mb-1">Download Role IDs (comma separated)</label>
        <input 
          type="text" 
          value={downloadRoles}
          onChange={(e) => setDownloadRoles(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
          placeholder="e.g. role_admin"
        />
      </div>
      <button 
        onClick={handleSave}
        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
      >
        Update Permissions
      </button>
    </div>
  );
}
