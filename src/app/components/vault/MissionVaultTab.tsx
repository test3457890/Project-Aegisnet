import React, { useRef } from "react";
import { useMockAppState } from "../../state/mockAppState";
import { FilePermissionsEditor } from "./FilePermissionsEditor";

export function MissionVaultTab({ roomId }: { roomId: string }) {
  const { vaultFiles, uploadVaultFile, logFileAccess, me } = useMockAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const missionFiles = vaultFiles.filter((f: any) => f.roomId === roomId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newFile = {
        id: `file_${Date.now()}`,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: me.id,
        accessState: "Private prototype",
        status: "available" as const,
        roomId,
      };
      uploadVaultFile(newFile);
    }
  };

  const handleDownload = (file: any) => {
    logFileAccess(file.id, "downloaded" as any);
    alert(`Downloading ${file.name} (Local Prototype Download)`);
  };

  return (
    <div className="p-6">
      <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded p-4 text-amber-200/80 text-sm">
        <p className="font-semibold text-amber-500 mb-1">Local prototype storage</p>
        File Vault is a prototype file-management area. File access controls help organize files in this build, but they are not a production security boundary unless backend enforcement and encryption are implemented.
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-100">Mission Vault</h2>
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
        >
          Upload File
        </button>
      </div>

      <div className="space-y-4">
        {missionFiles.length === 0 ? (
          <p className="text-slate-400 text-center py-8 bg-slate-800/50 rounded-lg border border-slate-700 border-dashed">No files uploaded to this mission yet.</p>
        ) : (
          missionFiles.map((file: any) => (
            <div key={file.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-slate-200">{file.name}</h3>
                  <div className="text-xs text-slate-400 mt-1 space-x-3">
                    <span>Type: {file.type}</span>
                    <span>Size: {(file.size / 1024).toFixed(1)} KB</span>
                    <span>By: {file.uploadedBy}</span>
                    <span>Date: {new Date(file.uploadedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-indigo-400">
                    Access: {file.accessState || "Default"}
                  </div>
                </div>
                <button 
                  onClick={() => handleDownload(file)}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm"
                >
                  Download
                </button>
              </div>
              <FilePermissionsEditor 
                fileId={file.id} 
                currentViewRoles={file.viewRoleIds} 
                currentDownloadRoles={file.downloadRoleIds} 
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
