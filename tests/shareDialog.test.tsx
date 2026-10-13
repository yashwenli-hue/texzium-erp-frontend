import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { ShareBatchState } from "../lib/content/shareBatch";
import { PDF, PHOTO, VIDEO } from "./helpers/fixtures";

// The dialog's pieces rendered to HTML (no browser). The library repository is replaced: rendering
// on the server runs no effects, so nothing is fetched.
mock.module(new URL("../lib/repository/RepositoryProvider.tsx", import.meta.url).href, { namedExports: { useRepository: () => ({}) } });
const { ContentThumbView, SelectedContent, ShareResult, hasMediaPreview } = await import("../components/content/ShareContentDialog");

const TARGET = { type: "LEAD" as const, id: "lead-1", name: "Testing Lead", phone: "9876543210", country: "IN" };
const WA = "https://wa.me/919876543210";
const MSG = "Hello Testing Lead, please find our video “Super High Speed Needle Loom 10/27G”.";
const shared = (assetId: string, version = 1) => ({
  status: "shared" as const, recovered: false,
  share: { id: `s-${assetId}`, assetId, fileId: `${assetId}-v${version}`, version, targetType: "LEAD" as const, lead: { id: "lead-1", customerName: "Testing Lead", leadCode: null }, opportunity: null, customer: null, channel: "WHATSAPP" as const, recipientName: "Testing Lead", recipientPhone: null, message: MSG, actor: null, createdAt: new Date().toISOString() },
  download: { url: `/api/backend/content-files/${assetId}?sig=x`, expiresAt: "", fileId: `${assetId}-v${version}`, version, mimeType: "", fileName: `${assetId}-v${version}.bin` },
});
const html = (el: JSX.Element) => renderToStaticMarkup(el);
const noop = () => {};

test("photo preview: a thumbnail of the photo itself", () => {
  const out = html(<ContentThumbView kind="PHOTO" url="/api/backend/content-files/p?sig=1" />);
  assert.match(out, /^<img class="content-thumb" src="\/api\/backend\/content-files\/p\?sig=1" alt=""\/>$/);
  assert.match(html(<ContentThumbView kind="PHOTO" url={null} />), /content-thumb-photo/, "icon until the signed URL arrives");
});

test("video thumbnail: a frame from the start of the video, never played, no controls", () => {
  const out = html(<ContentThumbView kind="VIDEO" url="/api/backend/content-files/v?sig=1" />);
  assert.match(out, /^<video class="content-thumb" src="\/api\/backend\/content-files\/v\?sig=1#t=0\.1" preload="metadata"[^>]*aria-hidden="true"[^>]*><\/video>$/);
  assert.doesNotMatch(out, /controls|autoplay/i);
  assert.match(html(<ContentThumbView kind="VIDEO" url={null} />), /content-thumb content-thumb-video/, "icon until the signed URL arrives");
});

test("catalogue (PDF): its kind's icon, small or large", () => {
  assert.match(html(<ContentThumbView kind="CATALOGUE" url="/ignored" />), /content-thumb content-thumb-catalogue/);
  const large = html(<ContentThumbView kind="CATALOGUE" size="large" url={null} />);
  assert.match(large, /content-large-icon content-thumb-catalogue/);
  assert.doesNotMatch(large, /<img|<video|<iframe/);
});

