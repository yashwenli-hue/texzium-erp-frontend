"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { FilterChips } from "../ui/FilterChips";
import { TextAreaField } from "../ui/FormField";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { useAuth } from "../../lib/auth/AuthContext";
import { whatsappLink, whatsappLinkWithText } from "../../lib/contact/whatsapp";
import {
  CONTENT_KIND_META,
  ContentAsset,
  ContentKind,
  ContentShareChannel,
  ContentShareInput,
  ContentShareTargetType,
  formatFileSize,
} from "../../lib/types/domain";
import { filterContent, isSelected, removeFromSelection, selectionFileName, shareActionState, suggestedShareMessage, toggleSelection } from "../../lib/content/shareSelection";
import { countBy, runShareBatch, ShareBatchState, ShareItemState } from "../../lib/content/shareBatch";
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

type Phase = "select" | "confirm" | "sharing" | "result";

/**
 * Share library content with a lead, an opportunity or a customer. One or more items can be
 * picked; each is recorded as its own share (the exact current version, with an entry on the
 * lead's history and/or the customer's activity, in one backend transaction per item). Several
 * items are confirmed first, since each share is permanent. Then the person downloads the files
 * and opens the WhatsApp chat with the message filled in, and attaches the files there. Nothing
 * is sent automatically, and no public link exists.
 */
