/** Screenshot was removed by the 24h storage retention job. */
export function isScreenshotPurged(path: string | null | undefined): boolean {
  if (!path) return true;
  return path === "purged" || path.startsWith("purged/");
}

export function isScreenshotAvailable(path: string | null | undefined): boolean {
  return !!path && !isScreenshotPurged(path);
}
