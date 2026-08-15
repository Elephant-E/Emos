import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'login-rewrite',
      configureServer(server) {
        server.middlewares.use((req: any, res: any, next: any) => {
          if (req.url && (req.url === '/login' || req.url.startsWith('/login?'))) {
            req.url = req.url.replace('/login', '/login.html')
          }
          next()
        })
      }
    },
    {
      name: 'identify-api',
      configureServer(server) {
        server.middlewares.use(async (req: any, res: any, next: any) => {
          if (req.url === '/api/identify' && req.method === 'POST') {
            try {
              const chunks: Buffer[] = []
              for await (const chunk of req) {
                chunks.push(chunk)
              }
              const body = JSON.parse(Buffer.concat(chunks).toString())
               const filename = body.filename
               const fileType = body.type || 'video'
               
               if (!filename) {
                 res.statusCode = 400
                 res.setHeader('Content-Type', 'application/json')
                 res.end(JSON.stringify({ success: false, message: '文件名不能为空' }))
                 return
               }
               
               // Step 1: Guessit
               let guessitResult
               try {
                 const guessitUrl = `https://elephant.pythonanywhere.com/?filename=${encodeURIComponent(filename)}`
                 const guessitResponse = await fetch(guessitUrl)
                 if (!guessitResponse.ok) {
                   res.statusCode = 502
                 res.setHeader('Content-Type', 'application/json')
                   res.end(JSON.stringify({ success: false, message: `Guessit 解析服务异常 (HTTP ${guessitResponse.status})` }))
                   return
                 }
                 guessitResult = await guessitResponse.json()
               } catch (e: any) {
                 res.statusCode = 502
                 res.setHeader('Content-Type', 'application/json')
                 res.end(JSON.stringify({ success: false, message: `Guessit 解析服务不可用: ${e.message}` }))
                 return
               }
               
               if (!guessitResult.title) {
                 res.statusCode = 400
                 res.setHeader('Content-Type', 'application/json')
                 res.end(JSON.stringify({ success: false, message: `Guessit 无法解析文件名: ${guessitResult.message || '未识别出标题'}` }))
                 return
               }
               
               // 音乐文件：仅走 guessit，解析出 title 和 artist
               if (fileType === 'music') {
                 const rawTitle = guessitResult.title
                 let artist: string | null = null
                 let title = rawTitle
                 
                 const separatorMatch = rawTitle.match(/^(.+?)\s*[-—–]\s*(.+)$/)
                 if (separatorMatch) {
                   artist = separatorMatch[1].trim()
                   title = separatorMatch[2].trim()
                 }
                 if (!artist && guessitResult.alternative_title) {
                   artist = guessitResult.alternative_title
                 }
                 
                 res.statusCode = 200
                 res.setHeader('Content-Type', 'application/json')
                 res.end(JSON.stringify({ success: true, type: 'music', title, artist, season: null, episode: null }))
                 return
               }
               
               // 视频文件：走完整 guessit → TMDB → EMOS 流程
               const guessitTitle = guessitResult.title
              const isMovie = guessitResult.type === 'movie'
              const season = guessitResult.season || null
              const episode = guessitResult.episode || null
              
              // Step 2: TMDB
              let tmdbData
              const tmdbType = isMovie ? 'movie' : 'tv'
              try {
                const tmdbApiKey = 'REDACTED_TMDB'
                const tmdbUrl = `https://api.themoviedb.org/3/search/${tmdbType}?query=${encodeURIComponent(guessitTitle)}&api_key=${tmdbApiKey}&language=zh-CN`
                
                const tmdbResponse = await fetch(tmdbUrl)
                if (!tmdbResponse.ok) {
                  const errData = await tmdbResponse.json().catch(() => ({}))
                  res.statusCode = 502
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: false, message: `TMDB 搜索失败 (HTTP ${tmdbResponse.status}): ${errData.status_message || '未知错误'}` }))
                  return
                }
                tmdbData = await tmdbResponse.json()
              } catch (e: any) {
                res.statusCode = 502
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, message: `TMDB 搜索服务不可用: ${e.message}` }))
                return
              }
              
              if (!tmdbData.results || tmdbData.results.length === 0) {
                res.statusCode = 404
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, message: `TMDB 未找到匹配结果: "${guessitTitle}" (${isMovie ? '电影' : '剧集'})` }))
                return
              }
              
              const tmdbId = tmdbData.results[0].id
              
              // Step 3: EMOS getVideoId
              let videoIdResult
              try {
                const getVideoIdParams = new URLSearchParams({
                  video_id_type: 'tmdb',
                  video_id_value: String(tmdbId),
                  tmdb_type: tmdbType
                })
                
                if (!isMovie && season) {
                  getVideoIdParams.set('season_number', String(season))
                }
                if (!isMovie && episode) {
                  getVideoIdParams.set('episode_number', String(episode))
                }
                
                const getVideoIdUrl = `https://emos.best/api/video/getVideoId?${getVideoIdParams.toString()}`
                
                const authHeader = req.headers['authorization'] || req.headers['Authorization']
                const emosHeaders: HeadersInit = {}
                if (authHeader) {
                  emosHeaders['Authorization'] = authHeader
                }
                
                const videoIdResponse = await fetch(getVideoIdUrl, { headers: emosHeaders })
                if (!videoIdResponse.ok) {
                  const errText = await videoIdResponse.text().catch(() => '')
                  res.statusCode = 502
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: false, message: `EMOS 查询失败 (HTTP ${videoIdResponse.status}): ${errText.substring(0, 200)}` }))
                  return
                }
                videoIdResult = await videoIdResponse.json()
              } catch (e: any) {
                res.statusCode = 502
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, message: `EMOS 查询服务不可用: ${e.message}` }))
                return
              }
              
              if (videoIdResult.success === false) {
                res.statusCode = 404
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, message: `EMOS 匹配失败: ${videoIdResult.message || '未知原因'}` }))
                return
              }
              
              let itemType, itemId, displayTitle
              
              if (isMovie) {
                itemType = videoIdResult.item_type
                itemId = videoIdResult.item_id
                displayTitle = videoIdResult.video_title || guessitTitle
              } else {
                if (episode && videoIdResult.episode_info) {
                  itemType = videoIdResult.episode_info.item_type
                  itemId = videoIdResult.episode_info.item_id
                  displayTitle = `${videoIdResult.video_title} • S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
                } else if (season && videoIdResult.season_info) {
                  itemType = videoIdResult.season_info.item_type
                  itemId = videoIdResult.season_info.item_id
                  displayTitle = `${videoIdResult.video_title} • S${String(season).padStart(2, '0')}`
                } else {
                  itemType = videoIdResult.item_type
                  itemId = videoIdResult.item_id
                  displayTitle = videoIdResult.video_title || guessitTitle
                }
              }
              
              if (!itemType || !itemId) {
                res.statusCode = 404
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, message: `EMOS 匹配结果不完整: 缺少 item_type 或 item_id (TMDB ID: ${tmdbId})` }))
                return
              }
              
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                success: true,
                item_type: itemType,
                item_id: itemId,
                title: displayTitle,
                season: season,
                episode: episode
              }))
            } catch (error: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, message: `识别服务内部错误: ${error.message || '未知错误'}` }))
            }
            return
          }
          

          // Spotify 搜索代理
          if (req.url?.startsWith('/api/spotify/search') && req.method === 'GET') {
            try {
              const spotifyUrl = new URL(req.url, 'http://localhost')
              const q = spotifyUrl.searchParams.get('q')
              const type = spotifyUrl.searchParams.get('type') || 'artist'
              const limit = spotifyUrl.searchParams.get('limit') || '15'
              if (!q) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, message: '缺少搜索参数 q' }))
                return
              }
              const anonKey = 'REDACTED_SPOTIFY'
              const tokenRes = await fetch('https://flxgjwpkztgpdywkgckk.supabase.co/functions/v1/spotify-token', {
                method: 'POST',
                headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey, 'Content-Type': 'application/json' },
                body: '{}',
              })
              const tokenData = await tokenRes.json() as any
              const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`, {
                headers: { 'Authorization': 'Bearer ' + tokenData.access_token },
              })
              const searchData = await searchRes.text()
              res.statusCode = searchRes.status
              res.setHeader('Content-Type', 'application/json')
              res.end(searchData)
            } catch (e: any) {
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, message: 'Spotify 搜索失败: ' + e.message }))
            }
            return
          }

          next()
        })
      }
    }
  ],
  esbuild: {
    drop: ['console', 'debugger']
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'https://emos.best',
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {

    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        login: fileURLToPath(new URL('./public/login.html', import.meta.url))
      }
    }
  }
})
