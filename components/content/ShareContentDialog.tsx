"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { FilterChips } from "../ui/FilterChips";
import { TextAreaField } from "../ui/FormField";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { whatsappLink, whatsappLinkWithText } from "../../lib/contact/whatsapp";
import {
  CONTENT_KIND_META,
  ContentAsset,
  ContentKind,
  ContentShareChannel,
  ContentShareResult,
  ContentShareTargetType,
  formatFileSize,
} from "../../lib/types/domain";
import { ContentKindBadge, downloadFromUrl } from "./contentUi";

const MESSAGE_MAX = 1000;

export interface ShareTarget {
  type: ContentShareTargetType;
  id: string;
  /** Who it is shared with, as the person sees it (the lead's or customer's name). */
  name: string;
  phone?: string | null;
  /** The lead's country (null when not recorded); undefined for a record without one (a customer). */
  country?: string | null;
}

/**
 * Share library content with a lead, an opportunity or a customer. The share is
 * recorded first (the exact current version, with an entry on the lead's history
 * and/or the customer's activity, in one backend transaction); then the person
 * downloads the file and opens the WhatsApp chat with the message filled in, and
 * attaches the file there. Nothing is sent automatically, and no public link exists.
 */
export function ShareContentDialog({ target, onShared, onClose }: { target: ShareTarget; onShared?: () => void; onClose: () => void }) {
  const repo = useRepository();
  const [items, setItems] = useState<ContentAsset[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [kind, setKind] = useState<ContentKind | "ALL">("ALL");
  const [selected, setSelected] = useState<ContentAsset | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ContentShareResult | null>(null);

  const wa = whatsappLink(target.phone ?? null, target.country);

  useEffect(() => {
    repo.content
      .list({ status: "ACTIVE" })
      .then(setItems)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "The content library couldn't be loaded."));
  }, [repo]);

  const shown = useMemo(() => {
    const q = term.trim().toLowerCase();
    return (items ?? []).filter(
      (a) => (kind === "ALL" || a.kind === kind) && (!q || a.title.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q)) || (a.description ?? "").toLowerCase().includes(q))
    );
  }, [items, term, kind]);

  function choose(asset: ContentAsset) {
    setSelected(asset);
    setError(null);
    setMessage(`Hello ${target.name}, please find our ${CONTENT_KIND_META[asset.kind].label.toLowerCase()} “${asset.title}”.`);
  }

  async function share(channel: ContentShareChannel) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const result = await repo.content.share(selected.id, {
        targetType: target.type,
        targetId: target.id,
        channel,
        recipientName: target.name.slice(0, 120),
        ...(target.phone && /^\+?[0-9][0-9 ()-]{5,30}$/.test(target.phone.trim()) ? { recipientPhone: target.phone.trim() } : {}),
        ...(message.trim() ? { message: message.trim().slice(0, MESSAGE_MAX) } : {}),
      });
      setDone(result);
      onShared?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The share couldn't be recorded.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const chat = wa.ok ? whatsappLinkWithText(wa.url, done.message ?? "") : null;
    return (
      <Modal
        title="Shared"
        onClose={onClose}
        footer={
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        }
      >
        <p className="content-dialog-note">
          Recorded: {CONTENT_KIND_META[selected!.kind].label.toLowerCase()} &ldquo;{selected!.title}&rdquo;, version {done.version}, shared with {target.name}. It is on the {target.type === "CUSTOMER" ? "customer's activity" : "lead's history"}.
        </p>
        <ol className="content-steps">
          <li>
            <Button variant="ghost" icon="download" onClick={() => downloadFromUrl(done.download.url, done.download.fileName)}>
              Download {done.download.fileName}
            </Button>
            <span className="content-step-hint">The download link works for 15 minutes.</span>
          </li>
          {done.channel === "WHATSAPP" && chat && (
            <li>
              <a className="btn primary" href={chat} target="_blank" rel="noopener noreferrer">
                <Icon name="wa" size={16} /> Open the WhatsApp chat
              </a>
              <span className="content-step-hint">The message is filled in; attach the downloaded file there.</span>
            </li>
          )}
        </ol>
      </Modal>
    );
  }

  const kindsPresent = (["CATALOGUE", "PHOTO", "VIDEO"] as ContentKind[]).filter((k) => (items ?? []).some((a) => a.kind === k));
  return (
    <Modal
      title={`Share content with ${target.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="ghost" icon="download" onClick={() => share("DOWNLOAD")} disabled={busy || !selected} title="Record the share and download the file, to send it another way">
            Share by download
          </Button>
          <Button variant="primary" icon="wa" onClick={() => share("WHATSAPP")} disabled={busy || !selected || !wa.ok} title={wa.ok ? undefined : wa.message}>
            {busy ? "Recording…" : "Share on WhatsApp"}
          </Button>
        </>
      }
    >
      {!wa.ok && <p className="content-dialog-note" role="note">WhatsApp: {wa.message.replace(/\.$/, "")}. You can still share by download.</p>}
      {loadError && (
        <p role="alert" className="content-error">
          {loadError}
        </p>
      )}
      {!items && !loadError && <div className="skeleton" style={{ height: 120 }} />}
      {items && items.length === 0 && <p className="content-dialog-note">The content library has nothing to share yet. Upload catalogues, photos or videos in Content Library first.</p>}
      {items && items.length > 0 && (
        <>
          <div className="content-share-tools">
            <label className="cust-search">
              <Icon name="search" size={16} />
              <span className="sr-only">Search content</span>
              <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search title or tag" />
            </label>
            {kindsPresent.length > 1 && (
              <FilterChips
                label="Filter content by kind"
                value={kind}
                onChange={setKind}
                options={[{ value: "ALL" as const, label: "All" }, ...kindsPresent.map((k) => ({ value: k, label: CONTENT_KIND_META[k].plural }))]}
              />
            )}
          </div>
          <ul className="content-pick" role="listbox" aria-label="Content to share">
            {shown.map((a) => (
              <li key={a.id}>
                <button type="button" role="option" aria-selected={selected?.id === a.id} className={`content-pick-item ${selected?.id === a.id ? "on" : ""}`} onClick={() => choose(a)}>
                  <ContentKindBadge kind={a.kind} />
                  <span className="content-pick-title">{a.title}</span>
                  <span className="content-pick-meta">
                    v{a.currentVersion?.version ?? 1}
                    {a.currentVersion ? ` · ${formatFileSize(a.currentVersion.sizeBytes)}` : ""}
                  </span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="content-dialog-note">Nothing matches.</li>}
          </ul>
          {selected && (
            <TextAreaField
              label="WhatsApp message"
              rows={3}
              value={message}
              maxLength={MESSAGE_MAX}
              onChange={(e) => setMessage(e.target.value)}
              hint="Recorded with the share and filled into the WhatsApp chat."
            />
          )}
        </>
      )}
      {error && (
        <p role="alert" className="content-error">
          {error}
        </p>
      )}
    </Modal>
  );
}
