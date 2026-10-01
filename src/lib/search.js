import Fuse from 'fuse.js';
import { content, types } from '../data/content.js';
export const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const fuse = new Fuse(content.map(item=>({...item,searchTitle:normalize(item.title),searchMeta:normalize([item.genre,item.author,item.director,item.developer,item.creator,types[item.type],item.type].filter(Boolean).join(' '))})),{keys:[{name:'searchTitle',weight:0.75},{name:'searchMeta',weight:0.25}],threshold:0.48,ignoreLocation:true,includeScore:true});
export function searchContent(query){ const clean=normalize(query); return clean?fuse.search(clean).map(result=>result.item):content; }
