export function spotifySearch(
  params: { q?: string; type?: string; limit?: string },
  opts: { anonKey: string },
): Promise<{ status: number; body: string; cacheControl?: string }>
