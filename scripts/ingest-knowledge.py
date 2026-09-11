"""Refresh the allowlisted public-health corpus. Requires Python and pdftotext."""
import urllib.request,urllib.parse,re,json,subprocess,hashlib,concurrent.futures
from pathlib import Path
from html import unescape
ROOT=Path(__file__).resolve().parents[1]
SOURCES=[
('stroke','Stroke warning signs','CDC','Emergency','https://www.cdc.gov/stroke/signs-symptoms/index.html'),
('sepsis','Recognizing sepsis','CDC','Emergency','https://www.cdc.gov/sepsis/about/index.html'),
('flu','Flu symptoms and warning signs','CDC','Everyday health','https://www.cdc.gov/flu/signs-symptoms/index.html'),
('fever','Fever in children and adults','MedlinePlus','Children & family','https://medlineplus.gov/ency/article/003090.htm'),
('allergy','Severe allergic reactions','MedlinePlus','Emergency','https://medlineplus.gov/ency/article/000844.htm'),
('diarrhea','Diarrhea and dehydration','NIDDK','Everyday health','https://www.niddk.nih.gov/health-information/digestive-diseases/diarrhea/symptoms-causes'),
('glucose','Low blood glucose','NIDDK','Long-term conditions','https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/low-blood-glucose-hypoglycemia'),
('heat','Heat and your health','CDC','Everyday health','https://www.cdc.gov/heat-health/about/index.html'),
('maternal','Urgent maternal warning signs','CDC','Children & family','https://www.cdc.gov/hearher/maternal-warning-signs/index.html'),
('medicine','Acetaminophen safety','FDA','Medicines','https://www.fda.gov/drugs/safe-use-over-counter-pain-relievers-and-fever-reducers/acetaminophen'),
('stress','Stress and anxiety','NIMH','Mental wellbeing','https://www.nimh.nih.gov/health/publications/so-stressed-out-fact-sheet'),
('mental','Caring for your mental health','NIMH','Mental wellbeing','https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health'),
('asthma','Asthma attacks','NHLBI','Long-term conditions','https://www.nhlbi.nih.gov/health/asthma/attacks'),
('pregnancy-pdf','Maternal warning signs poster','CDC','Children & family','https://www.cdc.gov/hearher/resources/download-share/docs/pdf/Warning-Signs-Poster-LTR-English.pdf'),
('pregnancy-guide','Talking about maternal warning signs','CDC','Children & family','https://www.cdc.gov/hearher/docs/pdf/CDC-Hear-Her-Womens-urgent-warning-signs-h.pdf'),
('depression','Understanding depression','NIMH','Mental wellbeing','https://www.nimh.nih.gov/health/publications/depression'),
('suicide','5 action steps to help someone in emotional pain','NIMH','Mental wellbeing','https://www.nimh.nih.gov/health/publications/5-action-steps-for-helping-someone-in-emotional-pain')]
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
 with urllib.request.urlopen(req,timeout=30) as r:return r.read(),r.headers.get('Content-Type','')
def pdftext(raw,id):
 p=ROOT/'public/references'/f'{id}.pdf';p.write_bytes(raw)
 txt=subprocess.check_output(['pdftotext','-layout',str(p),'-']).decode()
 return [{'page':i+1,'text':re.sub(r'\s+',' ',t).strip()} for i,t in enumerate(txt.split('\f')) if t.strip()],'/references/'+id+'.pdf'
def ingest(s):
 id,title,publisher,category,url=s
 try:
  raw,ct=get(url); pdf='application/pdf' in ct or raw.startswith(b'%PDF'); local=None
  if pdf: pages,local=pdftext(raw,id)
  else:
   html=raw.decode('utf-8',errors='replace')
   m=re.search(r'<main\b[^>]*>(.*?)</main>',html,re.S|re.I);body=m.group(1) if m else html
   body=re.sub(r'<(script|style|nav|header|footer)\b[^>]*>.*?</\1>',' ',body,flags=re.S|re.I)
   text=unescape(re.sub('<[^>]+>',' ',body));text=re.sub(r'\s+',' ',text).strip()
   pages=[{'page':None,'text':text}]
  if sum(len(p['text']) for p in pages)<100: raise ValueError('No extractable text')
  result=[dict(id=id,title=title,publisher=publisher,category=category,url=url,format='PDF' if pdf else 'Article',local=local,checked='2026-09-09',sha256=hashlib.sha256(raw).hexdigest(),pages=pages)]
  if not pdf and publisher=='NIMH':
   links=re.findall(r'href=["\']([^"\']+\.pdf(?:\?[^"\']*)?)["\']',html,re.I)
   if links:
    u=urllib.parse.urljoin(url,unescape(links[0]));data,_=get(u)
    if data.startswith(b'%PDF'):
     pp,ll=pdftext(data,id+'-pdf');result.append(dict(id=id+'-pdf',title=title+' — fact sheet',publisher=publisher,category=category,url=u,format='PDF',local=ll,checked='2026-09-09',sha256=hashlib.sha256(data).hexdigest(),pages=pp))
  return result
 except Exception as e: print('FAILED',id,str(e));return []
if __name__=='__main__':
 docs=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  for r in pool.map(ingest,SOURCES):docs+=r
 chunks=[]
 for d in docs:
  for p in d.pop('pages'):
   words=p['text'].split()
   for start in range(0,len(words),240):
    chunk=' '.join(words[start:start+300])
    if len(chunk)>80:chunks.append(dict(id=d['id']+'-'+str(len(chunks)),sourceId=d['id'],page=p['page'],text=chunk))
 (ROOT/'lib/knowledge/documents.json').write_text(json.dumps(docs,indent=2))
 (ROOT/'lib/knowledge/chunks.json').write_text(json.dumps(chunks))
 print(json.dumps({'documents':len(docs),'pdfs':sum(d['format']=='PDF' for d in docs),'chunks':len(chunks),'titles':[d['title'] for d in docs]}))
