const { chromium } = require("playwright");

let browser;
let context;

async function init() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      slowMo: 300,
    });

    context = await browser.newContext();
    console.log("Playwright browser started");
  }
}

async function getBodyText(page) {
  try {
    const txt = await page.locator("body").innerText();
    return (txt || "").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

function normalize(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function isRetainedSuccessText(text) {
  const t = normalize(text).toLowerCase();

  return (
    t.includes("you've retained") ||
    t.includes("you have retained") ||
    t.includes("certificate retained") ||
    t.includes("certificate has been retained") ||
    t.includes("already retained") ||
    t.includes("retained certificate") ||
    t.includes("certificate was retained")
  );
}

function isLoginRequiredText(text) {
  const t = normalize(text).toLowerCase();

  return (
    (t.includes("please log in") && t.includes("retain this certificate")) ||
    t.includes("business email address") ||
    t.includes("password is required")
  );
}

function getBestMessage(text) {
  const t = normalize(text);

  if (!t) return "Unknown response";
  if (/you've retained/i.test(t)) return "Retained";
  if (/you have retained/i.test(t)) return "Retained";
  if (/certificate retained/i.test(t)) return "Retained";
  if (/certificate has been retained/i.test(t)) return "Retained";
  if (/already retained/i.test(t)) return "Already retained";
  if (/please log in/i.test(t) && /retain this certificate/i.test(t)) {
    return "Login required before retain";
  }

  return t.slice(0, 300);
}

async function doLogin(page) {
  console.log("Logging in...");

  await page.waitForLoadState("domcontentloaded", { timeout: 60000 }).catch(() => {});

  const usernameInput = page.locator('#username, input[name="username"]').first();
  const passwordInput = page.locator('#password, input[name="password"]').first();

  await usernameInput.waitFor({ state: "visible", timeout: 60000 });
  await passwordInput.waitFor({ state: "visible", timeout: 60000 });

  await usernameInput.fill(process.env.TF_EMAIL);
  await passwordInput.fill(process.env.TF_PASSWORD);

  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);

  console.log("Login submitted");
}

async function ensureLoggedInForCertificate(page, certificateUrl) {
  await page.goto(certificateUrl, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });

  await page.waitForTimeout(3000);

  let bodyText = await getBodyText(page);
  let currentUrl = page.url();

  console.log("Current URL:", currentUrl);
  console.log("Body preview:", bodyText.slice(0, 300));

  const onAuthLoginPage =
    currentUrl.includes("auth.activeprospect.com") ||
    currentUrl.includes("/u/login");

  const hasUsernameField =
    (await page.locator('#username, input[name="username"]').count()) > 0;
  const hasPasswordField =
    (await page.locator('#password, input[name="password"]').count()) > 0;

  if (onAuthLoginPage || (hasUsernameField && hasPasswordField)) {
    console.log("Auth login page detected");

    await doLogin(page);

    await page.goto(certificateUrl, {
      waitUntil: "domcontentloaded",
      timeout: 180000,
    });

    await page.waitForTimeout(5000);

    bodyText = await getBodyText(page);
    currentUrl = page.url();

    console.log("Returned after login:", currentUrl);
    console.log("After login body:", bodyText.slice(0, 300));

    return { bodyText, currentUrl };
  }

  const loginLink = page.locator('a:has-text("log in")').first();

  if ((await loginLink.count()) > 0 && isLoginRequiredText(bodyText)) {
    console.log("Login link found on certificate page");

    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      loginLink.click(),
    ]);

    await newPage.waitForLoadState("domcontentloaded", { timeout: 60000 }).catch(() => {});
    await doLogin(newPage);

    try {
      await newPage.close();
    } catch {}

    await page.bringToFront();

    await page.goto(certificateUrl, {
      waitUntil: "domcontentloaded",
      timeout: 180000,
    });

    await page.waitForTimeout(5000);

    bodyText = await getBodyText(page);
    currentUrl = page.url();

    console.log("Returned after popup login:", currentUrl);
    console.log("After popup login body:", bodyText.slice(0, 300));

    return { bodyText, currentUrl };
  }

  return { bodyText, currentUrl };
}

async function clickRetainIfPresent(page) {
  const selectors = [
    ".retain-cert-button",
    'button:has-text("Retain Certificate")',
    'button:has-text("Retain")',
    'input[value*="Retain"]',
    'a:has-text("Retain Certificate")',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count();

    if (!count) continue;

    const visible = await locator.isVisible().catch(() => false);
    if (!visible) continue;

    console.log("Retain button found:", selector);

    await locator.click({ timeout: 10000 }).catch(async () => {
      await locator.click({ force: true });
    });

    return true;
  }

  return false;
}

async function waitForRetainResult(page) {
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(2000);

    const bodyText = await getBodyText(page);
    const currentUrl = page.url();

    console.log(`Retain check ${i + 1}:`, bodyText.slice(0, 250));

    if (isRetainedSuccessText(bodyText)) {
      return {
        success: true,
        message: getBestMessage(bodyText),
        bodyText,
        currentUrl,
      };
    }

    if (isLoginRequiredText(bodyText)) {
      return {
        success: false,
        message: "Login required before retain",
        bodyText,
        currentUrl,
      };
    }
  }

  const bodyText = await getBodyText(page);
  const currentUrl = page.url();

  return {
    success: false,
    message: getBestMessage(bodyText) || "No retained confirmation found",
    bodyText,
    currentUrl,
  };
}

module.exports = async (url) => {
  await init();
  const page = await context.newPage();

  try {
    console.log("Opening certificate:", url);

    let { bodyText, currentUrl } = await ensureLoggedInForCertificate(page, url);

    const stillOnLogin =
      currentUrl.includes("auth.activeprospect.com") ||
      currentUrl.includes("/u/login") ||
      (
        (await page.locator('#username, input[name="username"]').count()) > 0 &&
        (await page.locator('#password, input[name="password"]').count()) > 0
      );

    if (stillOnLogin) {
      return {
        success: false,
        message: "Login did not complete",
      };
    }

    if (isRetainedSuccessText(bodyText)) {
      return {
        success: true,
        message: getBestMessage(bodyText),
      };
    }

    if (isLoginRequiredText(bodyText)) {
      return {
        success: false,
        message: "Login required before retain",
      };
    }

    const clicked = await clickRetainIfPresent(page);

    if (!clicked) {
      bodyText = await getBodyText(page);
      return {
        success: false,
        message: getBestMessage(bodyText) || "Retain button not found",
      };
    }

    const result = await waitForRetainResult(page);

    console.log("Final retain result:", result);

    return {
      success: result.success,
      message: result.message,
    };
  } catch (err) {
    console.error("Playwright error:", err);

    return {
      success: false,
      message: err.message || "Automation failed",
    };
  } finally {
    await page.close().catch(() => {});
  }
};