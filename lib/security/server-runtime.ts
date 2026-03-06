export function assertServerRuntime(moduleName: string) {
  if (typeof window !== "undefined") {
    throw new Error(`${moduleName} is server-only and cannot run in the browser.`);
  }
}
