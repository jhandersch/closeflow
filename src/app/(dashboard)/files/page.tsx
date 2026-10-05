"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, File, FileUp, LoaderCircle, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { appConfirm } from "@/lib/dialogs";

type StoredFile = {
  name: string;
  path: string;
  size: number;
  contentType: string;
  createdAt: string | null;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FilesPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const requestedWorkspace = window.localStorage.getItem("closeflow_active_workspace");
      const query = requestedWorkspace ? `?workspaceId=${encodeURIComponent(requestedWorkspace)}` : "";
      const response = await fetch(`/api/files${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not load files.");
      setWorkspaceId(data.workspaceId);
      setFiles(data.files || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load files.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const uploadFile = async (file?: globalThis.File) => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      if (workspaceId) form.set("workspaceId", workspaceId);
      const response = await fetch("/api/files", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "File upload failed.");
      toast.success("File uploaded");
      await loadFiles();
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "File upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const downloadFile = (file: StoredFile) => {
    const url = `/api/files?workspaceId=${encodeURIComponent(workspaceId)}&path=${encodeURIComponent(file.path)}`;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const deleteFile = async (file: StoredFile) => {
    if (!await appConfirm(`Delete “${file.name}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, path: file.path }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "File deletion failed.");
      setFiles((current) => current.filter((item) => item.path !== file.path));
      toast.success("File deleted");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "File deletion failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">Files</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Shared workspace files</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/60">
            Store and manage files shared with members of your current workspace.
          </p>
        </div>
        <div>
          <input ref={inputRef} type="file" className="hidden" onChange={(event) => void uploadFile(event.target.files?.[0])} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:opacity-50"
          >
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <FileUp size={16} />}
            Upload file
          </button>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-sm">
        <div className="border-b border-border-subtle px-5 py-4">
          <h2 className="font-medium text-foreground">Workspace files</h2>
          <p className="mt-1 text-xs text-foreground/50">Maximum file size: 20 MB. Files are private to this workspace.</p>
        </div>
        {error ? (
          <div className="m-5 rounded-xl border border-red-400/25 bg-red-400/5 p-4 text-sm text-red-200">
            <p>{error}</p>
            <button type="button" onClick={() => void loadFiles()} className="mt-2 font-medium underline underline-offset-2">Retry</button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-foreground/55"><LoaderCircle size={16} className="animate-spin" /> Loading files...</div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-subtle bg-surface-2 text-foreground/55"><File size={20} /></span>
            <h3 className="mt-4 font-medium text-foreground">No files yet</h3>
            <p className="mt-1 text-sm text-foreground/55">Upload a file to make it available to your workspace.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {files.map((file) => (
              <div key={file.path} className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-foreground/[0.025] sm:flex-nowrap">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-2 text-cyan-200"><File size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground" title={file.name}>{file.name}</p>
                  <p className="mt-1 text-xs text-foreground/50">{formatSize(file.size)}{file.createdAt ? ` · ${new Date(file.createdAt).toLocaleDateString("en-US")}` : ""}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button type="button" onClick={() => downloadFile(file)} title="Download file" aria-label={`Download ${file.name}`} className="rounded-lg border border-border-subtle p-2 text-foreground/65 transition hover:bg-foreground/5 hover:text-foreground"><Download size={16} /></button>
                  <button type="button" disabled={busy} onClick={() => void deleteFile(file)} title="Delete file" aria-label={`Delete ${file.name}`} className="rounded-lg border border-border-subtle p-2 text-foreground/65 transition hover:border-red-400/30 hover:bg-red-400/5 hover:text-red-200 disabled:opacity-50"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
