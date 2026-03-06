describe("isAuthorizedSyncRequest", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      CRON_SECRET: "cron-secret-1234567890",
      INTERNAL_SYNC_SECRET: "internal-secret-1234567890",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it("accepts both internal and cron secrets for shared sync endpoints", async () => {
    const { isAuthorizedSyncRequest } = await import("@/lib/security/sync-auth");

    const internalRequest = new Request("http://localhost:3000/api/invoices/sync", {
      headers: {
        authorization: "Bearer internal-secret-1234567890",
      },
    });
    const cronRequest = new Request("http://localhost:3000/api/invoices/sync", {
      headers: {
        authorization: "Bearer cron-secret-1234567890",
      },
    });

    expect(isAuthorizedSyncRequest(internalRequest)).toBe(true);
    expect(isAuthorizedSyncRequest(cronRequest)).toBe(true);
  });

  it("accepts only the cron secret for the Vercel cron route", async () => {
    const { isAuthorizedSyncRequest } = await import("@/lib/security/sync-auth");

    const internalRequest = new Request(
      "http://localhost:3000/api/cron/invoices-sync",
      {
        headers: {
          authorization: "Bearer internal-secret-1234567890",
        },
      },
    );
    const cronRequest = new Request(
      "http://localhost:3000/api/cron/invoices-sync",
      {
        headers: {
          authorization: "Bearer cron-secret-1234567890",
        },
      },
    );

    expect(isAuthorizedSyncRequest(internalRequest, "vercel-cron")).toBe(false);
    expect(isAuthorizedSyncRequest(cronRequest, "vercel-cron")).toBe(true);
  });
});
