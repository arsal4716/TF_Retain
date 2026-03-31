const { chromium } = require("playwright");

let browser;
let context;

async function init() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
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

function isRealRetainedText(text) {
  const t = normalize(text).toLowerCase();
  return (
    t.includes("you've retained this certificate") ||
    t.includes("you have retained this certificate") ||
    t.includes("certificate has been retained") ||
    t.includes("already retained")
  );
}

function isUnretainedText(text) {
  return normalize(text).toLowerCase().includes("unretained certificate");
}

function getBestMessage(text) {
  const t = normalize(text);

  if (!t) return "Unknown response";
  if (/you've retained this certificate/i.test(t)) return "Retained";
  if (/you have retained this certificate/i.test(t)) return "Retained";
  if (/certificate has been retained/i.test(t)) return "Retained";
  if (/already retained/i.test(t)) return "Already retained";
  if (/unretained certificate/i.test(t)) return "Unretained certificate";

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
  await page.waitForTimeout(4000);

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
  console.log("Body preview:", bodyText.slice(0, 500));

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
    console.log("After login body:", bodyText.slice(0, 500));
  }

  return { bodyText, currentUrl };
}

async function clickReloadIfPresent(page) {
  const reloadSelectors = [
    'a:has-text("Click here to reload")',
    'button:has-text("Click here to reload")',
    'a:has-text("reload")',
  ];

  for (const selector of reloadSelectors) {
    const locator = page.locator(selector).first();
    if (!(await locator.count())) continue;

    const visible = await locator.isVisible().catch(() => false);
    if (!visible) continue;

    console.log("Reload link found:", selector);

    try {
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await locator.click({ timeout: 5000 });
    } catch {
      try {
        await locator.click({ force: true, timeout: 5000 });
      } catch {
        await locator.evaluate((el) => el.click());
      }
    }

    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(3000);

    return true;
  }

  return false;
}

async function clickRetainIfPresent(page) {
  const selectors = [
    "button.retain-cert-button.confirm-button",
    ".retain-cert-button.confirm-button",
    ".retain-cert-button",
    'button:has-text("Retain Certificate")',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count();
    if (!count) continue;

    const visible = await locator.isVisible().catch(() => false);
    if (!visible) continue;

    console.log("Retain button found:", selector);

    try {
      await locator.waitFor({ state: "visible", timeout: 10000 });
    } catch {}

    try {
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(300);

      // check if enabled
      const disabled = await locator.isDisabled().catch(() => false);
      console.log("Retain button disabled:", disabled);

      if (disabled) {
        continue;
      }

      // try normal click
      await locator.click({ timeout: 5000 });
      console.log("Retain button clicked with normal click");
      return true;
    } catch (err1) {
      console.log("Normal click failed:", err1.message);
    }

    try {
      await locator.click({ force: true, timeout: 5000 });
      console.log("Retain button clicked with force click");
      return true;
    } catch (err2) {
      console.log("Force click failed:", err2.message);
    }

    try {
      await locator.evaluate((el) => {
        el.scrollIntoView({ block: "center", inline: "center" });
        el.click();
      });
      console.log("Retain button clicked with JS evaluate click");
      return true;
    } catch (err3) {
      console.log("JS click failed:", err3.message);
    }
  }

  return false;
}

async function waitForFinalRetainState(page, certificateUrl) {
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(2000);

    let bodyText = await getBodyText(page);
    console.log(`Retain state check ${i + 1}:`, bodyText.slice(0, 500));

    if (isRealRetainedText(bodyText)) {
      return {
        success: true,
        message: getBestMessage(bodyText),
      };
    }

    if (/click here to reload/i.test(bodyText)) {
      console.log("Reload requested by page after click...");
      await clickReloadIfPresent(page);
      bodyText = await getBodyText(page);

      if (isRealRetainedText(bodyText)) {
        return {
          success: true,
          message: getBestMessage(bodyText),
        };
      }
    }

    // if still unretained, retry one more click during polling
    if (isUnretainedText(bodyText)) {
      const clickedAgain = await clickRetainIfPresent(page);
      if (clickedAgain) {
        console.log("Retain re-click attempted during polling");
      }
    }
  }

  const finalText = await getBodyText(page);

  if (isRealRetainedText(finalText)) {
    return {
      success: true,
      message: getBestMessage(finalText),
    };
  }

  if (isUnretainedText(finalText)) {
    return {
      success: false,
      message: "Certificate still unretained after click attempt",
    };
  }

  return {
    success: false,
    message: getBestMessage(finalText) || "No retained confirmation found",
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

    if (isRealRetainedText(bodyText)) {
      return {
        success: true,
        message: getBestMessage(bodyText),
      };
    }

    // very important: TF often asks to reload after match before retain flow settles
    if (/click here to reload/i.test(bodyText)) {
      console.log("Page asks for reload before retain");
      await clickReloadIfPresent(page);
      bodyText = await getBodyText(page);
      console.log("After reload body:", bodyText.slice(0, 500));

      if (isRealRetainedText(bodyText)) {
        return {
          success: true,
          message: getBestMessage(bodyText),
        };
      }
    }

    const clicked = await clickRetainIfPresent(page);

    if (!clicked) {
      bodyText = await getBodyText(page);
      return {
        success: false,
        message: "Retain button found but not clicked",
      };
    }

    const result = await waitForFinalRetainState(page, url);
    console.log("Final retain result:", result);

    return result;
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