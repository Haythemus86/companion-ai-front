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
  await expect(
    page.getByRole("link", { name: "Aller au contenu" }),
  ).toBeFocused();
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
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Réglages d’initiative enregistrés",
  );
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

test("personnes : identite confirmee, alias, confidentialite et dissociation", async ({
  page,
  request,
}) => {
  const add = async (content: string) =>
    (
      await (
        await request.post("/api/memories", {
          headers,
          data: { content, confidential: true },
        })
      ).json()
    ).memory;
  const first = await add("Alex aime le piano");
  await add("Alexandre aime le dessin");
  await openPage(page, "/people");
  await page
    .locator(".person-item")
    .filter({ has: page.getByText("Alex", { exact: true }) })
    .click();
  await expect(page.getByText("Source confidentielle masquée")).toBeVisible();
  await expect(
    page.getByText("Préférence déclarée :", { exact: false }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Afficher la source" }).click();
  await expect(page.locator(".source-facts")).toContainText("le piano");
  await page.getByRole("button", { name: "Attribuer une identité" }).click();
  await page.getByRole("button", { name: "Vérifier l’association" }).click();
  await page
    .getByRole("button", { name: "Annuler", exact: true })
    .last()
    .click();
  expect(
    (await (await request.get(`/api/memories/${first.id}`, { headers })).json())
      .person_id,
  ).toBeNull();
  await page.getByRole("button", { name: "Vérifier l’association" }).click();
  await page.getByRole("button", { name: "Confirmer l’association" }).click();
  await expect(page.locator(".person-identity")).toContainText("Identité :");
  const identity = (
    await (await request.get(`/api/memories/${first.id}`, { headers })).json()
  ).person_id;
  await page.locator(".person-item").filter({ hasText: "Alexandre" }).click();
  await page.getByRole("button", { name: "Attribuer une identité" }).click();
  await page.getByLabel("Identité à attribuer").selectOption(identity);
  await page.getByRole("button", { name: "Vérifier l’association" }).click();
  await page.getByRole("button", { name: "Confirmer l’association" }).click();
  await expect(
    page.getByText("Alias présents dans les sources : alex, alexandre"),
  ).toBeVisible();
  await expect(page.locator(".source-item")).toHaveCount(2);
  await expect(page.locator(".source-facts")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Attribuer une identité" })
    .first()
    .click();
  await page.getByLabel("Identité à attribuer").selectOption("none");
  await page.getByRole("button", { name: "Vérifier l’association" }).click();
  await page.getByRole("button", { name: "Confirmer l’association" }).click();
  await expect(page.locator(".person-identity")).toContainText(
    "Identité non attribuée",
  );
});

test("personnes : pagination et correction directe d’une source", async ({
  page,
  request,
}) => {
  for (let i = 0; i < 21; i++)
    await request.post("/api/memories", {
      headers,
      data: { content: `Alex aime le dessin numero ${i}`, confidential: false },
    });
  await openPage(page, "/people");
  await page.locator(".person-item").click();
  await expect(page.locator(".source-item")).toHaveCount(20);
  await page.getByRole("button", { name: "Sources suivantes" }).click();
  await expect(page.locator(".source-item")).toHaveCount(1);
  await expect(page.locator(".source-item")).toContainText("numero 20");
  await page.getByRole("button", { name: "Sources précédentes" }).click();
  await expect(page.locator(".source-item")).toHaveCount(20);
  await page
    .getByRole("link", { name: "Modifier le souvenir" })
    .first()
    .click();
  await expect(page.getByLabel("Contenu", { exact: true })).toHaveValue(
    "Alex aime le dessin numero 0",
  );
  await page
    .getByLabel("Contenu", { exact: true })
    .fill("Alex aime la photographie");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Souvenir enregistré localement.",
  );
  await openPage(page, "/people");
  await page.locator(".person-item").click();
  await expect(page.locator(".source-item").first()).toContainText(
    "Alex aime la photographie",
  );
});

test("niveau d’initiative persistant et explication des limites", async ({
  page,
}) => {
  await openPage(page, "/schedule");
  await page.getByLabel("Niveau d’initiative").selectOption("chatty");
  await expect(page.locator("#initiative-policy")).toContainText("2 minutes");
  await expect(page.locator("#initiative-policy")).toContainText(
    "6 propositions par heure",
  );
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Réglages d’initiative enregistrés",
  );
  await page.reload();
  await expect(page.getByLabel("Niveau d’initiative")).toHaveValue("chatty");
  await page.getByLabel("Niveau d’initiative").selectOption("off");
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Réglages d’initiative enregistrés",
  );
  await page.reload();
  await expect(page.getByLabel("Niveau d’initiative")).toHaveValue("off");
  await expect(
    page.getByText("Initiatives désactivées", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("#initiative-policy")).toContainText("salutations");
  await page.getByLabel("Niveau d’initiative").selectOption("balanced");
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Réglages d’initiative enregistrés",
  );
});


