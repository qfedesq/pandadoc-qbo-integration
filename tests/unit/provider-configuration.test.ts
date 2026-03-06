import { Provider } from "@prisma/client";

describe("provider configuration", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unmock("@/lib/env");
  });

  it("treats PandaDoc mock mode as configured", async () => {
    vi.doMock("@/lib/env", () => ({
      hasPandaDocOauthConfig: () => false,
      hasQuickBooksOauthConfig: () => false,
      isPandaDocMockMode: () => true,
      isQuickBooksMockMode: () => false,
    }));

    const configuration = await import("@/lib/providers/configuration");

    expect(configuration.isProviderOauthConfigured(Provider.PANDADOC)).toBe(true);
    expect(
      configuration.getProviderOauthConfigurationMessage(Provider.PANDADOC),
    ).toContain("mock mode");
  });

  it("keeps PandaDoc pending when mock mode is off and OAuth creds are missing", async () => {
    vi.doMock("@/lib/env", () => ({
      hasPandaDocOauthConfig: () => false,
      hasQuickBooksOauthConfig: () => true,
      isPandaDocMockMode: () => false,
      isQuickBooksMockMode: () => false,
    }));

    const configuration = await import("@/lib/providers/configuration");

    expect(configuration.isProviderOauthConfigured(Provider.PANDADOC)).toBe(false);
    expect(
      configuration.getProviderOauthConfigurationMessage(Provider.PANDADOC),
    ).toContain("PANDADOC_CLIENT_ID");
  });
});
