"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { CONTENT_KIND_META, ContentKind } from "../../lib/types/domain";

/** The kind of a content item, with its icon. */
export function ContentKindBadge({ kind }: { kind: ContentKind }) {
  const meta = CONTENT_KIND_META[kind];
  return (
    <span className="content-kind">
      <Icon name={meta.icon} size={14} />
      {meta.label}
    </span>
  );
}

/**
 * Starts a download from a signed URL. The backend answers it with
 * Content-Disposition: attachment, so the browser saves the file and the page stays.
 */
export function downloadFromUrl(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Asks for a signed download URL and starts the download. */
export function useContentDownload() {
  const repo = useRepository();
  return useCallback(
    async (assetId: string, version?: number) => {
      const access = await repo.content.accessUrl(assetId, "attachment", version);
      downloadFromUrl(access.url, access.fileName);
    },
    [repo]
  );
}

/**
 * Shows one version of a content item inline: a photo, a playable video (the backend
 * answers byte ranges, so it can be seeked) or a PDF. The URL is signed and expires
 * after 15 minutes; it is renewed before it does, and once more if the media fails.
 */
export function ContentPreview({ assetId, kind, version, title }: { assetId: string; kind: ContentKind; version?: number; title: string }) {
  const repo = useRepository();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const retried = useRef(false);

  const load = useCallback(() => {
    setError(null);
    return repo.content
      .accessUrl(assetId, "inline", version)
      .then((access) => {
        setUrl(access.url);
        return new Date(access.expiresAt).getTime();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "The preview couldn't be loaded.");
        return null;
      });
  }, [repo, assetId, version]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    retried.current = false;
    const schedule = (expires: number | null) => {
      if (!alive || expires === null) return;
      // renew a minute before the signature expires (a playing video keeps its position)
      timer = setTimeout(() => void load().then(schedule), Math.max(30_000, expires - Date.now() - 60_000));
    };
    void load().then(schedule);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [load]);

  const onMediaError = () => {
    if (retried.current) {
      setError("The file couldn't be shown. Try downloading it.");
      return;
    }
    retried.current = true;
    void load();
  };

  if (error) {
    return (
      <p role="alert" className="content-preview-error">
        {error}
      </p>
    );
  }
  if (!url) return <div className="skeleton content-preview-box" aria-label="Loading preview" />;

  return (
    <div className="content-preview">
      {kind === "PHOTO" && (
        // eslint-disable-next-line @next/next/no-img-element -- a signed, expiring URL served by the backend
        <img src={url} alt={title} onError={onMediaError} />
      )}
      {kind === "VIDEO" && (
        <video src={url} controls preload="metadata" playsInline onError={onMediaError}>
          Your browser can&apos;t play this video. Download it instead.
        </video>
      )}
      {kind === "CATALOGUE" && (
        <>
          <iframe src={url} title={title} />
          <a className="btn ghost sm" href={url} target="_blank" rel="noopener noreferrer">
            <Icon name="file" size={14} /> Open the PDF in a new tab
          </a>
        </>
      )}
    </div>
  );
}
