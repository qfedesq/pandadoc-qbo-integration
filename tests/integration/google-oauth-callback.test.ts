import { AuthIdentityProvider } from "@prisma/client";

import { handleGoogleOAuthCallback } from "@/lib/providers/google/oauth";

describe("Google OAuth callback handler", () => {
  it("creates a local session after a valid Google callback", async () => {
    const claimState = vi.fn().mockResolvedValue({
      status: "claimed",
      state: {
        id: "auth_state_1",
        provider: AuthIdentityProvider.GOOGLE,
        redirectTo: "/factoring-dashboard",
      },
    });
    const exchangeCode = vi.fn().mockResolvedValue({
      accessToken: "google-access-token",
      tokenType: "Bearer",
      scope: "openid email profile",
      expiresInSeconds: 3600,
      raw: {
        access_token: "google-access-token",
        token_type: "Bearer",
        expires_in: 3600,
      },
    });
    const fetchUserInfo = vi.fn().mockResolvedValue({
      sub: "google-user-1",
      email: "factoring.demo@gmail.com",
      email_verified: true,
      name: "Factoring Demo",
      picture: "https://example.com/avatar.png",
    });
    const upsertUserIdentity = vi.fn().mockResolvedValue({
      id: "user_1",
      email: "factoring.demo@gmail.com",
      name: "Factoring Demo",
    });
    const createAppSession = vi.fn().mockResolvedValue(undefined);

    const result = await handleGoogleOAuthCallback(
      {
        claimState,
        exchangeCode,
        fetchUserInfo,
        upsertUserIdentity,
        createAppSession,
      },
      {
        code: "google-auth-code",
        state: "opaque-state",
      },
    );

    expect(exchangeCode).toHaveBeenCalledWith("google-auth-code");
    expect(fetchUserInfo).toHaveBeenCalledWith("google-access-token");
    expect(upsertUserIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        providerUserId: "google-user-1",
        email: "factoring.demo@gmail.com",
      }),
    );
    expect(createAppSession).toHaveBeenCalledWith("user_1");
    expect(result.redirectTo).toBe("/factoring-dashboard");
  });

  it("rejects non-verified Google emails", async () => {
    await expect(
      handleGoogleOAuthCallback(
        {
          claimState: vi.fn().mockResolvedValue({
            status: "claimed",
            state: {
              id: "auth_state_2",
              provider: AuthIdentityProvider.GOOGLE,
              redirectTo: "/factoring-dashboard",
            },
          }),
          exchangeCode: vi.fn().mockResolvedValue({
            accessToken: "google-access-token",
            tokenType: "Bearer",
            expiresInSeconds: 3600,
            raw: {
              access_token: "google-access-token",
              token_type: "Bearer",
              expires_in: 3600,
            },
          }),
          fetchUserInfo: vi.fn().mockResolvedValue({
            sub: "google-user-2",
            email: "unverified@gmail.com",
            email_verified: false,
          }),
          upsertUserIdentity: vi.fn(),
          createAppSession: vi.fn(),
        },
        {
          code: "google-auth-code",
          state: "opaque-state",
        },
      ),
    ).rejects.toThrow("Google account email must be verified");
  });

  it("rejects Google accounts outside the Gmail domains", async () => {
    await expect(
      handleGoogleOAuthCallback(
        {
          claimState: vi.fn().mockResolvedValue({
            status: "claimed",
            state: {
              id: "auth_state_3",
              provider: AuthIdentityProvider.GOOGLE,
              redirectTo: "/factoring-dashboard",
            },
          }),
          exchangeCode: vi.fn().mockResolvedValue({
            accessToken: "google-access-token",
            tokenType: "Bearer",
            expiresInSeconds: 3600,
            raw: {
              access_token: "google-access-token",
              token_type: "Bearer",
              expires_in: 3600,
            },
          }),
          fetchUserInfo: vi.fn().mockResolvedValue({
            sub: "google-user-3",
            email: "someone@company.com",
            email_verified: true,
          }),
          upsertUserIdentity: vi.fn(),
          createAppSession: vi.fn(),
        },
        {
          code: "google-auth-code",
          state: "opaque-state",
        },
      ),
    ).rejects.toThrow("Only Gmail accounts are allowed to sign in.");
  });
});
