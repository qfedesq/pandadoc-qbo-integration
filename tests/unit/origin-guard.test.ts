import { assertValidAppRequestOrigin } from "@/lib/security/origin";

describe("assertValidAppRequestOrigin", () => {
  it("accepts same-origin requests", () => {
    const request = new Request("http://localhost:3000/api/invoices/sync", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
      },
    });

    expect(() => assertValidAppRequestOrigin(request)).not.toThrow();
  });

  it("accepts loopback origin aliases on the same port", () => {
    const request = new Request("http://localhost:3000/api/invoices/sync", {
      method: "POST",
      headers: {
        origin: "http://127.0.0.1:3000",
      },
    });

    expect(() => assertValidAppRequestOrigin(request)).not.toThrow();
  });

  it("rejects cross-origin requests", () => {
    const request = new Request("http://localhost:3000/api/invoices/sync", {
      method: "POST",
      headers: {
        origin: "https://evil.example.com",
      },
    });

    expect(() => assertValidAppRequestOrigin(request)).toThrow(
      "Request origin validation failed.",
    );
  });
});
