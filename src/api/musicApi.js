import api, { buildQuery } from './index.js';

const musicApi = {
  songList(params = {}, config = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/music/song/list?${qs}`, config);
  },

  songSearch(params = {}, config = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/music/song/search?${qs}`, config);
  },

  personList(params = {}, config = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/music/person/list?${qs}`, config);
  },

  albumList(params = {}, config = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/music/album/list?${qs}`, config);
  },

  getLyricList(songId) {
    return api.get(`/api/music/song/${songId}/lyric/list`);
  },

  createLyric(songId, data) {
    return api.post(`/api/music/song/${songId}/lyric/create`, data);
  },

  deleteLyric(songId, lyricId) {
    return api.delete(`/api/music/song/${songId}/lyric/delete?lyric_id=${lyricId}`);
  },

  getMediaList(songId) {
    return api.get(`/api/music/song/${songId}/media/list`);
  },

  deleteMedia(songId, mediaId) {
    return api.delete(`/api/music/song/${songId}/media/delete?media_id=${mediaId}`);
  },

  deleteSong(songId) {
    return api.delete(`/api/music/song/${songId}/delete`);
  },

  moveMedia(targetSongId, mediaId) {
    return api.put(`/api/music/song/${targetSongId}/media/move?media_id=${mediaId}`);
  },

  getPlayUrl(songId, mediaId) {
    return api.get(`/api/music/song/${songId}/media/playUrl?media_id=${mediaId}`);
  },

  updateSongVideoId(songId, videoId) {
    return api.put(`/api/music/song/${songId}/updateVideoId?video_id=${videoId}`);
  },

  updateAlbumVideoId(albumId, videoId) {
    return api.put(`/api/music/album/${albumId}/updateVideoId?video_id=${videoId}`);
  },

  favorite(type, value) {
    const qs = buildQuery({ type, value });
    return api.put(`/api/music/favorite?${qs}`);
  },

  rating(type, value, rating) {
    const qs = buildQuery({ type, value, rating });
    return api.put(`/api/music/rating?${qs}`);
  },

  sync(type, value) {
    const qs = buildQuery({ type, value });
    return api.patch(`/api/music/sync?${qs}`);
  },

  syncSpotifyArtist(artistId) {
    return api.patch('/api/music/syncSpotifyArtist', { artist_id: artistId });
  },

  spotifySearch(q, type = 'artist', limit = 15) {
    const qs = buildQuery({ q, type, limit });
    return api.get(`/api/spotify/search?${qs}`);
  }
};

export default musicApi;
