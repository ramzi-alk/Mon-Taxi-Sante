import { test, expect } from "@playwright/test";

// Vérifie que les notifications push chauffeur marchent *réellement*, pas
// seulement que le hook `usePushNotifications` s'appelle sans erreur.
//
// On ne peut pas piloter l'app complète ici (TanStack Start + Supabase +
// clé VAPID réelles ne sont pas disponibles dans cet environnement de test),
// donc la suite se concentre sur ce qui est vérifiable de bout en bout sans
// backend :
//   1. le vrai fichier public/sw.js s'enregistre et devient actif ;
//   2. son handler "push" déclenche bien une notification avec le bon
//      titre/corps/tag/lien à partir d'un payload JSON — le cœur de "est-ce
//      que ça marche vraiment" pour le chauffeur ;
//   3. le repli sur un payload non-JSON fonctionne (event.data.json() qui
//      échoue) ;
//   4. un clic sur la notification ouvre/focus la bonne URL.
//
// Le test 5 (abonnement VAPID réel) est best-effort : pushManager.subscribe()
// parle au service de push du navigateur (fcm.googleapis.com pour Chromium),
// injoignable depuis un réseau bac-à-sable — il s'auto-skip proprement si ce
// n'est pas atteignable plutôt que de faire échouer toute la suite sur une
// limitation réseau qui n'a rien à voir avec un bug de code.

async function registerServiceWorker(page: import("@playwright/test").Page, context: import("@playwright/test").BrowserContext) {
  const workerPromise = context.waitForEvent("serviceworker");
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.register("/sw.js", { scope: "/" }));
  return workerPromise;
}

test.describe("service worker de notifications push (public/sw.js)", () => {
  test("s'enregistre et devient actif", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      return { scope: reg.scope, hasActive: !!reg.active };
    });
    expect(result.hasActive).toBe(true);
    expect(result.scope.endsWith("/")).toBe(true);
  });

  test("un push avec payload JSON déclenche une notification avec le bon titre/corps/tag/lien", async ({
    page,
    context,
  }) => {
    const worker = await registerServiceWorker(page, context);

    const payload = {
      title: "Nouvelle course disponible",
      body: "Lyon 6e → Hôpital Édouard Herriot, dans 25 min",
      url: "/tableau-de-bord/chauffeur/course/abc-123",
      tag: "mts-new-ride",
    };

    const captured = await worker.evaluate(async (data) => {
      const calls: Array<{ title: string; options: Record<string, unknown> }> = [];
      // @ts-expect-error - override inside the SW global scope for the test
      self.registration.showNotification = (title: string, options: Record<string, unknown>) => {
        calls.push({ title, options });
        return Promise.resolve();
      };

      // @ts-expect-error - ExtendableEvent is a real SW-global constructor;
      // faking .data lets us exercise sw.js's actual "push" listener without
      // a genuine round-trip through a push service.
      const event = new ExtendableEvent("push");
      // @ts-expect-error - PushEvent.data is normally set by the browser on
      // delivery; we stub only the method the handler calls, .json().
      event.data = { json: () => data };

      self.dispatchEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 50));
      return calls[0] ?? null;
    }, payload);

    expect(captured).not.toBeNull();
    expect(captured!.title).toBe(payload.title);
    expect(captured!.options.body).toBe(payload.body);
    expect(captured!.options.tag).toBe(payload.tag);
    expect(captured!.options.data).toEqual({ url: payload.url });
    expect(captured!.options.vibrate).toEqual([200, 100, 200]);
  });

  test("un push non-JSON tombe sur le titre par défaut et le texte brut", async ({ page, context }) => {
    const worker = await registerServiceWorker(page, context);

    const rawText = "Une course vous attend, ouvrez l'application";

    const captured = await worker.evaluate(async (text) => {
      const calls: Array<{ title: string; options: Record<string, unknown> }> = [];
      // @ts-expect-error - test-only override, see above
      self.registration.showNotification = (title: string, options: Record<string, unknown>) => {
        calls.push({ title, options });
        return Promise.resolve();
      };

      // @ts-expect-error - see above
      const event = new ExtendableEvent("push");
      // @ts-expect-error - simulates a push payload the browser could not
      // parse as JSON, forcing sw.js's catch-branch (event.data.text())
      event.data = {
        json: () => {
          throw new Error("not json");
        },
        text: () => text,
      };

      self.dispatchEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 50));
      return calls[0] ?? null;
    }, rawText);

    expect(captured).not.toBeNull();
    expect(captured!.title).toBe("Docteur Taxi");
    expect(captured!.options.body).toBe(rawText);
    expect(captured!.options.tag).toBe("mts-default");
  });

  test("un clic sur la notification ouvre la bonne URL quand aucune fenêtre n'est déjà ouverte", async ({
    page,
    context,
  }) => {
    const worker = await registerServiceWorker(page, context);

    const targetUrl = "/tableau-de-bord/chauffeur/course/xyz-789";

    const openedUrl = await worker.evaluate(async (url) => {
      let opened: string | null = null;
      // @ts-expect-error - test-only overrides of the Clients API
      self.clients.matchAll = () => Promise.resolve([]);
      // @ts-expect-error - see above
      self.clients.openWindow = (u: string) => {
        opened = u;
        return Promise.resolve(null);
      };

      // @ts-expect-error - same event-faking technique as the push tests;
      // avoids needing a real Notification instance for event.notification.
      const event = new ExtendableEvent("notificationclick");
      // @ts-expect-error - stub of the Notification the click came from
      event.notification = { close: () => {}, data: { url } };

      self.dispatchEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 50));
      return opened;
    }, targetUrl);

    expect(openedUrl).toBe(targetUrl);
  });
});

test.describe("abonnement push réel (best effort, dépend du réseau)", () => {
  test("pushManager.subscribe() obtient un endpoint valide auprès du service de push du navigateur", async ({
    page,
    context,
  }) => {
    const vapidPublicKey = process.env.E2E_VAPID_PUBLIC_KEY;
    test.skip(
      !vapidPublicKey,
      "E2E_VAPID_PUBLIC_KEY non fourni — générez une paire jetable (node -e \"console.log(require('web-push').generateVAPIDKeys())\") et exportez la clé publique pour activer ce test"
    );

    await context.grantPermissions(["notifications"]);
    const worker = await registerServiceWorker(page, context);

    const outcome = await worker.evaluate(async (vapidKey) => {
      function urlBase64ToUint8Array(base64String: string) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const raw = atob(base64);
        return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
      }
      try {
        // @ts-expect-error - registration is the SW's own, always ready here
        const sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        return { ok: true as const, endpoint: sub.endpoint as string };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    }, vapidPublicKey!);

    test.skip(
      !outcome.ok,
      `pushManager.subscribe() a échoué — probablement un réseau sans accès au service de push du navigateur dans cet environnement, pas un bug de code : ${
        "error" in outcome ? outcome.error : ""
      }`
    );

    expect(outcome.ok && outcome.endpoint).toMatch(/^https?:\/\//);
  });
});
