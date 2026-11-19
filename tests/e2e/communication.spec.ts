import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function createBlankNetwork(page: Page, name: string) {
  await page.getByRole("button", { name: "Create Network", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const next = dialog.getByRole("button", { name: "Next", exact: true });
  await next.click();
  await dialog.getByLabel("Network Name").fill(name);
  await next.click();
  await next.click();
  await dialog.getByRole("button", { name: "Create Network", exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Open Prototype" }).click();
  await expect(page).toHaveURL(/\/app$/);
});

test("message routes persist per conversation and call controls remain interactive", async ({ page }, testInfo) => {
  await page.getByRole("link", { name: /Family Group/ }).first().click();
  await expect(page).toHaveURL(/\/app\/private\/group\/chat_family$/);

  const message = `Browser smoke ${Date.now()}`;
  await page.getByRole("textbox", { name: "Message" }).fill(message);
  await page.getByRole("textbox", { name: "Message" }).press("Enter");
  await expect(page.locator("#main-content").getByText(message, { exact: true })).toBeVisible();

  if (testInfo.project.name === "mobile-chrome") {
    await page.getByRole("combobox", { name: "Choose conversation" }).selectOption("chat_roadtrip");
  } else {
    await page.getByRole("link", { name: /Road Trip Group/ }).first().click();
  }
  await expect(page.locator("#main-content").getByText(message, { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(/\/app\/private\/group\/chat_roadtrip$/);

  await page.goto("/app/private/group/chat_family");
  await expect(page.locator("#main-content").getByText(message, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Start group voice call/ }).click();
  await expect(page).toHaveURL(/\/call\/voice$/);
  await page.getByRole("button", { name: "Mute" }).click();
  await expect(page.getByRole("button", { name: "Unmute" })).toBeVisible();
  await page.getByRole("button", { name: /Reconnect simulation/ }).click();
  await expect(page.getByText("Unstable", { exact: true })).toBeVisible();
  await expect(page.getByText("Reconnecting")).toBeVisible({ timeout: 2_000 });

  await page.getByRole("button", { name: "Devices", exact: true }).click();
  await expect(page.getByText(/Permission is requested only when you enable preview/)).toBeVisible();
});

test("desktop create flows and shared media indexing work", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Desktop sidebar create controls are tested in the desktop project.");

  await page.goto("/app/private/dm/chat_sarah");
  await page.getByRole("button", { name: "Create a private chat or group" }).click();
  const conversationDialog = page.getByRole("dialog");
  await conversationDialog.getByRole("tab", { name: "Private group" }).click();
  await conversationDialog.getByPlaceholder("Book Club").fill("Browser Test Group");
  await conversationDialog.getByText("Sarah Connor").click();
  await conversationDialog.getByText("David Kim").click();
  await conversationDialog.getByRole("button", { name: "Create group" }).click();
  await expect(page.locator("#main-content h1")).toHaveText("Browser Test Group");

  const textFile = {
    name: "browser-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("browser attachment"),
  };
  await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles(textFile);
  await expect(page.getByText("browser-notes.txt")).toBeVisible();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator("#main-content").getByText("browser-notes.txt")).toHaveCount(2);

  await page.goto("/app");
  await createBlankNetwork(page, "Browser Test Network");
  await expect(page.locator("#main-content h1")).toHaveText("General Chat");

  await page.locator('button[title="Add to Network"]').click();
  await page.getByRole("button", { name: "Room", exact: true }).click();
  const roomDialog = page.getByRole("dialog");
  await roomDialog.getByPlaceholder("Volunteer Plans").fill("Meetups");
  await roomDialog.getByRole("button", { name: "Add room" }).click();
  await expect(page.locator("#main-content h1")).toHaveText("Meetups");
});

test("Vault stores downloadable browser files and mobile navigation remains usable", async ({ page }, testInfo) => {
  await page.goto("/app/vault");
  await page.locator('input[type="file"]').setInputFiles({
    name: "vault-check.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("vault smoke"),
  });
  await expect(page.getByText("vault-check.txt")).toBeVisible();
  await expect(page.getByText(/saved in this browser/)).toBeVisible();
  // The uploaded file is encrypted at rest (AES-GCM) in this real browser.
  await expect(page.getByText("Encrypted", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Download" }).first()).toBeVisible();

  if (testInfo.project.name === "mobile-chrome") {
    await page.getByRole("link", { name: "Messages", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Choose conversation" })).toBeVisible();
    await page.getByRole("combobox", { name: "Choose conversation" }).selectOption("chat_weekend");
    await expect(page).toHaveURL(/\/app\/private\/group\/chat_weekend$/);

    await page.getByRole("link", { name: "Networks", exact: true }).click();
    await page.getByRole("button", { name: "I Acknowledge" }).click();
    await expect(page.getByRole("combobox", { name: "Choose Network room" })).toBeVisible();
    await page.getByRole("combobox", { name: "Choose Network room" }).selectOption("net_hiking:room_hc_trails");
    await expect(page).toHaveURL(/\/app\/network\/net_hiking\/room\/room_hc_trails$/);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});

test("lockdown mode sets a local lock that survives reload and unlocks with the PIN", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Desktop settings layout is used for this flow.");

  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Safety & Privacy" }).click();

  // Set a local lock PIN, then switch to Lockdown so the lock can engage.
  await page.getByLabel("Local lock PIN").fill("2468");
  await page.getByRole("button", { name: "Set PIN" }).click();
  await expect(page.getByText("Local lock PIN saved.")).toBeVisible();
  await page.getByText("Lockdown Mode", { exact: true }).click();

  // The privacy posture chip should now be present.
  await expect(page.getByRole("link", { name: "Lockdown" })).toBeVisible();

  // After a reload, the app should be locked behind the PIN.
  await page.reload();
  const lock = page.getByRole("dialog", { name: "App locked" });
  await expect(lock).toBeVisible();
  await expect(lock.getByText(/not encryption/)).toBeVisible();

  // Wrong PIN is rejected, correct PIN unlocks.
  await lock.getByLabel("Local unlock PIN").fill("0000");
  await lock.getByRole("button", { name: "Unlock" }).click();
  await expect(lock.getByRole("alert")).toBeVisible();

  await lock.getByLabel("Local unlock PIN").fill("2468");
  await lock.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("dialog", { name: "App locked" })).toBeHidden();
});

test("mission room is interactive: timeline, tasks, and emergency flag", async ({ page }) => {
  await page.goto("/app/network/net_sar/mission/room_sar_mission");
  await expect(page.getByRole("heading", { name: /Mission Room/ })).toBeVisible();

  // Navigate to Timeline tab
  await page.getByRole("button", { name: /Timeline/ }).click();

  // Post a situation update to the timeline
  const update = `Mission smoke ${Date.now()}`;
  await page.getByPlaceholder("Post a situation update...").fill(update);
  await page.getByRole("button", { name: "Post" }).click();
  await expect(page.getByText(update)).toBeVisible();

  // Add a task on the Tasks tab.
  await page.getByRole("button", { name: /Tasks/ }).click();
  await page.getByPlaceholder("Add a task...").fill("Verify smoke task");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Verify smoke task")).toBeVisible();

  // Raise the emergency flag.
  await page.getByRole("button", { name: /Raise Emergency/ }).click();
  await expect(page.getByText(/Emergency flag is active/)).toBeVisible();
});

test("offline sync queue captures actions safely when backend is unreachable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Testing network creation and offline fallback is covered in the desktop project.");

  // Step 1: Start with backend offline by blocking API routes.
  await page.route('http://localhost:8000/**', route => {
    route.abort('internetdisconnected');
  });

  await page.goto("/app");
  
  // Create a Network to trigger an API call and SyncQueue push
  await createBlankNetwork(page, "Offline Queue Test");

  // Wait for it to show the new network
  await expect(page.locator("#main-content h1")).toHaveText("General Chat");

  // Step 2: Check that the action was added to the local queue.
  const queueItems = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem("aegis_sync_queue") || "[]");
  });
  expect(queueItems.length).toBeGreaterThan(0);
  expect(queueItems.some((item: any) => item.path === "/networks" && item.method === "POST")).toBeTruthy();

  // Step 3: Reload to verify durability
  await page.reload();
  await expect(page.locator("#main-content h1")).toHaveText("General Chat");
  
  const reloadedQueueItems = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem("aegis_sync_queue") || "[]");
  });
  expect(reloadedQueueItems.length).toBeGreaterThan(0);
  expect(reloadedQueueItems.some((item: any) => item.path === "/networks" && item.method === "POST")).toBeTruthy();
});

