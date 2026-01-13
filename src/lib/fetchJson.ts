export async function fetchJson<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    try {
      const errorData = await res.json().catch(() => null);
      if (errorData?.error) {
        errorMessage = `${errorMessage}: ${errorData.error}`;
      }
    } catch {
      // Ignore JSON parse errors
    }
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    (error as any).url = url;
    throw error;
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text() as unknown as T;
}
