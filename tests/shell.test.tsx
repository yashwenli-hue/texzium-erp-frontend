import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

let pathname = "/quotations/q1";
const counts = { kind: "real", unreadNotificationsCount: 3, leadsCount: 4 } as Record<string, unknown>;

mock.module("next/navigation", {
  namedExports: { useRouter: () => ({ back: () => {}, push: () => {} }), usePathname: () => pathname },
});
mock.module(new URL("../lib/hooks/useLiveCounts.ts", import.meta.url).href, { namedExports: { useLiveCounts: () => counts } });
mock.module(new URL("../components/shell/UserMenu.tsx", import.meta.url).href, { namedExports: { UserMenu: () => null } });
mock.module(new URL("../components/shell/ThemeToggle.tsx", import.meta.url).href, { namedExports: { ThemeToggle: () => null } });
mock.module(new URL("../lib/auth/AuthContext.tsx", import.meta.url).href, {
  namedExports: { useAuth: () => ({ hasPermission: () => true }) },
});

const { Topbar } = await import("../components/shell/Topbar");
const { Sidebar } = await import("../components/shell/Sidebar");
const { AppShell } = await import("../components/shell/AppShell");

const html = (el: JSX.Element) => renderToStaticMarkup(el);
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("breadcrumb: a labelled nav whose parent is a real link and whose current page is marked", () => {
  pathname = "/quotations/q1";
  const out = html(<Topbar onMenuClick={() => {}} />);
  assert.match(out, /<nav class="crumb" aria-label="Breadcrumb">/);
  assert.match(out, /<a class="crumb-link" href="\/quotations">Quotations<\/a>/);
  assert.match(out, /<b aria-current="page">Quotation Details<\/b>/);
  assert.doesNotMatch(out, /cursor:pointer/);
});

test("topbar: menu button states whether the drawer is open, search is labelled, unread count is spoken", () => {
  const closed = html(<Topbar onMenuClick={() => {}} menuOpen={false} menuControls="app-nav" />);
  assert.match(closed, /aria-label="Open navigation" aria-expanded="false" aria-controls="app-nav"/);
  const open = html(<Topbar onMenuClick={() => {}} menuOpen menuControls="app-nav" />);
  assert.match(open, /aria-label="Close navigation" aria-expanded="true"/);
  assert.match(closed, /<input type="search" aria-label="Search RevenueOS"/);
  assert.match(closed, /aria-label="Notifications, 3 unread" href="\/notifications"/);
  // a search entry that exists where the topbar search box is hidden
  assert.match(closed, /class="icon-btn search-btn" aria-label="Search RevenueOS" href="\/search"/);
  assert.match(css, /@media\(max-width:860px\)\{\.topbar \.search\{display:none\}\.search-btn\{display:grid\}\}/);
});

test("sidebar: a navigation landmark, groups named by their label, the current page marked", () => {
  pathname = "/leads";
  const out = html(<Sidebar id="app-nav" mobileOpen={false} onNavigate={() => {}} collapsed={false} onToggleCollapsed={() => {}} />);
  assert.match(out, /<aside id="app-nav"/);
  assert.match(out, /<nav class="rail-scroll" aria-label="RevenueOS">/);
  assert.match(out, /role="group" aria-labelledby="nav-Quote-to-Cash"/);
  assert.match(out, /id="nav-Quote-to-Cash">Quote to Cash</);
  assert.match(out, /aria-current="page" href="\/leads"/);
  assert.doesNotMatch(out, /aria-current="[a-z]+" href="\/opportunities"/);
  // a detail page marks its list as the current location, not the current page
  pathname = "/leads/abc";
  assert.match(html(<Sidebar mobileOpen={false} onNavigate={() => {}} collapsed={false} onToggleCollapsed={() => {}} />), /aria-current="location" href="\/leads"/);
  // collapsed: the label is hidden, so the link carries it
  pathname = "/leads";
  const collapsed = html(<Sidebar mobileOpen={false} onNavigate={() => {}} collapsed onToggleCollapsed={() => {}} />);
  assert.match(collapsed, /aria-label="Opportunities" href="\/opportunities"/);
});

test("shell: a skip link to the focusable main region; the drawer scrim only exists while it is open", () => {
  const out = html(<AppShell><p>content</p></AppShell>);
  assert.match(out, /<a class="skip-link" href="#stage">Skip to content<\/a>/);
  assert.match(out, /<main id="stage" tabindex="-1">/);
  assert.doesNotMatch(out, /rail-scrim/);
  assert.match(css, /\.skip-link:focus\{top:10px\}/);
  // the scrim is a real element that takes the tap, not a box-shadow
  assert.doesNotMatch(css, /\.rail\.show\{[^}]*box-shadow:0 0 0 100vmax/);
  assert.match(css, /\.rail-scrim\{display:block;position:fixed;inset:0/);
});

test("a refused sign-in says so; only a request made with a session reads as an expired session", async () => {
  const { failure } = await import("../lib/api/httpClient");
  assert.equal(failure(401, undefined, false).message, "The email or password is incorrect, or this account can't sign in.");
  assert.equal(failure(401, undefined, true).message, "Your session has expired. Please sign in again.");
});

test("opening the drawer focuses a visible link (the hidden desktop collapse button is skipped)", () => {
  const shell = readFileSync(new URL("../components/shell/AppShell.tsx", import.meta.url), "utf8");
  assert.match(shell, /filter\(\(el\) => el\.offsetParent !== null\)/);
  assert.match(shell, /visible\.find\(\(el\) => el\.getAttribute\("aria-current"\)\) \?\? visible\[0\]/);
});
