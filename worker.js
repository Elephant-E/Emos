/**
 * EMOS Worker - 前后端一体化部署
 *
 * 功能：
 * 1. 提供前端静态资源
 * 2. 代理 API 请求到 emos.best
 * 3. 支持 SPA 路由回退
 *
 * API 业务逻辑（identify / spotify）在 share/ 共享模块，dev/prod 同源。
 * 密钥一律从 env 注入，代码内零硬编码。
 */

import { identify } from './share/identify-core.js';
import { spotifySearch } from './share/spotify-core.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1.0 Cloudflare 内部路径直接跳过
    if (pathname === '/favicon.ico' || pathname.startsWith('/cdn-cgi/')) {
      return new Response(null, { status: 204 });
    }

    // ========================================
    // 1. API 请求代理
    // ========================================

    // 1.1 EMOS API 代理（转发到 emos.best）
    if (pathname.startsWith('/api/')) {
      // 1.2 视频识别 API（后端识别）
      if (pathname === '/api/identify') {
        return await handleIdentify(request, env);
      }

      // 1.3 Spotify API 代理
      if (pathname === '/api/spotify/search') {
        return await handleSpotifySearch(request, url, env);
      }

      return await handleEmosApiProxy(request, url, env);
    }

    // ========================================
    // 静态文件服务
    try {
      let assetPath = pathname;
      const isAssetRequest = pathname.includes('.');

      // 1. 优先处理独立登录页
      if (pathname === '/login' || pathname === '/login.html') {
        assetPath = '/public/login.html';
      }
      // 1.5 排除 /link 路径（不处理，返回 404）
      else if (pathname === '/link') {
        return new Response('Not Found', { status: 404 });
      }

      // 2. SPA 路由回退：其他非静态资源路径返回 index.html
      else if (pathname === '/' || (!pathname.includes('.') && !pathname.startsWith('/assets/'))) {
        assetPath = '/index.html';
      }

      // 获取资源内容
      const content = getAssetContent(assetPath);

      if (content !== null) {
        const contentType = getContentType(assetPath);
        const isHtml = assetPath.endsWith('.html');

        return new Response(content, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': isHtml
              ? 'no-cache, no-store, must-revalidate'
              : 'public, max-age=31536000, immutable',
          },
        });
      }

      if (isAssetRequest) {
        return new Response('Not Found: ' + pathname, { status: 404 });
      }

      // fallback 到 index.html
      const indexContent = getAssetContent('/index.html');
      if (indexContent !== null) {
        return new Response(indexContent, {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }

      return new Response('Not Found: ' + pathname, { status: 404 });
    } catch (error) {
      console.error('Asset fetch error:', error);
      return new Response('Internal Server Error: ' + error.message, { status: 500 });
    }
  },
};

/**
 * 视频识别 API — 薄适配，逻辑在 share/identify-core.js
 * 流程：guessit -> TMDB -> EMOS getVideoId
 */
async function handleIdentify(request, env) {
  try {
    const body = await request.json();
    const { status, body: payload } = await identify(
      body,
      {
        tmdbApiKey: env.TMDB_API_KEY || '',
        authHeader: request.headers.get('Authorization') || '',
        emosProxyName: env.EMOS_PROXY_NAME || '',
        emosProxyId: env.EMOS_PROXY_ID || '',
      }
    );
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: `识别服务内部错误: ${error.message || '未知错误'}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Spotify 搜索代理 — 薄适配，逻辑在 share/spotify-core.js
 */
async function handleSpotifySearch(request, url, env) {
  const { status, body, cacheControl } = await spotifySearch(
    {
      q: url.searchParams.get('q') || '',
      type: url.searchParams.get('type') || 'artist',
      limit: url.searchParams.get('limit') || '15',
    },
    { anonKey: env.SPOTIFY_ANON_KEY || '' }
  );
  const headers = { 'Content-Type': 'application/json' };
  if (cacheControl) headers['Cache-Control'] = cacheControl;
  return new Response(body, { status, headers });
}

/**
 * 代理 EMOS API 请求到 emos.best
 */
async function handleEmosApiProxy(request, url, env) {
  try {
    // 构建目标 URL
    const targetUrl = `https://emos.best${url.pathname}${url.search}`;

    // 复制请求头
    const headers = new Headers(request.headers);
    headers.set('Host', 'emos.best');
    headers.set('EMOS-PROXY-NAME', env.EMOS_PROXY_NAME || '@Elephant');
    headers.set('EMOS-PROXY-ID', env.EMOS_PROXY_ID || 'e7E6K6OE4s');

    // 转发请求
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });

    const contentType = response.headers.get('Content-Type') || '';
    if (response.status === 204) {
      return new Response(null, { status: 204 });
    }
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      return new Response(
        JSON.stringify({
          success: false,
          message: text || `API 请求失败: ${response.status}`,
        }),
        {
          status: response.status >= 400 ? response.status : 502,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('cf-ray');
    responseHeaders.delete('cf-cache-status');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('EMOS API proxy error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'API 代理失败: ' + error.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}