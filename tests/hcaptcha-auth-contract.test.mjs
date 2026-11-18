import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const loginPage = await readFile(
  new URL("../src/app/(auth)/login/page.tsx", import.meta.url),
  "utf8",
);
const widget = await readFile(
  new URL("../src/components/HCaptchaWidget.tsx", import.meta.url),
  "utf8",
);
const csp = await readFile(new URL("../src/lib/csp.ts", import.meta.url), "utf8");

test("hCaptcha is required and passed to password, signup, reset and magic-link auth calls", () => {
  assert.match(loginPage, /if \(captchaRequired && !captchaSiteKey\)/);
  assert.match(loginPage, /if \(captchaRequired && !captchaToken\)/);
  assert.match(loginPage, /captchaToken: captchaToken \|\| undefined/);
  assert.match(
    loginPage,
    /const changeMode = useCallback\(\(nextMode: LoginMode\) => \{\s*if \(nextMode === modeRef\.current\) return;\s*modeRef\.current = nextMode;\s*setCaptchaToken\(null\);\s*setCaptchaResetKey\(\(value\) => value \+ 1\);\s*setMode\(nextMode\);\s*\}, \[\]\);/,
    "changing auth modes clears the token and resets the widget before updating the mode",
  );
  assert.equal(
    (loginPage.match(/setMode\(/g) || []).length,
    1,
    "all auth mode transitions go through the CAPTCHA reset handler",
  );

  for (const authCall of [
    "signInWithPassword",
    "signUp",
    "resetPasswordForEmail",
    "signInWithOtp",
  ]) {
    const callIndex = loginPage.indexOf(`supabase.auth.${authCall}`);
    assert.notEqual(callIndex, -1, `${authCall} is wired`);
    const callEnd = loginPage.indexOf("\n                });", callIndex);
    const call = loginPage.slice(callIndex, callEnd === -1 ? callIndex + 700 : callEnd);
    assert.match(call, /captchaToken/, `${authCall} receives the CAPTCHA token`);
  }
});

test("hCaptcha widget uses only the public sitekey and CSP allows its required hosts", () => {
  assert.match(widget, /NEXT_PUBLIC_CAPTCHA_SITE_KEY/);
  assert.doesNotMatch(widget, /CAPTCHA_SECRET|SERVICE_ROLE|sb_secret_/i);
  assert.match(widget, /render=explicit/);
  assert.match(widget, /"error-callback": \(code\) =>/);
  assert.match(widget, /errorMessages\[code\]/);
  assert.match(widget, /network-error/);
  assert.match(widget, /invalid-data/);
  assert.match(widget, /renderAttemptedRef\.current/);
  assert.match(widget, /widgetIdRef\.current !== null/);
  assert.match(widget, /hcaptcha\.render\([\s\S]*?catch \(error\)/);
  assert.match(csp, /frame-src 'self' https:\/\/hcaptcha\.com https:\/\/\*\.hcaptcha\.com/);
  assert.match(csp, /connect\.push\("https:\/\/hcaptcha\.com", "https:\/\/\*\.hcaptcha\.com"\)/);
});

test("signup enters onboarding when Supabase returns a session and otherwise asks for email confirmation", () => {
  const signupBlock = loginPage.slice(
    loginPage.indexOf('if (mode === "signup")'),
    loginPage.indexOf('if (mode === "mfa")'),
  );
  assert.match(signupBlock, /const \{ data, error \} = await supabase\.auth\.signUp/);
  assert.match(signupBlock, /if \(data\.session\) \{\s*await finishLogin\(\);\s*return;/);
  assert.match(signupBlock, /setPassword\(""\)/);
  assert.match(signupBlock, /auth\.accountCreated/);
});
