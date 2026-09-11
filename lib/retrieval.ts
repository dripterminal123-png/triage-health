import documents from './knowledge/documents.json';
import chunks from './knowledge/chunks.json';
export { documents };
const stop=new Set('the and for with that this have from what how does about there they been your you are was has but can its now some very into when want need please also just feel feeling'.split(' '));
const terms=(s:string)=>s.toLowerCase().match(/[a-z0-9]+/g)?.filter(t=>t.length>2&&!stop.has(t))||[];
export function retrieve(query:string,limit=7){
 const q=[...new Set(terms(query))];
 const expanded=[...q];
 const synonyms:Record<string,string[]>= {tummy:['abdominal','diarrhea'],stomach:['abdominal','diarrhea'],breath:['breathing','asthma'],breathing:['asthma','respiratory'],sugar:['glucose','hypoglycemia'],pregnant:['pregnancy','maternal'],baby:['infant','child'],worried:['anxiety','stress'],headache:['headache','stroke'],allergic:['allergy','anaphylaxis']};
 for(const t of q)expanded.push(...(synonyms[t]||[]));
 const scored=chunks.map(c=>{const d=documents.find(d=>d.id===c.sourceId)!;const ts=terms(c.text);let score=0;for(const t of new Set(expanded)){const tf=ts.filter(w=>w===t).length;if(tf)score+=(1+Math.log(tf))/(1+ts.length/300);if(terms(d.title).includes(t))score+=1.8;}return {...c,document:d,score};}).filter(c=>c.score>0).sort((a,b)=>b.score-a.score);
 const counts:Record<string,number>={};return scored.filter(c=>{counts[c.sourceId]=(counts[c.sourceId]||0)+1;return counts[c.sourceId]<=2}).slice(0,limit).map((c,i)=>({...c,label:'S'+(i+1)}));
}
