/**
 * EMOS Worker - 前后端单体部署
 * 
 * 功能：
 * 1. 托管前端静态文件（Vue SPA + login.html）
 * 2. API 代理：转发 /api/* 请求到后端服务器
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    
    // API 代理：转发所有 /api/* 请求到 EMOS Backend
    if (pathname.startsWith('/api/')) {
      const backendUrl = `${env.EMOS_BACKEND || 'https://emos.best'}${pathname}${url.search}`;
      
      // 构建请求头（保留 Authorization）
      const headers = new Headers(request.headers);
      headers.set('Host', new URL(env.EMOS_BACKEND || 'https://emos.best').host);
      
      try {
        // 克隆请求以读取 body
        let body = undefined;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          body = await request.text();
          if (body) {
            headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
          }
        }
        
        const response = await fetch(backendUrl, {
          method: request.method,
          headers: headers,
          body: body,
        });
        
        return response;
      } catch (error) {
        console.error('API Proxy Error:', error);
        return new Response(JSON.stringify({ error: 'Backend service unavailable' }), {
          status: 502,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }
    
    // 静态文件服务（由 Cloudflare Assets 自动处理）
    // - index.html (SPA 入口)
    // - login.html (登录页)
    // - assets/* (CSS, JS, 图片等)
    return env.ASSETS.fetch(request);
  },
};