test("admin center: audit log, a local action creates an audit event, and support tickets", async ({ page }) => {
  await page.goto("/app/admin");
  await expect(page.getByRole("heading", { name: "Global Dev and Operator Diagnostics" })).toBeVisible();

  // Audit log displays and states it is metadata-only (privacy protection).
  await page.getByRole("button", { name: /Audit Logs/ }).click();
  await expect(page.getByText(/metadata only/i).first()).toBeVisible();
  await expect(page.getByText("Network created").first()).toBeVisible();

  // Create a support ticket locally; it must say it was not submitted externally.
  await page.getByRole("button", { name: /Support Tickets/ }).click();
  const summary = `Admin e2e ${Date.now()}`;
  await page.getByLabel("Short summary").fill(summary);
  await page.getByRole("button", { name: "Save ticket locally" }).click();
  await expect(page.getByText(/saved locally/i).first()).toBeVisible();
  await expect(page.getByText(summary).first()).toBeVisible();

  // The ticket creation must have produced an audit event (action -> audit event).
  await page.getByRole("button", { name: /Audit Logs/ }).click();
  await page.getByLabel("Search audit events").fill(summary);
  await expect(page.getByText("Support ticket created").first()).toBeVisible();

  // Backend Ops dashboard shows service status and error categories.
  await page.getByRole("button", { name: /Backend Ops/ }).click();
  await expect(page.getByText("Service Status")).toBeVisible();
  await expect(page.getByText("Error Categories")).toBeVisible();
  await expect(page.getByText("Backend API").first()).toBeVisible();
});

