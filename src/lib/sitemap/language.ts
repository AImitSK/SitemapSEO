export function detectLanguage(
  url: string,
  siteLanguages: string[],
  primaryLanguage: string,
): string {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return primaryLanguage;
  }
  const firstSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!firstSegment) {
    return primaryLanguage;
  }
  const normalizedLanguages = siteLanguages.map((l) => l.toLowerCase());
  if (
    firstSegment.length === 2 &&
    normalizedLanguages.includes(firstSegment) &&
    firstSegment !== primaryLanguage.toLowerCase()
  ) {
    return firstSegment;
  }
  return primaryLanguage;
}
