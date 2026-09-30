import { test, expect, type Page } from "@playwright/test";

const headers = { "X-Companion-Admin": "1" };

async function openPage(page: Page, path = "/") {
  await page.goto(`/#${path}`);
  await expect(page.getByText("API locale connectée")).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  const status = await (await request.get("/api/status", { headers })).json();
  if (!status.configured) {
    const result = await request.post("/api/setup", {
      headers,
      data: {
        age_profile: "adulte",
        preferences: { companion_name: "Companion", nickname: "Camille" },
      },
    });
    expect(result.status()).toBe(201);
  }
  const data = await (
    await request.get("/api/memories?limit=100", { headers })
  ).json();
  for (const memory of data.items) {
    await request.delete(
      `/api/memories/${memory.id}?updated_at=${encodeURIComponent(memory.updated_at)}`,
      { headers },
    );
  }
});

test("dashboard, canvas et navigation sans debordement", async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await request.post("/api/memories", {
    headers,
    data: {
      content: "Je pratique le dessin le week-end.",
      confidential: false,
    },
  });
  await request.post("/api/memories", {
    headers,
    data: { content: "Mon fils Alex aime le piano.", confidential: true },
  });
  await openPage(page);
  await expect(
    page.getByRole("heading", { name: "Vue d’ensemble." }),
  ).toBeVisible();
  await expect(
    page.getByText("Je pratique le dessin le week-end."),
  ).toBeVisible();
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () =>
      canvas.evaluate((element) => {
        const data = (element as HTMLCanvasElement)
          .getContext("2d")!
          .getImageData(0, 0, 560, 270).data;
        let dark = 0;
        for (let index = 0; index < data.length; index += 4)
          if (data[index] < 100 && data[index + 3] > 0) dark++;
        return dark;
      }),
    )
    .toBeGreaterThan(3000);
  const firstFrame = await canvas.evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  );
  await canvas.hover({ position: { x: 25, y: 30 } });
  await expect
    .poll(() =>
      canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()),
    )
    .not.toBe(firstFrame);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
  for (const path of [
    "/memories",
    "/people",
    "/settings",
    "/schedule",
    "/system",
    "/chat",
  ]) {
    await openPage(page, path);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath(`${path.slice(1)}.png`),
      fullPage: true,
    });
  }
  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("button", { name: "Ouvrir le menu", exact: true })
      .click();
    await page.getByRole("link", { name: "Personnes", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Personnes." }),
    ).toBeVisible();
    await expect(page.locator(".nav-scrim")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("acces clavier au contenu sans changer la route", async ({ page }) => {
  await openPage(page, "/settings");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await expect(page).toHaveURL(/#\/settings$/);
});

test("memoire privee : creation, recherche, edition et suppression confirmee", async ({
  page,
}) => {
  await openPage(page, "/memories");
  await page
    .getByRole("button", { name: "Ajouter un souvenir" })
    .first()
    .click();
  await page
    .getByLabel("Contenu", { exact: true })
    .fill("Je pratique la photographie chaque samedi");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByText("Contenu confidentiel masqué")).toBeVisible();
  await page
    .getByRole("button", { name: "Afficher le souvenir", exact: true })
    .click();
  await expect(
    page.getByText("Je pratique la photographie chaque samedi", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Modifier le souvenir", exact: true })
    .click();
  await page
    .getByLabel("Contenu", { exact: true })
    .fill("Je pratique la photographie chaque dimanche");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(
    page.getByText("Je pratique la photographie chaque dimanche", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Rechercher un souvenir" })
    .fill("absent");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Aucun résultat" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Rechercher un souvenir" })
    .fill("photographie");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await page
    .getByRole("button", { name: "Supprimer le souvenir", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.locator(".memory-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Supprimer le souvenir", exact: true })
    .click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(page.locator(".memory-row")).toHaveCount(0);
});

test("reglages persistants, horaires valides et export prive", async ({
  page,
}) => {
  await openPage(page, "/settings");
  await page.getByLabel("Nom du compagnon").fill("Nova");
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await expect(page.getByRole("status")).toContainText("Réglages enregistrés");
  await page.reload();
  await expect(page.getByLabel("Nom du compagnon")).toHaveValue("Nova");
  await page.getByLabel("Nom du compagnon").fill("Companion");
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await page.getByRole("tab", { name: "Profil privé & partage" }).click();
  await page.getByLabel("Ville", { exact: true }).fill("Lyon");
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await expect(page.getByRole("status")).toContainText("Réglages enregistrés");
  await openPage(page, "/schedule");
  await page.getByLabel("Début du silence").selectOption("22");
  await page.getByRole("button", { name: "Enregistrer les horaires" }).click();
  await expect(page.getByRole("status")).toContainText("Horaires enregistrés");
  await page.reload();
  await expect(page.getByLabel("Début du silence")).toHaveValue("22");
  await openPage(page, "/system");
  await page.getByRole("button", { name: "Exporter la sauvegarde" }).click();
  await expect(page.getByRole("dialog")).toContainText("sans chiffrement");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  expect((await downloaded).suggestedFilename()).toMatch(
    /^companion-sauvegarde-/,
  );
});

test("chat : consentement prive avant envoi et nouvelle session", async ({
  page,
  request,
}) => {
  await request.post("/api/memories", {
    headers,
    data: { content: "Je pratique le dessin", confidential: true },
  });
  const calls: unknown[] = [];
  await page.route("**/api/chat", async (route) => {
    calls.push(route.request().postDataJSON());
    await route.fulfill({
      json: {
        session_id: "test-session",
        reply: "Bonjour, parlons de dessin.",
        approved: true,
      },
    });
  });
  await openPage(page, "/chat");
  await page.getByRole("button", { name: "Joindre un souvenir" }).click();
  await page.getByLabel("Choisir un souvenir").selectOption({ index: 1 });
  await page.getByLabel("Votre message").fill("Bonjour");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(calls).toHaveLength(0);
  await page.getByRole("button", { name: "Autoriser pour ce message" }).click();
  await expect(page.getByText("Bonjour, parlons de dessin.")).toBeVisible();
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    allow_confidential: true,
    mode: "local",
    message: "Bonjour",
  });
  await page.getByRole("button", { name: "Nouvelle conversation" }).click();
  await expect(page.getByText("Bonjour, parlons de dessin.")).toHaveCount(0);
});

test("erreur API visible sans fausse confirmation", async ({ page }) => {
  await openPage(page, "/settings");
  await page.route("**/api/preferences", (route) =>
    route.fulfill({ status: 409, json: { detail: "Companion est occupé." } }),
  );
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await expect(page.getByRole("alert")).toContainText("Companion est occupé.");
  await expect(page.getByRole("status")).toHaveCount(0);
});