test("large previews: the photo itself, or the video with controls that plays only when asked", () => {
  const photo = html(<ContentThumbView kind="PHOTO" size="large" title="DH-4" url="/p?sig=1" />);
  assert.match(photo, /^<img class="content-large-media" src="\/p\?sig=1" alt="DH-4"\/>$/);
  const video = html(<ContentThumbView kind="VIDEO" size="large" title="Loom" url="/v?sig=1" />);
  assert.match(video, /^<video class="content-large-media" src="\/v\?sig=1" controls="" preload="metadata"[^>]*aria-label="Loom"/);
  assert.doesNotMatch(video, /autoplay|#t=/i);
});

test("only photos and videos fetch a picture of the file", () => {
  assert.equal(hasMediaPreview(PHOTO), true);
  assert.equal(hasMediaPreview(VIDEO), true);
  assert.equal(hasMediaPreview(PDF), false);
  assert.equal(hasMediaPreview({ ...VIDEO, currentVersion: null }), false);
});

test("one item selected: the larger preview, with its details and remove button", () => {
  const out = html(<SelectedContent selection={[VIDEO]} onRemove={noop} />);
  assert.match(out, /class="content-selected content-selected-single"/);
  assert.match(out, /<b>1 selected<\/b>/);
  assert.match(out, /content-selected-large/);
  assert.match(out, /content-large-icon content-thumb-video/, "large placeholder until the signed URL arrives");
  assert.doesNotMatch(out, /content-selected-list/, "no compact list for one item");
  assert.ok(out.includes(`aria-label="Remove ${VIDEO.title} from the selection"`));
  assert.match(out, /Video · v1 · loom\.mp4/);
});

test("the preview lists every selected item with its title, kind, version, file and a remove button", () => {
  const out = html(<SelectedContent selection={[VIDEO, PHOTO, PDF]} onRemove={noop} />);
  assert.match(out, /<b>3 selected<\/b>/);
  assert.match(out, /class="content-selected"/, "several items: the compact list, not the large preview");
  assert.doesNotMatch(out, /content-selected-large|content-large-/);
  for (const [a, file] of [[VIDEO, "loom.mp4"], [PHOTO, "dh4.jpg"], [PDF, "braiding.pdf"]] as const) {
    assert.ok(out.includes(a.title), a.title);
    assert.ok(out.includes(file), file);
    assert.ok(out.includes(`aria-label="Remove ${a.title} from the selection"`), `remove ${a.title}`);
  }
  assert.match(out, /Video · v1 · loom\.mp4 · 116(\.\d)? MB/);
  assert.match(out, /Catalogue · v1/);
});

test("the preview stays in place with nothing selected", () => {
  const out = html(<SelectedContent selection={[]} onRemove={noop} />);
  assert.match(out, /aria-label="Selected content"/);
  assert.match(out, /Nothing selected/);
  assert.match(out, /Choose one or more items below/);
});

test("one item shared: the same confirmation as before, with its download and the WhatsApp step", () => {
  const out = html(<ShareResult target={TARGET} selection={[VIDEO]} results={{ "a-video": shared("a-video") }} channel="WHATSAPP" message={MSG} waUrl={WA} busy={false} onRetry={noop} onClose={noop} />);
  assert.ok(out.includes("Recorded: video “Super High Speed Needle Loom 10/27G”, version 1, shared with Testing Lead. It is on the lead&#x27;s history."), out);
  assert.match(out, />Shared</);
  assert.match(out, /Download a-video-v1\.bin/);
  assert.match(out, /<a class="btn primary" href="https:\/\/wa\.me\/919876543210\?text=Hello%20Testing%20Lead[^"]*" target="_blank" rel="noopener noreferrer">/);
  assert.doesNotMatch(out, /Try/);
});

test("partly shared: each item's outcome, downloads only for recorded ones, and a retry for the rest", () => {
  const results: ShareBatchState = {
    "a-video": shared("a-video"),
    "a-photo": { status: "failed", message: "Archived content can’t be shared. Restore it first.", refused: true },
    "a-pdf": { status: "unconfirmed", message: "No answer. It may have been recorded; it will be checked before it is tried again." },
  };
  const out = html(<ShareResult target={TARGET} selection={[VIDEO, PHOTO, PDF]} results={results} channel="WHATSAPP" message={MSG} waUrl={WA} busy={false} onRetry={noop} onClose={noop} />);
  assert.match(out, />Partly shared</);
  assert.match(out, /1 of 3 recorded with Testing Lead; it is on the lead&#x27;s history\./);
  assert.equal((out.match(/Download /g) ?? []).length, 1, "one download, for the recorded item");
  assert.ok(out.includes("Archived content can’t be shared. Restore it first."));
  assert.match(out, /Not confirmed/);
  assert.match(out, /Try the 2 again/);
  assert.match(out, /The message mentions every selected item/);
});

test("nothing shared: no WhatsApp step; and a download share never offers one", () => {
  const failed: ShareBatchState = { "a-video": { status: "failed", message: "Lead not found.", refused: true } };
  const none = html(<ShareResult target={TARGET} selection={[VIDEO]} results={failed} channel="WHATSAPP" message={MSG} waUrl={WA} busy={false} onRetry={noop} onClose={noop} />);
  assert.match(none, />Not shared</);
  assert.doesNotMatch(none, /wa\.me/);
  const download = html(<ShareResult target={TARGET} selection={[VIDEO]} results={{ "a-video": shared("a-video") }} channel="DOWNLOAD" message={MSG} waUrl={WA} busy={false} onRetry={noop} onClose={noop} />);
  assert.doesNotMatch(download, /wa\.me/);
});

test("while recording: progress shown, nothing to retry yet, Done disabled", () => {
  const out = html(<ShareResult target={TARGET} selection={[VIDEO, PHOTO]} results={{ "a-video": shared("a-video"), "a-photo": { status: "sharing" } }} channel="WHATSAPP" message={MSG} waUrl={WA} busy={true} onRetry={noop} onClose={noop} />);
  assert.match(out, /Recording shares…/);
  assert.match(out, /Recording 1 of 2…/);
  assert.doesNotMatch(out, /wa\.me|Try/);
  assert.match(out, /<button[^>]*disabled=""[^>]*>Done<\/button>/);
});

test("WhatsApp is only ever a link the person opens: nothing navigates or sends by itself", () => {
  const dialog = readFileSync(new URL("../components/content/ShareContentDialog.tsx", import.meta.url), "utf8");
  const batch = readFileSync(new URL("../lib/content/shareBatch.ts", import.meta.url), "utf8");
  for (const src of [dialog, batch]) {
    assert.doesNotMatch(src, /window\.open|location\.(assign|replace|href\s*=)|\.click\(\)|fetch\(|autoPlay|\.play\(\)/);
  }
  // the only calls the batch makes are the backend's share, share history and signed download URL
  assert.deepEqual([...batch.matchAll(/api\.(\w+)\(/g)].map((m) => m[1]).sort(), ["accessUrl", "listShares", "share"]);
});
