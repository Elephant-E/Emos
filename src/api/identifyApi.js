import api from './index.js';

const identifyApi = {
  async identify(filename, type = 'video') {
    const result = await api.post('/api/identify', { filename, type })

    if (result.success === false) {
      throw new Error(result.message || '识别失败')
    }

    if (result.type === 'music') {
      return {
        type: 'music',
        title: result.title,
        artist: result.artist || null,
        season: null,
        episode: null
      }
    }

    return {
      type: 'video',
      item_type: result.item_type,
      item_id: result.item_id,
      title: result.title,
      season: result.season || null,
      episode: result.episode || null
    }
  },

  async identifyBatch(filenames, onProgress) {
    const results = [];
    const total = filenames.length;

    for (let i = 0; i < total; i++) {
      try {
        const result = await this.identify(filenames[i]);
        results.push({ success: true, data: result, filename: filenames[i] });

        if (onProgress) {
          onProgress(i + 1, total);
        }

        if (i < total - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        results.push({ success: false, error: error.message, filename: filenames[i] });

        if (onProgress) {
          onProgress(i + 1, total);
        }
      }
    }

    return results;
  }
};

export default identifyApi;