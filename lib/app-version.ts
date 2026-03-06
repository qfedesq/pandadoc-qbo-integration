import packageJson from "@/package.json";

export const APP_SEMVER = packageJson.version;

export function formatAppVersion(version = APP_SEMVER) {
  const [major = "0", minor = "0"] = version.split(".");
  return `V${major}.${minor}`;
}

export function getVersionedRepositoryName(
  baseName = "pandadoc-qbo-integration",
  version = APP_SEMVER,
) {
  const [major = "0", minor = "0"] = version.split(".");
  return `${baseName}-v${major}-${minor}`;
}

export const APP_DISPLAY_VERSION = formatAppVersion();
export const VERSIONED_REPOSITORY_NAME = getVersionedRepositoryName();