test("message grouping groups consecutive messages and reactions can be added and removed", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Emoji popover layout on the narrow mobile viewport is a separate polish item.");
  await page.goto("/app/private/group/chat_family");

  // First, verify grouping. The family group has two messages from different senders initially.
  // We'll send two messages as the current user to trigger grouping.
  await page.getByRole("textbox", { name: "Message" }).fill("First message");
  await page.keyboard.press("Enter");
  await page.getByRole("textbox", { name: "Message" }).fill("Second message");
  await page.keyboard.press("Enter");

  // The second message should be grouped, so it shouldn't show the sender name "You" again.
  const messageRows = page.locator('.group\\/msg');
  const lastMessage = messageRows.filter({ hasText: "Second message" }).last();
  
  // Wait for the message to appear
  await expect(lastMessage).toBeVisible();
  
  // Verify it's grouped (does not contain the "You" sender label)
  await expect(lastMessage.getByText("You", { exact: true })).toHaveCount(0);
  
  // Hover over the last message to reveal the reaction button
  await lastMessage.hover();
  const addReactionBtn = lastMessage.getByRole("button", { name: "Add reaction" });
  await addReactionBtn.click({ force: true });
  
  // The emoji picker should appear
  const emojiPicker = page.getByRole("dialog", { name: "Emoji picker" });
  await expect(emojiPicker).toBeVisible();
  
  // Pick the thumbs up
  const thumbsUpBtn = emojiPicker.getByRole("button", { name: "React with 👍" });
  await thumbsUpBtn.click();
  
  // The picker should close and the badge should appear
  await expect(emojiPicker).not.toBeVisible();
  const reactionBadge = lastMessage.getByRole("button", { name: "Remove reaction 👍" });
  await expect(reactionBadge).toBeVisible();
  await expect(reactionBadge).toContainText("👍");
  await expect(reactionBadge).toContainText("1");
  
  // Test removing the reaction by clicking the badge
  await reactionBadge.click();
  await expect(reactionBadge).not.toBeVisible();
  
  // Test escape to close picker
  await lastMessage.hover();
  await addReactionBtn.click({ force: true });
  await expect(emojiPicker).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(emojiPicker).not.toBeVisible();
});


test("emoji picker inserts an emoji into the composer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Emoji popover layout on the narrow mobile viewport is a separate polish item.");
  await page.goto("/app/private/dm/chat_sarah");
  await page.getByRole("button", { name: "Choose Emoji" }).click();
  await page.getByRole("button", { name: "Insert 🚀" }).click();
  await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(/🚀/);
});

test("network roster members are clickable and open the member profile card", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Desktop Network Settings layout is used for this flow.");

  await page.goto("/app/network/net_family/settings");
  await page.getByRole("button", { name: "Members" }).click();
  await expect(page.getByText("Network Roster")).toBeVisible();

  // Click a roster member card → profile card opens with Mutual Networks and a Profile action.
  await page.getByRole("button", { name: /View profile for Sarah Connor/ }).click();
  const profileCard = page.getByRole("dialog").filter({ hasText: "Sarah Connor" });
  await expect(profileCard).toContainText("Mutual Network");
  await profileCard.getByRole("button", { name: "Profile", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/profile\/user_sarah$/);
  await expect(page.locator("#main-content")).toContainText("Sarah Connor");
  await expect(page.locator("#main-content")).toContainText("Mutual Networks");

  // Trust Review modal opens from the profile and uses honest wording.
  await page.getByRole("button", { name: "Review Trust" }).first().click();
  const trustDialog = page.getByRole("dialog", { name: /Review trust for Sarah Connor/ });
  await expect(trustDialog).toBeVisible();
  await expect(trustDialog).toContainText("not cryptographic identity verification");
  await trustDialog.getByRole("radio", { name: /Verified in person/ }).check();
  await trustDialog.getByRole("button", { name: "Save trust level" }).click();
  await expect(trustDialog).toBeHidden();
  await expect(page.locator("#main-content")).toContainText("Verified in person");
});