test("fournisseurs : ajout et remplacement de clé sans exposition", async ({ page, request }) => {
  await openPage(page, "/providers");
  await page.getByLabel("Identifiant", { exact: true }).fill("test-cloud");
  await page.getByLabel("Nom affiché").fill("Mon Groq");
  await page.getByLabel("Nouvelle clé API").fill("secret-test-one");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mon Groq" })).toBeVisible();
  await expect(page.getByLabel("Nouvelle clé API")).toHaveValue("");
  await page.getByRole("button", { name: "Modifier / remplacer la clé" }).click();
  await page.getByLabel("Nouvelle clé API").fill("secret-test-two");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByLabel("Nouvelle clé API")).toHaveValue("");
  const result = await request.get("/api/providers", { headers });
  const content = await result.text();
  expect(content).not.toContain("secret-test");
  expect(JSON.parse(content).profiles["test-cloud"].has_key).toBe(true);
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mon Groq" })).toHaveCount(0);
});


test("moderation adulte : desactivation persistante et reactivation", async ({ page, request }) => {
  await openPage(page, "/providers");
  await page.getByLabel("Activer la modération IA").uncheck();
  await page.getByRole("button", { name: "Appliquer la modération" }).click();
  await expect(page.getByRole("status")).toContainText("Réglage de modération enregistré");
  await page.reload();
  await expect(page.getByLabel("Activer la modération IA")).not.toBeChecked();
  expect((await (await request.get("/api/moderation", { headers })).json()).enabled).toBe(false);
  await page.getByLabel("Activer la modération IA").check();
  await page.getByRole("button", { name: "Appliquer la modération" }).click();
  await expect(page.getByRole("status")).toContainText("Réglage de modération enregistré");
});

test("test fournisseur : résultat sans modération et erreur quota explicite", async ({ page, request }) => {
  await request.put('/api/providers/test-result', { headers, data: { label: 'Diagnostic Groq', kind: 'groq', chat_model: 'chat', guard_model: 'guard', api_key: 'fake-test-key' } });
  await page.route('**/api/providers/test-result/test', async route => {
    await route.fulfill({ json: { ok: true, moderation_tested: false, detail: 'Le modèle de dialogue répond. Modération désactivée : aucun appel au modèle de modération.' } });
  });
  await openPage(page, '/providers');
  const card = page.locator('article').filter({ hasText: 'Diagnostic Groq' });
  await card.getByRole('button', { name: 'Tester les modèles' }).click();
  await expect(page.getByRole('status')).toContainText('Modération désactivée');
  await page.unroute('**/api/providers/test-result/test');
  await page.route('**/api/providers/test-result/test', async route => {
    await route.fulfill({ status: 502, json: { detail: 'Test du modèle de dialogue échoué : quota ou limite de fréquence atteint chez le fournisseur (HTTP 429).' } });
  });
  await card.getByRole('button', { name: 'Tester les modèles' }).click();
  await expect(page.getByRole('alert')).toContainText('HTTP 429');
  await request.delete('/api/providers/test-result', { headers });
});
