export function hasInstagramShareIdentifier(value: string): boolean {
  try {
    return new URL(value.trim()).searchParams.has("igsh");
  } catch {
    return false;
  }
}

export function removeInstagramShareIdentifier(value: string): string {
  try {
    const parsed = new URL(value.trim());
    parsed.searchParams.delete("igsh");
    return parsed.toString();
  } catch {
    return value;
  }
}
