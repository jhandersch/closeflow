import assert from "node:assert/strict";
import test from "node:test";

import { hasUnsupportedProfileAvatarUrl } from "../src/lib/profileAvatar.ts";

test("profile avatar URL guard allows clearing the avatar", () => {
  assert.equal(hasUnsupportedProfileAvatarUrl(""), false);
  assert.equal(hasUnsupportedProfileAvatarUrl(" \t "), false);
  assert.equal(hasUnsupportedProfileAvatarUrl(null), false);
  assert.equal(hasUnsupportedProfileAvatarUrl(undefined), false);
});

test("profile avatar URL guard rejects non-empty values", () => {
  assert.equal(
    hasUnsupportedProfileAvatarUrl("https://images.example/avatar.png"),
    true,
  );
  assert.equal(hasUnsupportedProfileAvatarUrl("data:image/png;base64,abc"), true);
  assert.equal(hasUnsupportedProfileAvatarUrl("/avatars/local.png"), true);
});
