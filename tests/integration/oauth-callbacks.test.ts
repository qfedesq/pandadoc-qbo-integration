import { Provider } from "@prisma/client";

import { handlePandaDocOAuthCallback } from "@/lib/providers/pandadoc/oauth";
import { handleQuickBooksOAuthCallback } from "@/lib/providers/quickbooks/oauth";

describe("OAuth callback handlers", () => {
  it("persists a QuickBooks connection after a valid callback", async () => {
    const claimState = vi.fn().mockResolvedValue({
      status: "claimed",
      state: {
        id: "state_1",
        userId: "user_1",
        provider: Provider.QUICKBOOKS,
        redirectTo: "/integrations",
      },
    });
    const exchangeCode = vi.fn().mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
      expiresInSeconds: 3600,
      refreshTokenExpiresInSeconds: 86400,
      tokenType: "Bearer",
      scope: "com.intuit.quickbooks.accounting",
    });
    const fetchCompany = vi.fn().mockResolvedValue({
      realmId: "9130357992222222",
      companyName: "Demo Manufacturing LLC",
      country: "US",
      currency: "USD",
    });
    const persistConnection = vi.fn().mockResolvedValue(undefined);

    const result = await handleQuickBooksOAuthCallback(
      {
        claimState,
        exchangeCode,
        fetchCompany,
        persistConnection,
      },
      {
        code: "auth-code",
        state: "opaque-state",
        realmId: "9130357992222222",
      },
    );

    expect(exchangeCode).toHaveBeenCalledWith("auth-code");
    expect(fetchCompany).toHaveBeenCalledWith("access", "9130357992222222");
    expect(persistConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        realmId: "9130357992222222",
        companyName: "Demo Manufacturing LLC",
      }),
    );
    expect(claimState).toHaveBeenCalled();
    expect(result.redirectTo).toBe("/integrations");
  });

  it("persists a PandaDoc connection after a valid callback", async () => {
    const claimState = vi.fn().mockResolvedValue({
      status: "claimed",
      state: {
        id: "state_2",
        userId: "user_2",
        provider: Provider.PANDADOC,
        redirectTo: "/integrations",
      },
    });
    const exchangeCode = vi.fn().mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
      expiresInSeconds: 3600,
      refreshTokenExpiresInSeconds: 86400,
      tokenType: "Bearer",
      scope: "read write",
    });
    const fetchCurrentMember = vi.fn().mockResolvedValue({
      user_id: "pd_user_demo",
      email: "morgan@example.com",
      first_name: "Morgan",
      last_name: "Panda",
      workspace_name: "PandaDoc Demo Workspace",
      workspace_id: "workspace_demo",
    });
    const persistConnection = vi.fn().mockResolvedValue(undefined);

    const result = await handlePandaDocOAuthCallback(
      {
        claimState,
        exchangeCode,
        fetchCurrentMember,
        persistConnection,
      },
      {
        code: "pd-code",
        state: "opaque-state",
      },
    );

    expect(fetchCurrentMember).toHaveBeenCalledWith("access");
    expect(persistConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_2",
        accountId: "pd_user_demo",
        displayName: "Morgan Panda",
      }),
    );
    expect(result.redirectTo).toBe("/integrations");
  });

  it("rejects an already-consumed QuickBooks state before provider calls", async () => {
    const exchangeCode = vi.fn();

    await expect(
      handleQuickBooksOAuthCallback(
        {
          claimState: vi.fn().mockResolvedValue({
            status: "consumed",
          }),
          exchangeCode,
          fetchCompany: vi.fn(),
          persistConnection: vi.fn(),
        },
        {
          code: "auth-code",
          state: "opaque-state",
          realmId: "9130357992222222",
        },
      ),
    ).rejects.toThrow("already been used");

    expect(exchangeCode).not.toHaveBeenCalled();
  });
});
