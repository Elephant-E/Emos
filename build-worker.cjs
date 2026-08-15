#!/usr/bin/env node

/**
 * 构建脚本：将 dist 目录的静态文件嵌入到 Worker 中
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const workerFile = path.join(__dirname, 'worker-with-assets.js');

// 读取所有静态文件
function readFiles(dir, baseDir = '') {
  const files = {};
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(baseDir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      Object.assign(files, readFiles(fullPath, relativePath));
    } else {
      const content = fs.readFileSync(fullPath);
      // 显式记录编码方式，避免在 Worker 中误判 CSS/JS 为 base64。
      const ext = path.extname(item).toLowerCase();
      const isText = ['.html', '.css', '.js', '.json', '.txt', '.xml'].includes(ext);
      files['/' + relativePath.replace(/\\/g, '/')] = {
        encoding: isText ? 'utf-8' : 'base64',
        content: isText ? content.toString('utf-8') : content.toString('base64'),
      };
    }
  }
  
  return files;
}

console.log('Reading static files from dist directory...');
const assets = readFiles(distDir);
console.log(`Found ${Object.keys(assets).length} files`);

// 生成 Worker 代码
const workerTemplate = fs.readFileSync(path.join(__dirname, 'worker.js'), 'utf-8');

const assetsCode = `
// Embedded static assets
const STATIC_ASSETS = ${JSON.stringify(assets, null, 2)};

function getAssetContent(assetPath) {
  const asset = STATIC_ASSETS[assetPath];
  if (!asset) return null;

  if (asset.encoding === 'base64') {
    const binaryString = atob(asset.content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  return asset.content;
}

function getContentType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const types = {
    'html': 'text/html;charset=UTF-8',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
  };
  return types[ext] || 'application/octet-stream';
}
`;

// 修改 fetch 函数以使用嵌入的资源
const modifiedWorker = workerTemplate.replace(
  /\/\/ 静态文件服务.*?\n.*?try \{[\s\S]*?\n.*?\} catch \(error\) \{[\s\S]*?\n.*?\}/m,
  `// 静态文件服务（嵌入式）
    try {
      let assetPath = pathname;
      const isAssetRequest = pathname.includes('.');
      
      // 特殊路径处理：SPA 路由回退
      if (pathname === '/' || (!pathname.includes('.') && !pathname.startsWith('/assets/'))) {
        assetPath = '/index.html';
      } else if (pathname === '/login' || pathname === '/login.html') {
        assetPath = '/login.html';
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
    }`
);

// 写入最终文件
const finalCode = assetsCode + '\n' + modifiedWorker;
fs.writeFileSync(workerFile, finalCode);

console.log(`Generated worker with embedded assets: ${workerFile}`);
console.log('Ready to deploy!');
