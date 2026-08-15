/**
 * Identify 业务核心 — dev (Vite middleware) / prod (Cloudflare Worker) 共用。
 *
 * 纯逻辑层：不依赖 Node 或 Worker 运行时，只依赖标准 fetch。
 * 密钥通过 opts 注入（dev 从 process.env / .env 读取，worker 从 env 读取）。
 */

const GUESSIT_URL = 'https://elephant.pythonanywhere.com/';
const EMOS_API = 'https://emos.best';

/**
 * 解析文件名 → { success, ... }。
 * 流程：guessit → (music 提前返回 | TMDB → EMOS getVideoId)
 *
 * @param {object} input { filename, type?: 'video'|'music' }
 * @param {object} opts
 *   - tmdbApiKey: string 必填
 *   - authHeader: string 客户端透传的 Authorization（可为空）
 *   - emosProxyName / emosProxyId: EMOS 代理标识
 * @returns {Promise<{status:number, body:object}>}
 */
export async function identify(input, opts) {
  const { filename, type = 'video' } = input || {};
  const {
    tmdbApiKey,
    authHeader = '',
    emosProxyName = '',
    emosProxyId = '',
  } = opts || {};

  if (!filename) {
    return { status: 400, body: { success: false, message: '文件名不能为空' } };
  }

  // Step 1: Guessit 解析文件名
  let guessitResult;
  try {
    const guessitUrl = `${GUESSIT_URL}?filename=${encodeURIComponent(filename)}`;
    const guessitResponse = await fetch(guessitUrl);
    if (!guessitResponse.ok) {
      return {
        status: 502,
        body: { success: false, message: `Guessit 解析服务异常 (HTTP ${guessitResponse.status})` },
      };
    }
    guessitResult = await guessitResponse.json();
  } catch (e) {
    return {
      status: 502,
      body: { success: false, message: `Guessit 解析服务不可用: ${e.message}` },
    };
  }

  if (!guessitResult.title) {
    return {
      status: 400,
      body: { success: false, message: `Guessit 无法解析文件名: ${guessitResult.message || '未识别出标题'}` },
    };
  }

  // 音乐文件：仅走 guessit，解析出 artist 和 title
  if (type === 'music') {
    const rawTitle = guessitResult.title;
    let artist = null;
    let title = rawTitle;

    // 常见格式: "Artist - Title" / "Artist—Title" / "Artist – Title"
    const separatorMatch = rawTitle.match(/^(.+?)\s*[-—–]\s*(.+)$/);
    if (separatorMatch) {
      artist = separatorMatch[1].trim();
      title = separatorMatch[2].trim();
    }
    if (!artist && guessitResult.alternative_title) {
      artist = guessitResult.alternative_title;
    }

    return {
      status: 200,
      body: { success: true, type: 'music', title, artist, season: null, episode: null },
    };
  }

  const guessitTitle = guessitResult.title;
  const isMovie = guessitResult.type === 'movie';
  const season = guessitResult.season || null;
  const episode = guessitResult.episode || null;

  // Step 2: TMDB 搜索
  let tmdbData;
  const tmdbType = isMovie ? 'movie' : 'tv';
  try {
    const tmdbUrl = `https://api.themoviedb.org/3/search/${tmdbType}?query=${encodeURIComponent(guessitTitle)}&api_key=${tmdbApiKey}&language=zh-CN`;
    const tmdbResponse = await fetch(tmdbUrl);
    if (!tmdbResponse.ok) {
      const errData = await tmdbResponse.json().catch(() => ({}));
      return {
        status: 502,
        body: {
          success: false,
          message: `TMDB 搜索失败 (HTTP ${tmdbResponse.status}): ${errData.status_message || '未知错误'}`,
        },
      };
    }
    tmdbData = await tmdbResponse.json();
  } catch (e) {
    return {
      status: 502,
      body: { success: false, message: `TMDB 搜索服务不可用: ${e.message}` },
    };
  }

  if (!tmdbData.results || tmdbData.results.length === 0) {
    return {
      status: 404,
      body: {
        success: false,
        message: `TMDB 未找到 "${guessitTitle}" (${isMovie ? '电影' : '剧集'})，请手动编辑关联`,
      },
    };
  }

  const tmdbId = tmdbData.results[0].id;

  // Step 3: EMOS getVideoId
  let videoIdResult;
  try {
    const getVideoIdParams = new URLSearchParams({
      video_id_type: 'tmdb',
      video_id_value: String(tmdbId),
      tmdb_type: tmdbType,
    });
    if (!isMovie && season) getVideoIdParams.set('season_number', String(season));
    if (!isMovie && episode) getVideoIdParams.set('episode_number', String(episode));

    const getVideoIdUrl = `${EMOS_API}/api/video/getVideoId?${getVideoIdParams.toString()}`;
    const emosHeaders = {};
    if (authHeader) emosHeaders['Authorization'] = authHeader;
    if (emosProxyName) emosHeaders['EMOS-PROXY-NAME'] = emosProxyName;
    if (emosProxyId) emosHeaders['EMOS-PROXY-ID'] = emosProxyId;

    const videoIdResponse = await fetch(getVideoIdUrl, { headers: emosHeaders });
    if (!videoIdResponse.ok) {
      const errText = await videoIdResponse.text().catch(() => '');
      return {
        status: 502,
        body: {
          success: false,
          message: `EMOS 查询失败 (HTTP ${videoIdResponse.status}): ${errText.substring(0, 200)}`,
        },
      };
    }
    videoIdResult = await videoIdResponse.json();
  } catch (e) {
    return {
      status: 502,
      body: { success: false, message: `EMOS 查询服务不可用: ${e.message}` },
    };
  }

  if (videoIdResult.success === false) {
    return {
      status: 404,
      body: { success: false, message: `EMOS 数据库中未找到该视频，请先同步视频到 EMOS` },
    };
  }

  // 处理返回结果
  let itemType, itemId, displayTitle;

  if (isMovie) {
    itemType = videoIdResult.item_type;
    itemId = videoIdResult.item_id;
    displayTitle = videoIdResult.video_title || guessitTitle;
  } else {
    if (episode && videoIdResult.episode_info) {
      itemType = videoIdResult.episode_info.item_type;
      itemId = videoIdResult.episode_info.item_id;
      displayTitle = `${videoIdResult.video_title} • S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
    } else if (season && videoIdResult.season_info) {
      itemType = videoIdResult.season_info.item_type;
      itemId = videoIdResult.season_info.item_id;
      displayTitle = `${videoIdResult.video_title} • S${String(season).padStart(2, '0')}`;
    } else {
      itemType = videoIdResult.item_type;
      itemId = videoIdResult.item_id;
      displayTitle = videoIdResult.video_title || guessitTitle;
    }
  }

  if (!itemType || !itemId) {
    return {
      status: 404,
      body: {
        success: false,
        message: `未找到对应的 EMOS 视频 (TMDB ID: ${tmdbId})，请手动编辑关联`,
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      item_type: itemType,
      item_id: itemId,
      title: displayTitle,
      season,
      episode,
    },
  };
}