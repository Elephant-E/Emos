import { createApi } from './factory.js'
import { buildQuery } from './index.js'

const musicApi = createApi({
  songList: {
    method: 'get',
    url: (params = {}) => `/api/music/song/list?${buildQuery(params)}`,
    passConfig: true,
  },
  songSearch: {
    method: 'get',
    url: (params = {}) => `/api/music/song/search?${buildQuery(params)}`,
    passConfig: true,
  },
  personList: {
    method: 'get',
    url: (params = {}) => `/api/music/person/list?${buildQuery(params)}`,
    passConfig: true,
  },
  albumList: {
    method: 'get',
    url: (params = {}) => `/api/music/album/list?${buildQuery(params)}`,
    passConfig: true,
  },
  getLyricList: {
    method: 'get',
    url: (songId) => `/api/music/song/${songId}/lyric/list`,
  },
  createLyric: {
    method: 'post',
    url: (songId) => `/api/music/song/${songId}/lyric/create`,
    body: (songId, data) => data,
  },
  deleteLyric: {
    method: 'delete',
    url: (songId, lyricId) => `/api/music/song/${songId}/lyric/delete?lyric_id=${lyricId}`,
  },
  getMediaList: {
    method: 'get',
    url: (songId) => `/api/music/song/${songId}/media/list`,
  },
  deleteMedia: {
    method: 'delete',
    url: (songId, mediaId) => `/api/music/song/${songId}/media/delete?media_id=${mediaId}`,
  },
  deleteSong: {
    method: 'delete',
    url: (songId) => `/api/music/song/${songId}/delete`,
  },
  moveMedia: {
    method: 'put',
    url: (targetSongId, mediaId) => `/api/music/song/${targetSongId}/media/move?media_id=${mediaId}`,
  },
  getPlayUrl: {
    method: 'get',
    url: (songId, mediaId) => `/api/music/song/${songId}/media/playUrl?media_id=${mediaId}`,
  },
  updateSongVideoId: {
    method: 'put',
    url: (songId, videoId) => `/api/music/song/${songId}/updateVideoId?video_id=${videoId}`,
  },
  updateAlbumVideoId: {
    method: 'put',
    url: (albumId, videoId) => `/api/music/album/${albumId}/updateVideoId?video_id=${videoId}`,
  },
  favorite: {
    method: 'put',
    url: (type, value) => `/api/music/favorite?${buildQuery({ type, value })}`,
  },
  rating: {
    method: 'put',
    url: (type, value, rating) => `/api/music/rating?${buildQuery({ type, value, rating })}`,
  },
  sync: {
    method: 'patch',
    url: (type, value) => `/api/music/sync?${buildQuery({ type, value })}`,
  },
  syncSpotifyArtist: {
    method: 'patch',
    url: '/api/music/syncSpotifyArtist',
    body: (artistId) => ({ artist_id: artistId }),
  },
  spotifySearch: {
    method: 'get',
    url: (q, type = 'artist', limit = 15) => `/api/spotify/search?${buildQuery({ q, type, limit })}`,
  },
})

export default musicApi
