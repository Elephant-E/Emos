export function identify(
  input: { filename?: string; type?: 'video' | 'music' },
  opts: { tmdbApiKey: string; authHeader?: string; emosProxyName?: string; emosProxyId?: string },
): Promise<{ status: number; body: Record<string, unknown> }>
