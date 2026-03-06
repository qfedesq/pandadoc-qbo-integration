import {
  formatAppVersion,
  getVersionedRepositoryName,
} from "@/lib/app-version";

describe("app version helpers", () => {
  it("formats semver as a single-decimal release badge", () => {
    expect(formatAppVersion("1.4.0")).toBe("V1.4");
  });

  it("builds the versioned repository name", () => {
    expect(getVersionedRepositoryName("pandadoc-qbo-integration", "1.0.0")).toBe(
      "pandadoc-qbo-integration-v1-0",
    );
  });
});
