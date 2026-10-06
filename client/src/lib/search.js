import Fuse from 'fuse.js';
import { types } from '../data/content.js';
export const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
export function searchContent(query, content = []) {
  const clean = normalize(query);
  if (!clean) return content;
  const fuse = new Fuse(
    content.map((item) => ({
      ...item,
      searchTitle: normalize(item.title),
      searchMeta: normalize(
        [
          item.genre,
          item.author,
          item.director,
          item.developer,
          item.creator,
          types[item.type],
          item.type,
        ]
          .filter(Boolean)
          .join(' '),
      ),
    })),
    {
      keys: [
        { name: 'searchTitle', weight: 0.75 },
        { name: 'searchMeta', weight: 0.25 },
      ],
      threshold: 0.48,
      ignoreLocation: true,
    },
  );
  return fuse.search(clean).map((result) => result.item);
}