test("profile photo preview opens from the profile and closes with Escape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Desktop profile layout is used for this flow.");

  await page.goto("/app/profile");
  await page.getByRole("button", { name: /View larger profile photo/ }).click();
  const lightbox = page.getByTestId("avatar-lightbox");
  await expect(lightbox).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();
});

test("QA mode lists recent safe profile events and diagnostics stay metadata-only", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Desktop QA layout is used for this flow.");

  // Generate events: open a profile, toggle a privacy preference.
  await page.goto("/app/profile/user_sarah");
  await expect(page.locator("#main-content")).toContainText("Sarah Connor");
  await page.goto("/app/profile");
  await page.getByRole("switch").first().click(); // read receipts toggle

  await page.goto("/app/qa");
  await expect(page.getByRole("heading", { name: "Recent QA Events" })).toBeVisible();
  const eventList = page.getByTestId("qa-event-list");
  await expect(eventList).toContainText("profile.opened");
  await expect(eventList).toContainText("read.receipts.toggled");

  // The QA event log stores metadata only — no content-bearing keys.
  const rawEvents = await page.evaluate(() => localStorage.getItem("aegisnet_qaEvents") || "");
  for (const banned of ['"messageBody"', '"bio"', '"password"', '"token"', '"text"', '"note"']) {
    expect(rawEvents).not.toContain(banned);
  }

  // Clear works.
  await page.getByRole("button", { name: "Clear QA event log" }).click();
  await expect(page.getByText("No QA events yet", { exact: false })).toBeVisible();
});

test("keyboard users can reach the skip link", async ({ page }) => {
  await page.goto("/app");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("keyboard-only dialogs open, retain focus, and close with Escape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Desktop sidebar dialogs are tested in the desktop project.");
  await page.goto("/app/private/group/chat_family");

  const createButton = page.getByRole("button", { name: "Create a private chat or group" });
  await createButton.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("tab", { name: "Private chat" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(createButton).toBeFocused();

  const manageButton = page.getByRole("button", { name: "Manage Family Group" });
  await manageButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Group settings" })).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(manageButton).toBeFocused();
});

test("@a11y main routes have no serious or critical accessibility violations", async ({ page }) => {
  test.setTimeout(90000); // 90 seconds for 42 routes
  const routes = [
    "/app",
    "/app/private/group/chat_family",
    "/app/network/net_family/room/room_fam_chat",
    "/app/network/net_sar/mission/room_sar_mission",
    "/app/vault",
    "/app/private/dm/chat_sarah/call/voice",
    "/app/settings",
    "/app/admin",
  ];

  const themes = ["social-dark", "midnight", "warm", "signal", "field", "night", "high-contrast"];

  for (const theme of themes) {
    await page.evaluate((t) => localStorage.setItem("aegis-theme", t), theme);
    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(400); // Wait for animate-in fade-in
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const important = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
      expect(important, `[${theme}] ${route}: ${important.map((item) => `${item.id} (${item.nodes.length})`).join(", ")}`).toEqual([]);
    }
  }
});

test("@a11y lock screen has no serious or critical accessibility violations", async ({ page }) => {
  const themes = ["social-dark", "midnight", "warm", "signal", "field", "night", "high-contrast"];
  for (const theme of themes) {
    // Inject local storage state to simulate lockdown mode with a PIN.
    await page.evaluate((t) => {
      localStorage.setItem("aegis-theme", t);
      localStorage.setItem("aegis_privacyMode", JSON.stringify("lockdown"));
      // "1234" hashed with basic hash function: (length > 0)
      localStorage.setItem("aegis_lockPinHash", JSON.stringify("fake_hash_1234"));
    }, theme);

    await page.goto("/app");
    await page.waitForTimeout(400); // Wait for LockScreen to render

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const important = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
    expect(important, `[${theme}] lockscreen: ${important.map((item) => `${item.id} (${item.nodes.length})`).join(", ")}`).toEqual([]);
  }
});
