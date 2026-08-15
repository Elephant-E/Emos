export function getImageUrl(path) {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/original${path}`;
}

export default {
  getImageUrl,
};