export function ShareContentDialog({ target, onShared, onClose }: { target: ShareTarget; onShared?: () => void; onClose: () => void }) {
  const repo = useRepository();
  const { user, hasPermission } = useAuth();
  const [items, setItems] = useState<ContentAsset[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [kind, setKind] = useState<ContentKind | "ALL">("ALL");
  const [selection, setSelection] = useState<ContentAsset[]>([]);
  const [message, setMessage] = useState("");
  const [messageEdited, setMessageEdited] = useState(false);
  const [phase, setPhase] = useState<Phase>("select");
  const [channel, setChannel] = useState<ContentShareChannel>("WHATSAPP");
  const [results, setResults] = useState<ShareBatchState>({});
  const startedAt = useRef(0);
  // the input the batch was sent with: a retry must send exactly the same (so it matches in history)
  const sentInput = useRef<ContentShareInput | null>(null);

  const wa = whatsappLink(target.phone ?? null, target.country);
  const canShare = hasPermission("content.view") && hasPermission("content.share");
  const busy = phase === "sharing";
  const n = selection.length;
  const actions = shareActionState({ count: n, canShare, whatsappOk: wa.ok });

  useEffect(() => {
    repo.content
      .list({ status: "ACTIVE" })
      .then(setItems)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "The content library couldn't be loaded."));
  }, [repo]);

  const shown = useMemo(() => filterContent(items ?? [], term, kind), [items, term, kind]);
  const suggested = suggestedShareMessage(target.name, selection);

  function changeSelection(next: ContentAsset[]) {
    setSelection(next);
    if (!messageEdited) setMessage(suggestShort(target.name, next));
  }

  function suggestShort(name: string, next: ContentAsset[]) {
    return suggestedShareMessage(name, next).slice(0, MESSAGE_MAX);
  }

  async function record(ch: ContentShareChannel, retry: boolean) {
    const input: ContentShareInput = retry && sentInput.current
      ? sentInput.current
      : {
          targetType: target.type,
          targetId: target.id,
          channel: ch,
          recipientName: target.name.slice(0, 120),
          ...(target.phone && /^\+?[0-9][0-9 ()-]{5,30}$/.test(target.phone.trim()) ? { recipientPhone: target.phone.trim() } : {}),
          ...(message.trim() ? { message: message.trim().slice(0, MESSAGE_MAX) } : {}),
        };
    if (!retry) {
      startedAt.current = Date.now();
      sentInput.current = input;
      setChannel(ch);
    }
    setPhase("sharing");
    const before = countBy(retry ? results : {}).shared;
    const final = await runShareBatch(
      { share: (id, i) => repo.content.share(id, i), listShares: (id) => repo.content.listShares(id), accessUrl: (id, d, v) => repo.content.accessUrl(id, d, v) },
      selection,
      input,
      { startedAt: startedAt.current, actorId: user?.id ?? null, previous: retry ? results : undefined, onUpdate: setResults }
    );
    setResults(final);
    setPhase("result");
    if (countBy(final).shared > before) onShared?.();
  }

  function start(ch: ContentShareChannel) {
    if ((ch === "WHATSAPP" ? actions.whatsappDisabled : actions.downloadDisabled)) return;
    if (actions.needsConfirmation) {
      setChannel(ch);
      setPhase("confirm");
      return;
    }
    void record(ch, false);
  }

  const close = () => {
    if (!busy) onClose();
  };

  if (phase === "result" || phase === "sharing") {
    return <ShareResult target={target} selection={selection} results={results} channel={channel} message={sentInput.current?.message ?? ""} waUrl={wa.ok ? wa.url : null} busy={busy} onRetry={() => void record(channel, true)} onClose={close} />;
  }

  if (phase === "confirm") {
    const where = target.type === "CUSTOMER" ? "the customer's activity" : "the lead's history";
    return (
      <Modal
        title={`Record ${n} shares?`}
        onClose={() => setPhase("select")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPhase("select")}>
              Back
            </Button>
            <Button variant="primary" icon={channel === "WHATSAPP" ? "wa" : "download"} onClick={() => void record(channel, false)}>
              Record {n} shares
            </Button>
          </>
        }
      >
        <p className="content-dialog-note" role="note">
          This records {n} permanent shares with {target.name}, one for each item below, and adds {n} entries to {where}. A share can&apos;t be undone.
        </p>
        <ul className="content-confirm-list">
          {selection.map((a) => (
            <li key={a.id}>
              <ContentKindBadge kind={a.kind} /> <b>{a.title}</b> <span className="content-pick-meta">v{a.currentVersion?.version ?? 1}</span>
            </li>
          ))}
        </ul>
        <p className="content-dialog-note">
          {channel === "WHATSAPP"
            ? "Nothing is sent: you then download the files and open the WhatsApp chat yourself, with the message filled in."
            : "Nothing is sent: you then download the files to send them another way."}
        </p>
      </Modal>
    );
  }

  const kindsPresent = (["CATALOGUE", "PHOTO", "VIDEO"] as ContentKind[]).filter((k) => (items ?? []).some((a) => a.kind === k));
  const count = actions.countLabel;
  return (
    <Modal
      title={`Share content with ${target.name}`}
      onClose={close}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="ghost" icon="download" onClick={() => start("DOWNLOAD")} disabled={actions.downloadDisabled} title="Record the share and download the file, to send it another way">
            Share{count} by download
          </Button>
          <Button variant="primary" icon="wa" onClick={() => start("WHATSAPP")} disabled={actions.whatsappDisabled} title={wa.ok ? undefined : wa.message}>
            Share{count} on WhatsApp
          </Button>
        </>
      }
    >
      {!canShare && <p className="content-dialog-note" role="note">You don&apos;t have permission to share content.</p>}
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
            <SelectedContent selection={selection} onRemove={(id) => changeSelection(removeFromSelection(selection, id))} />
            {kindsPresent.length > 1 && (
              <FilterChips
                label="Filter content by kind"
                value={kind}
                onChange={setKind}
                options={[{ value: "ALL" as const, label: "All" }, ...kindsPresent.map((k) => ({ value: k, label: CONTENT_KIND_META[k].plural }))]}
              />
            )}
          </div>
          <ul className="content-pick" role="listbox" aria-multiselectable="true" aria-label="Content to share">
            {shown.map((a) => {
              const on = isSelected(selection, a);
              return (
                <li key={a.id}>
                  <button type="button" role="option" aria-selected={on} className={`content-pick-item ${on ? "on" : ""}`} onClick={() => changeSelection(toggleSelection(selection, a))}>
                    <ContentKindBadge kind={a.kind} />
                    <span className="content-pick-title">{a.title}</span>
                    <span className="content-pick-meta">
                      {on && <Icon name="check" size={14} />} v{a.currentVersion?.version ?? 1}
                      {a.currentVersion ? ` · ${formatFileSize(a.currentVersion.sizeBytes)}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && <li className="content-dialog-note">Nothing matches.</li>}
          </ul>
          {n > 0 && (
            <>
              <TextAreaField
                label="WhatsApp message"
                rows={3}
                value={message}
                maxLength={MESSAGE_MAX}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setMessageEdited(true);
                }}
                hint={n > 1 ? "Recorded with each share and filled into the WhatsApp chat." : "Recorded with the share and filled into the WhatsApp chat."}
              />
              {messageEdited && message !== suggested && (
                <button
                  type="button"
                  className="link-btn content-message-reset"
                  onClick={() => {
                    setMessage(suggestShort(target.name, selection));
                    setMessageEdited(false);
                  }}
                >
                  Use the suggested message for the selected items
                </button>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
}

/** Whether an item's preview shows its file (a photo, or a frame of a video) rather than its kind's icon. */
export function hasMediaPreview(asset: ContentAsset): boolean {
  return (asset.kind === "PHOTO" || asset.kind === "VIDEO") && !!asset.currentVersion;
}

/**
 * The picked items, under the search field. One item gets a larger preview (the photo, or the
 * video with its controls); several are listed compactly with thumbnails. Each can be unpicked here.
 */
export function SelectedContent({ selection, onRemove }: { selection: readonly ContentAsset[]; onRemove: (assetId: string) => void }) {
  const single = selection.length === 1 ? selection[0] : null;
  return (
    <section className={`content-selected${single ? " content-selected-single" : ""}`} aria-label="Selected content">
      <div className="content-selected-head">
        <b>{selection.length === 0 ? "Nothing selected" : `${selection.length} selected`}</b>
        {selection.length === 0 && <span>Choose one or more items below.</span>}
      </div>
      {single && (
        <div className="content-selected-large">
          <ContentThumb asset={single} size="large" />
          <div className="content-selected-row">
            <SelectedDetails asset={single} onRemove={onRemove} />
          </div>
        </div>
      )}
      {selection.length > 1 && (
        <ul className="content-selected-list">
          {selection.map((a) => (
            <li key={a.id} className="content-selected-item">
              <ContentThumb asset={a} size="small" />
              <SelectedDetails asset={a} onRemove={onRemove} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SelectedDetails({ asset: a, onRemove }: { asset: ContentAsset; onRemove: (assetId: string) => void }) {
  return (
    <>
      <span className="content-selected-text">
        <span className="content-selected-title">{a.title}</span>
        <span className="content-selected-meta">
          {CONTENT_KIND_META[a.kind].label} · v{a.currentVersion?.version ?? 1}
          {selectionFileName(a) ? ` · ${selectionFileName(a)}` : ""}
          {a.currentVersion ? ` · ${formatFileSize(a.currentVersion.sizeBytes)}` : ""}
        </span>
      </span>
      <button type="button" className="icon-btn sm" aria-label={`Remove ${a.title} from the selection`} title="Remove from the selection" onClick={() => onRemove(a.id)}>
        <Icon name="close" size={14} />
      </button>
    </>
  );
}

/**
 * An item's picture, from a signed, expiring inline URL of its current version: the photo, or the
 * video (only its opening bytes are fetched for a thumbnail; nothing plays until the person presses
 * play). If the media fails (e.g. the signature expired) the URL is renewed once; after that, or for
 * a catalogue, the kind's icon is shown.
 */
export function ContentThumb({ asset, size }: { asset: ContentAsset; size: "small" | "large" }) {
  const repo = useRepository();
  const [url, setUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const version = asset.currentVersion?.version;
  const media = hasMediaPreview(asset);

  useEffect(() => {
    if (!media) return;
    let alive = true;
    repo.content
      .accessUrl(asset.id, "inline", version)
      .then((a) => alive && setUrl(a.url))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [repo, asset.id, version, media, attempt]);

  const onError = () => (attempt === 0 ? setAttempt(1) : setFailed(true));
  return <ContentThumbView kind={asset.kind} size={size} title={asset.title} url={media && !failed ? url : null} onError={onError} />;
}

/** The picture itself: the photo or video when there is a URL for it, otherwise the kind's icon. */
export function ContentThumbView({ kind, size = "small", title = "", url, onError }: { kind: ContentKind; size?: "small" | "large"; title?: string; url: string | null; onError?: () => void }) {
  const large = size === "large";
  if (kind === "PHOTO" && url) {
    // eslint-disable-next-line @next/next/no-img-element -- a signed, expiring URL served by the backend
    return <img className={large ? "content-large-media" : "content-thumb"} src={url} alt={large ? title : ""} onError={onError} />;
  }
  if (kind === "VIDEO" && url) {
    return large ? (
      <video className="content-large-media" src={url} controls preload="metadata" playsInline aria-label={title} onError={onError}>
        Your browser can&apos;t play this video.
      </video>
    ) : (
      // a frame from the start of the video; muted, never played
      <video className="content-thumb" src={`${url}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} aria-hidden="true" onError={onError} />
    );
  }
  return (
    <span className={`${large ? "content-large-icon" : "content-thumb"} content-thumb-${kind.toLowerCase()}`} aria-hidden="true">
      <Icon name={CONTENT_KIND_META[kind].icon} size={large ? 40 : 18} />
    </span>
  );
}

const STATUS_TEXT: Record<ShareItemState["status"], string> = {
  pending: "Waiting",
  sharing: "Recording…",
  shared: "Shared",
  failed: "Not shared",
  unconfirmed: "Not confirmed",
  "not-attempted": "Not shared",
};

/** What happened to each item; downloads for the recorded ones, the WhatsApp step, and a retry for the rest. */
export function ShareResult({
  target,
  selection,
  results,
  channel,
  message,
  waUrl,
  busy,
  onRetry,
  onClose,
}: {
  target: ShareTarget;
  selection: readonly ContentAsset[];
  results: ShareBatchState;
  channel: ContentShareChannel;
  message: string;
  waUrl: string | null;
  busy: boolean;
  onRetry: () => void;
  onClose: () => void;
}) {
  const c = countBy(results);
  const remaining = c.notShared + c.unconfirmed;
  const where = target.type === "CUSTOMER" ? "customer's activity" : "lead's history";
  const chat = channel === "WHATSAPP" && waUrl && c.shared > 0 ? whatsappLinkWithText(waUrl, message) : null;
  const single = selection.length === 1 ? selection[0] : null;
  const singleState = single ? results[single.id] : undefined;
  const title = busy ? "Recording shares…" : c.shared === c.total ? "Shared" : c.shared === 0 ? "Not shared" : "Partly shared";

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          {!busy && remaining > 0 && (
            <Button variant="ghost" onClick={onRetry}>
              {remaining === 1 ? "Try again" : `Try the ${remaining} again`}
            </Button>
          )}
          <Button variant="primary" onClick={onClose} disabled={busy}>
            Done
          </Button>
        </>
      }
    >
      {single && singleState?.status === "shared" ? (
        <p className="content-dialog-note">
          Recorded: {CONTENT_KIND_META[single.kind].label.toLowerCase()} &ldquo;{single.title}&rdquo;, version {singleState.share.version}, shared with {target.name}. It is on the {where}.
        </p>
      ) : (
        <p className="content-dialog-note" aria-live="polite">
          {busy
            ? `Recording ${c.shared} of ${c.total}…`
            : `${c.shared} of ${c.total} recorded with ${target.name}${c.shared > 0 ? `; ${c.shared === 1 ? "it is" : "they are"} on the ${where}` : ""}.`}
        </p>
      )}
      <ol className="content-steps">
        <li>
          <ul className="content-result-list">
            {selection.map((a) => {
              const s = results[a.id] ?? { status: "pending" };
              return (
                <li key={a.id} className={`content-result content-result-${s.status}`}>
                  <span className="content-result-head">
                    <Icon name={s.status === "shared" ? "check" : s.status === "pending" || s.status === "sharing" ? "clock" : "alert"} size={14} />
                    <b>{a.title}</b>
                    <span className="content-pick-meta">
                      {s.status === "shared" ? `v${s.share.version}` : `v${a.currentVersion?.version ?? 1}`} · {STATUS_TEXT[s.status]}
                    </span>
                  </span>
                  {s.status === "shared" && s.download && (
                    <Button variant="ghost" icon="download" onClick={() => downloadFromUrl(s.download!.url, s.download!.fileName)}>
                      Download {s.download.fileName}
                    </Button>
                  )}
                  {s.status === "shared" && s.recovered && <span className="content-step-hint">Found in the item&apos;s history after the connection dropped.</span>}
                  {(s.status === "failed" || s.status === "unconfirmed" || s.status === "not-attempted") && (
                    <span role="alert" className="content-error">
                      {s.message}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {c.shared > 0 && <span className="content-step-hint">The download links work for 15 minutes.</span>}
        </li>
        {chat && !busy && (
          <li>
            <a className="btn primary" href={chat} target="_blank" rel="noopener noreferrer">
              <Icon name="wa" size={16} /> Open the WhatsApp chat
            </a>
            <span className="content-step-hint">
              The message is filled in; attach the downloaded {c.shared === 1 ? "file" : "files"} there.
              {remaining > 0 && " The message mentions every selected item: edit it there if you don't try the others again."}
            </span>
          </li>
        )}
      </ol>
    </Modal>
  );
}
