describe("GET /api/cron/invoices-sync", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
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
    vi.restoreAllMocks();
  });

  it("rejects unauthorized requests", async () => {
    const { GET } = await import("@/app/api/cron/invoices-sync/route");

    const response = await GET(
      new Request("http://localhost:3000/api/cron/invoices-sync"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized.",
    });
  });

  it("runs scheduled sync with the Vercel cron secret", async () => {
    const runConfiguredInvoiceSync = vi.fn().mockResolvedValue({
      enabled: true,
      intervalMinutes: 60,
      dueOnly: false,
      results: [],
    });

    vi.doMock("@/lib/invoices/scheduled-sync", () => ({
      runConfiguredInvoiceSync,
    }));

    const { GET } = await import("@/app/api/cron/invoices-sync/route");

    const response = await GET(
      new Request(
        "http://localhost:3000/api/cron/invoices-sync?connectionId=connection_1&force=true&userId=user_1",
        {
          headers: {
            authorization: "Bearer cron-secret-1234567890",
          },
        },
      ),
    );

    expect(runConfiguredInvoiceSync).toHaveBeenCalledWith({
      connectionId: "connection_1",
      force: true,
      trigger: "CRON",
      userId: "user_1",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      source: "vercel-cron",
      enabled: true,
      intervalMinutes: 60,
      dueOnly: false,
      results: [],
    });
  });
});
