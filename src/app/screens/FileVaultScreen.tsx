import {
  Download, File, FileArchive, FileImage, FileSpreadsheet, FileText,
  FolderLock, LayoutGrid, List, Lock, LockOpen, Plus, Search, ShieldCheck, Trash2,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { MockVaultFile, useMockAppState } from "../state/mockAppState";
import {
  cleanupPrototypeFiles,
  clearPrototypeFiles,
  deletePrototypeFile,
  getPrototypeStorageUsage,
  storeEncryptedPrototypeFile,
  storePrototypeFile,
} from "../storage/prototypeFileStore";
import { isVaultCryptoAvailable } from "../storage/vaultCrypto";
import { PrototypeDownloadButton } from "../components/chat/StoredAttachment";
import { formatBytes, getFileExtension, SUPPORTED_EXTENSIONS, validatePrototypeFile } from "../utils/files";
import { createDocumentThumbnail } from "../utils/documentThumbnail";
import { API_URL } from "../api/client";

type VaultFilter = "all" | "images" | "documents" | "archives";

export function FileVaultScreen() {
  const {
    vaultFiles,
    uploadVaultFile,
    deleteVaultFile,
    users,
    me,
  } = useMockAppState();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VaultFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [storageUsage, setStorageUsage] = useState({ fileCount: 0, totalBytes: 0 });
  const [browserQuota, setBrowserQuota] = useState<{ usage: number, quota: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshStorageUsage = () => {
    getPrototypeStorageUsage()
      .then(setStorageUsage)
      .catch(() => setStorageUsage({ fileCount: 0, totalBytes: 0 }));
      
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(({ usage, quota }) => {
        if (usage !== undefined && quota !== undefined) {
          setBrowserQuota({ usage, quota });
        }
      });
    }
  };

  useEffect(refreshStorageUsage, [vaultFiles]);

  const visibleFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return vaultFiles.filter((file) => {
      const extension = getFileExtension(file.name);
      const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(extension);
      const isArchive = extension === "zip";
      const matchesFilter =
        filter === "all"
        || (filter === "images" && isImage)
        || (filter === "archives" && isArchive)
        || (filter === "documents" && !isImage && !isArchive);
      const matchesQuery = !normalizedQuery
        || file.name.toLowerCase().includes(normalizedQuery)
        || file.accessState.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, vaultFiles]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validatePrototypeFile(file);
    if (validationError) {
      setError(validationError);
      setNotice("");
      return;
    }

    setError("");
    let storageId: string | undefined;
    const thumbnailUrl = await createDocumentThumbnail(file);
    let hash: string | undefined;
    let encrypted = false;

    try {
      // Integrity hash is computed over the plaintext, before encryption.
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      if (isVaultCryptoAvailable()) {
        try {
          storageId = await storeEncryptedPrototypeFile(file);
          encrypted = true;
        } catch {
          // If encryption fails, fall back to plain local storage rather than losing the file,
          // and report it honestly below instead of implying it was encrypted.
          storageId = await storePrototypeFile(file);
          encrypted = false;
        }
      } else {
        storageId = await storePrototypeFile(file);
      }
    } catch {
      storageId = undefined;
    }

    const localFile: MockVaultFile = {
      id: `file_${Date.now()}`,
      name: file.name,
      type: file.type || `application/${getFileExtension(file.name)}`,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: me.id,
      accessState: encrypted ? "Encrypted at rest (local)" : "Private prototype",
      status: "available",
      storageId,
      thumbnailUrl,
      hash,
      encrypted,
    };
    uploadVaultFile(localFile);
    setNotice(
      !storageId
        ? "File metadata was saved, but binary storage is unavailable in this browser."
        : encrypted
          ? "File encrypted at rest (AES-GCM) and saved in this browser for local prototype download."
          : "File saved locally without encryption (Web Crypto is unavailable in this browser).",
    );
  };

  const referencedStorageIds = () => vaultFiles.map((file) => file.storageId).filter((id): id is string => Boolean(id));

  const cleanUnusedFiles = async () => {
    const result = await cleanupPrototypeFiles(referencedStorageIds());
    refreshStorageUsage();
    setNotice(result.removedCount
      ? `Removed ${result.removedCount} unused local file${result.removedCount === 1 ? "" : "s"} (${formatBytes(result.removedBytes)}).`
      : "No unused local files were found.");
  };

  const removeAllBinaries = async () => {
    if (!window.confirm("Remove all downloadable file data from this browser? File metadata will remain visible.")) return;
    await clearPrototypeFiles();
    refreshStorageUsage();
    setNotice("All local file binaries were removed. Metadata remains available.");
  };

  const handleDelete = async (file: MockVaultFile) => {
    if (!window.confirm(`Delete "${file.name}" from this local prototype?`)) return;
    if (file.storageId) {
      await deletePrototypeFile(file.storageId).catch(() => undefined);
    }
    deleteVaultFile(file.id);
    setNotice(`${file.name} was removed from the local File Vault.`);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-clean bg-background-primary p-4 pb-24 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl border border-accent-primary/25 bg-accent-primary/10 text-accent-primary flex items-center justify-center">
                <FolderLock size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-text-primary">File Vault</h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
                  <ShieldCheck size={14} className="text-success" />
                  Local prototype storage • SHA-256 verification • AES-GCM at rest
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-56 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files..."
                className="w-full rounded-xl border border-border-default bg-surface-card py-2.5 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
              />
            </label>
            <div className="hidden rounded-xl border border-border-default bg-surface-card p-1 sm:flex">
              <button onClick={() => setViewMode("grid")} className={clsx("rounded-lg p-2", viewMode === "grid" ? "bg-surface-selected text-accent-primary" : "text-text-muted")} aria-label="Grid view"><LayoutGrid size={16} /></button>
              <button onClick={() => setViewMode("list")} className={clsx("rounded-lg p-2", viewMode === "list" ? "bg-surface-selected text-accent-primary" : "text-text-muted")} aria-label="List view"><List size={16} /></button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={SUPPORTED_EXTENSIONS.map((extension) => `.${extension}`).join(",")}
              onChange={handleUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-accent-secondary px-4 py-2.5 text-sm font-bold text-white flex items-center gap-2 hover:bg-accent-primary"
            >
              <Plus size={18} />
              Upload
            </button>
          </div>
        </header>

        <div className="rounded-2xl border border-border-default bg-surface-card p-4 text-sm text-text-secondary space-y-2">
          <p>
            New uploads are encrypted at rest with <span className="font-semibold text-text-primary">AES-GCM-256</span> using a random key generated for this browser profile, then stored in IndexedDB. File metadata (name, type, size, SHA-256 hash, thumbnail) stays unencrypted in localStorage. Files are hashed with SHA-256 on the original bytes for integrity.
          </p>
          <p className="text-text-muted">
            This is <span className="font-semibold">local at-rest encryption only</span> — not end-to-end, not zero-knowledge, and not government- or military-grade. The key lives in this browser next to the files, so it protects against casual copying of the file store but not an attacker with full access to this profile. If you clear site data or "Wipe Device", the key is lost and encrypted files cannot be recovered.
          </p>
        </div>

        <section className="rounded-2xl border border-border-default bg-surface-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-text-primary">Local storage usage</h2>
              <p className="mt-1 text-xs text-text-muted">
                {storageUsage.fileCount} stored binaries • {formatBytes(storageUsage.totalBytes)}
                {browserQuota && ` (Browser quota: ${formatBytes(browserQuota.usage)} / ${formatBytes(browserQuota.quota)})`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={cleanUnusedFiles} className="rounded-xl border border-border-default px-3 py-2 text-xs font-bold text-text-secondary hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary">Clean unused files</button>
              <button type="button" onClick={removeAllBinaries} className="rounded-xl border border-danger/40 px-3 py-2 text-xs font-bold text-danger-readable hover:bg-danger/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger">Remove all downloads</button>
            </div>
          </div>
        </section>

        {(error || notice) && (
          <div
            role={error ? "alert" : "status"}
            className={clsx(
              "rounded-xl border px-4 py-3 text-sm font-medium",
              error ? "border-danger/30 bg-danger/10 text-danger-readable" : "border-success/30 bg-success/10 text-success",
            )}
          >
            {error || notice}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto scrollbar-clean pb-1">
          {([
            ["all", "All files"],
            ["images", "Images"],
            ["documents", "Documents"],
            ["archives", "Archives"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={clsx(
                "whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold",
                filter === value
                  ? "border-accent-primary bg-accent-primary/10 text-accent-readable"
                  : "border-border-default bg-surface-card text-text-secondary hover:bg-surface-hover",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {visibleFiles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border-default p-12 text-center">
            <FolderLock size={32} className="mx-auto text-text-muted" />
            <h2 className="mt-4 text-lg font-bold text-text-primary">No files found</h2>
            <p className="mt-2 text-sm text-text-secondary">Upload a supported file or clear the current search and filter.</p>
          </div>
        ) : (
          <div className={clsx("grid gap-4", viewMode === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
            {visibleFiles.map((file) => (
              <VaultFileCard
                key={file.id}
                file={file}
                uploader={file.uploadedBy === me.id ? me.name : users[file.uploadedBy]?.name || file.uploadedBy}
                compact={viewMode === "list"}
                onDelete={() => handleDelete(file)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VaultFileCard({ file, uploader, compact, onDelete }: { file: MockVaultFile; uploader: string; compact: boolean; onDelete: () => void }) {
  const extension = getFileExtension(file.name);
  const Icon = ["png", "jpg", "jpeg", "webp", "gif"].includes(extension)
    ? FileImage
    : extension === "zip"
      ? FileArchive
      : extension === "xlsx"
        ? FileSpreadsheet
        : ["pdf", "doc", "docx", "txt"].includes(extension)
          ? FileText
          : File;

  return (
    <article className={clsx("rounded-2xl border border-border-default bg-surface-card p-5 shadow-sm", compact && "sm:flex sm:items-center sm:gap-5")}>
      <div className="flex items-start justify-between gap-3">
        {file.thumbnailUrl ? (
          <img src={file.thumbnailUrl} alt="" className="h-20 w-28 shrink-0 rounded-xl border border-border-default object-cover" />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-xl border border-accent-primary/20 bg-accent-primary/10 text-accent-primary flex items-center justify-center"><Icon size={23} /></div>
        )}
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success">{file.status}</span>
          {file.encrypted ? (
            <span className="flex items-center gap-1 rounded-full bg-encrypted/10 px-2 py-1 text-[10px] font-bold text-encrypted" title="Encrypted at rest with AES-GCM (local prototype encryption)">
              <Lock size={11} /> Encrypted
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-surface-hover px-2 py-1 text-[10px] font-bold text-text-secondary" title="Stored without at-rest encryption (prototype only)">
              <LockOpen size={11} /> Not encrypted
            </span>
          )}
        </div>
      </div>
      <div className="mt-4 min-w-0 flex-1">
        <h2 className="truncate text-base font-bold text-text-primary" title={file.name}>{file.name}</h2>
        <p className="mt-1 text-xs uppercase text-text-muted">{extension || "file"} • {formatBytes(file.size)}</p>
        <dl className="mt-4 space-y-2 text-xs">
          <MetaRow label="Uploaded by" value={uploader} />
          <MetaRow label="Upload time" value={new Date(file.uploadedAt).toLocaleString()} />
          <MetaRow label="Access" value={file.accessState} />
          <MetaRow label="Encryption" value={file.encrypted ? "AES-GCM (local at rest)" : "None (prototype)"} />
          {file.hash && <MetaRow label="SHA-256" value={`${file.hash.slice(0, 12)}...${file.hash.slice(-4)}`} title={file.hash} />}
        </dl>
      </div>
      <div className={clsx("mt-5 border-t border-border-default pt-4", compact && "sm:mt-0 sm:border-0 sm:pt-0")}>
        <div className="mb-2 flex flex-wrap justify-center gap-2">
          {file.storageId && (
            <PrototypeDownloadButton attachment={{ ...file, storageScope: "browser-local", safeUrl: undefined }} />
          )}
          {file.storageScope === "api-local" && file.safeUrl && (
            <a
              href={`${API_URL}${file.safeUrl}`}
              download={file.name}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-current/20 font-bold hover:bg-current/10 flex items-center justify-center gap-1.5 px-3 py-2 text-xs"
              title="Download unencrypted copy from backend"
            >
              <Download size={15} />
              API Download
            </a>
          )}
        </div>
        <button onClick={onDelete} className="w-full rounded-xl border border-danger/40 px-3 py-2 text-xs font-bold text-danger-readable flex items-center justify-center gap-2 hover:bg-danger/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger">
          <Trash2 size={15} />
          Delete local file
        </button>
      </div>
    </article>
  );
}

function MetaRow({ label, value, title }: { label: string; value: string; title?: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-text-muted">{label}</dt><dd className="truncate text-right font-semibold text-text-primary" title={title || value}>{value}</dd></div>;
}
