import { test } from "node:test";
import assert from "node:assert/strict";
import { filterContent, isSelected, removeFromSelection, selectionKey, shareActionState, suggestedShareMessage, toggleSelection } from "../lib/content/shareSelection";
import { asset, PDF, PHOTO, VIDEO } from "./helpers/fixtures";

test("selecting several items keeps the order they were picked in", () => {
  let sel = toggleSelection([], VIDEO);
  sel = toggleSelection(sel, PHOTO);
  sel = toggleSelection(sel, PDF);
  assert.deepEqual(sel.map((a) => a.id), ["a-video", "a-photo", "a-pdf"]);
});

test("the same item can't be selected twice: picking it again unpicks it", () => {
  const sel = toggleSelection(toggleSelection([VIDEO], PHOTO), VIDEO);
  assert.deepEqual(sel.map((a) => a.id), ["a-photo"]);
  // even a second copy of the same item (e.g. the list reloaded) counts as the same item
  const again = toggleSelection([VIDEO], { ...VIDEO });
  assert.equal(again.length, 0);
  assert.equal(selectionKey(VIDEO), "a-video@1");
  assert.equal(selectionKey(asset("x", "VIDEO", "X", { version: 3 })), "x@3");
});

test("removing an item from the preview takes it out of the selection only", () => {
  const sel = removeFromSelection([VIDEO, PHOTO, PDF], "a-photo");
  assert.deepEqual(sel.map((a) => a.id), ["a-video", "a-pdf"]);
  assert.deepEqual(removeFromSelection(sel, "not-there").map((a) => a.id), ["a-video", "a-pdf"]);
});

test("searching and filtering change the list, never the selection", () => {
  const items = [VIDEO, PDF, PHOTO];
  const sel = [VIDEO, PHOTO];
  assert.deepEqual(filterContent(items, "braid", "ALL").map((a) => a.id), ["a-pdf"]);
  assert.deepEqual(filterContent(items, "", "PHOTO").map((a) => a.id), ["a-photo"]);
  assert.deepEqual(filterContent(items, "coiling", "VIDEO"), []);
  // items hidden by a filter stay selected (and stay in the preview)
  assert.ok(isSelected(sel, VIDEO) && isSelected(sel, PHOTO));
  assert.deepEqual(toggleSelection(sel, filterContent(items, "braid", "ALL")[0]).map((a) => a.id), ["a-video", "a-photo", "a-pdf"]);
});

test("one item gets the same suggested message as before", () => {
  assert.equal(suggestedShareMessage("Testing Lead", [VIDEO]), "Hello Testing Lead, please find our video “Super High Speed Needle Loom 10/27G”.");
});

test("several items are all named in the suggested message", () => {
  assert.equal(
    suggestedShareMessage("Asha", [VIDEO, PHOTO, PDF]),
    "Hello Asha, please find our video “Super High Speed Needle Loom 10/27G”, photo “DH-4 Donghong Coiling Machine S2 Type” and catalogue “32/2 Braiding Machine”."
  );
  assert.equal(suggestedShareMessage("Asha", []), "");
});

test("the same permission and recipient rules apply to one item or many", () => {
  assert.deepEqual(shareActionState({ count: 0, canShare: true, whatsappOk: true }), { downloadDisabled: true, whatsappDisabled: true, needsConfirmation: false, countLabel: "" });
  assert.deepEqual(shareActionState({ count: 1, canShare: true, whatsappOk: true }), { downloadDisabled: false, whatsappDisabled: false, needsConfirmation: false, countLabel: "" });
  for (const count of [1, 3]) {
    const noPermission = shareActionState({ count, canShare: false, whatsappOk: true });
    assert.equal(noPermission.downloadDisabled, true);
    assert.equal(noPermission.whatsappDisabled, true);
    const noNumber = shareActionState({ count, canShare: true, whatsappOk: false });
    assert.equal(noNumber.whatsappDisabled, true, "WhatsApp needs a usable number");
    assert.equal(noNumber.downloadDisabled, false, "download stays open");
  }
  const three = shareActionState({ count: 3, canShare: true, whatsappOk: true });
  assert.equal(three.needsConfirmation, true, "several permanent shares are confirmed first");
  assert.equal(three.countLabel, " 3");
});
