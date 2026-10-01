import { useState } from 'react';
import { readStorage, writeStorage } from '../lib/storage';
import { content } from '../data/content';
export function useWatchlist(){
 const [ids,setIds]=useState(()=>readStorage('entre-lineas-list',[],v=>Array.isArray(v)&&v.every(id=>content.some(c=>c.id===id))));
 const [error,setError]=useState('');
 const update=fn=>setIds(previous=>{const next=fn(previous);if(!writeStorage('entre-lineas-list',next))setError('No pudimos guardar tu lista en este navegador. Se conservará durante esta sesión.');return next;});
 return {ids,error,add:id=>update(p=>p.includes(id)?p:[...p,id]),remove:id=>update(p=>p.filter(x=>x!==id)),restore:(id,index)=>update(p=>p.includes(id)?p:[...p.slice(0,index),id,...p.slice(index)])};
}
