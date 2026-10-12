"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { FieldRow, SelectField, TextAreaField, TextField } from "../ui/FormField";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { CONTENT_KIND_META, CONTENT_KINDS, ContentAssetDetail, ContentKind, formatFileSize } from "../../lib/types/domain";

const TITLE_MAX = 160;
const DESCRIPTION_MAX = 2000;

export function parseTags(text: string): string[] {
  return [...new Set(text.split(",").map((t) => t.trim().toLowerCase().replace(/\s+/g, " ")).filter(Boolean))];
}

// A quick check before uploading (the backend checks the file's real content and wins).
export function precheckFile(kind: ContentKind, file: File | null): string | null {
  if (!file) return "Choose a file.";
  const meta = CONTENT_KIND_META[kind];
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (!meta.extensions.includes(ext)) return `A ${meta.label.toLowerCase()} must be ${meta.formats.replace(/, up to.*/, "")} (.${meta.extensions.join(", .")}).`;
  if (file.size > meta.maxBytes) return `This file is ${formatFileSize(file.size)}; a ${meta.label.toLowerCase()} can be at most ${formatFileSize(meta.maxBytes)}.`;
  return null;
}

/**
 * Upload a new content item (title, kind, description, tags, file), or a new version
 * of an existing one (file only; the kind stays). Shows upload progress.
 */
export function ContentUploadDialog({
  asset,
  onDone,
  onClose,
}: {
  /** Present: upload a new version of this item. */
  asset?: ContentAssetDetail;
  onDone: (detail: ContentAssetDetail) => void;
  onClose: () => void;
}) {
  const repo = useRepository();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ContentKind>(asset?.kind ?? "CATALOGUE");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const meta = CONTENT_KIND_META[kind];

  async function submit() {
    setError(null);
    if (!asset && !title.trim()) {
      setError("Give the content a title.");
      return;
    }
    const problem = precheckFile(kind, file);
    if (problem) {
      setError(problem);
      return;
    }
    setProgress(0);
    try {
      const detail = asset
        ? await repo.content.addVersion(asset.id, file!, setProgress)
        : await repo.content.create({ title: title.trim(), kind, description: description.trim() || undefined, tags: parseTags(tags) }, file!, setProgress);
      onDone(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The upload failed.");
      setProgress(null);
    }
  }

  const busy = progress !== null;
  return (
    <Modal
      title={asset ? `New version of “${asset.title}”` : "Upload content"}
      onClose={busy ? () => undefined : onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" icon="plus" onClick={submit} disabled={busy}>
            {busy ? `Uploading… ${Math.round((progress ?? 0) * 100)}%` : asset ? `Upload version ${asset.versionCount + 1}` : "Upload"}
          </Button>
        </>
      }
    >
      {!asset && (
        <>
          <TextField label="Title" required value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
          <FieldRow>
            <SelectField
              label="Kind"
              required
              value={kind}
              disabled={busy}
              onChange={(e) => {
                setKind(e.target.value as ContentKind);
                setFile(null);
              }}
              options={CONTENT_KINDS.map((k) => ({ value: k, label: CONTENT_KIND_META[k].label }))}
            />
            <TextField label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} hint="Comma-separated, e.g. pumps, 5 hp" disabled={busy} />
          </FieldRow>
          <TextAreaField label="Description" rows={3} value={description} maxLength={DESCRIPTION_MAX} onChange={(e) => setDescription(e.target.value)} disabled={busy} />
        </>
      )}
      {asset && <p className="content-dialog-note">Earlier versions are kept unchanged; the new version becomes the one that is shared.</p>}
      <div className="field">
        <label className="btn ghost content-file-pick">
          {file ? "Choose another file" : "Choose file"}
          <input type="file" accept={meta.accept} hidden disabled={busy} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <p className="content-file-name">{file ? `${file.name} · ${formatFileSize(file.size)}` : `No file chosen · ${meta.formats}`}</p>
      </div>
      {busy && <progress className="content-progress" value={progress ?? 0} max={1} aria-label="Upload progress" />}
      <p className="content-dialog-note">Location data (GPS) is removed from photos and videos before they are stored.</p>
      {error && (
        <p role="alert" className="content-error">
          {error}
        </p>
      )}
    </Modal>
  );
}

/** Edit an item's title, description and tags. */
export function ContentEditDialog({ asset, onDone, onClose }: { asset: ContentAssetDetail; onDone: (d: ContentAssetDetail) => void; onClose: () => void }) {
  const repo = useRepository();
  const [title, setTitle] = useState(asset.title);
  const [description, setDescription] = useState(asset.description ?? "");
  const [tags, setTags] = useState(asset.tags.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) {
      setError("Give the content a title.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onDone(await repo.content.update(asset.id, { title: title.trim(), description: description.trim() || null, tags: parseTags(tags) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The changes couldn't be saved.");
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Edit details"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <TextField label="Title" required value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} />
      <TextField label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} hint="Comma-separated" />
      <TextAreaField label="Description" rows={4} value={description} maxLength={DESCRIPTION_MAX} onChange={(e) => setDescription(e.target.value)} />
      {error && (
        <p role="alert" className="content-error">
          {error}
        </p>
      )}
    </Modal>
  );
}
