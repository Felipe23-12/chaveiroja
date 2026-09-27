import json, re, urllib.request, urllib.error, datetime, pathlib, time
root=pathlib.Path('/app')
s=(root/'base44/shared/vehicleModelYears.ts').read_text()
families=[x for x in json.loads(re.search(r'VEHICLE_MODEL_YEARS = (\[.*?\]);',s).group(1)) if x.get('min') and x.get('max')]
base='https://fipe.parallelum.com.br/api/v2'
calls=0
rows=[]
start=json.loads(pathlib.Path('/tmp/fipe_seed.json').read_text())['cursor'] if pathlib.Path('/tmp/fipe_seed.json').exists() else [0,0,0]
cursor=list(start)
def norm(x): return re.sub(r'[^a-z0-9]+',' ',str(x).lower()).strip()
def api(path, ref=''):
 global calls
 calls+=1
 u=base+path+('?reference='+str(ref) if ref else '')
 try:
  with urllib.request.urlopen(urllib.request.Request(u,headers={'Accept':'application/json','User-Agent':'ChaveiroJa-Catalog/1.0'}),timeout=20) as r: return json.load(r)
 except urllib.error.HTTPError as e:
  raise RuntimeError('HTTP '+str(e.code)+' '+path+'; remaining '+str(e.headers.get('x-ratelimit-remaining')))
try:
 refs=api('/references')
 ref=refs[0]['code']
 brands=api('/cars/brands',ref)
 for fi,family in enumerate(families):
  if fi<start[0]: continue
  if calls>=103: break
  brand=next((b for b in brands if norm(b['name'])==norm(family['make']) or (family['make']=='Chevrolet' and norm(b['name'])=='gm chevrolet') or (family['make']=='Volkswagen' and norm(b['name'])=='vw volkswagen')),None)
  if not brand: cursor=[fi+1,0,0]; continue
  models=api('/cars/brands/'+str(brand['code'])+'/models',ref)
  candidates=[m for m in models if norm(m['name'])==norm(family['model']) or norm(m['name']).startswith(norm(family['model'])+' ')]
  for mi,m in enumerate(candidates):
   if fi==start[0] and mi<start[1]: continue
   if calls>=103: cursor=[fi,mi,0]; break
   years=api('/cars/brands/'+str(brand['code'])+'/models/'+str(m['code'])+'/years',ref)
   years=[y for y in years if family['min']<=int(y['code'][:4])<=min(family['max'],2027)]
   for yi,y in enumerate(years):
    if fi==start[0] and mi==start[1] and yi<start[2]: continue
    if calls>=103: cursor=[fi,mi,yi]; break
    path='/cars/brands/'+str(brand['code'])+'/models/'+str(m['code'])+'/years/'+y['code']
    d=api(path,ref)
    try: price=float(re.sub(r'[^0-9,]','',d['price']).replace(',','.'))
    except: continue
    if not re.fullmatch(r'\d{6}-\d',d.get('codeFipe','')) or price<1000: continue
    now=datetime.datetime.now(datetime.timezone.utc)
    rows.append(dict(code_fipe=d['codeFipe'],year_code=y['code'],model_year=d['modelYear'],brand=d['brand'],model=d['model'],price=price,reference_month=d['referenceMonth'],reference_code=str(ref),source_url=base+path+'?reference='+str(ref),checked_at=now.isoformat(),next_check_at=(now+datetime.timedelta(days=20)).isoformat()))
   else: continue
   break
  else: cursor=[fi+1,0,0];continue
  break
except Exception as exc: print('error',str(exc),flush=True)
pathlib.Path('/tmp/fipe_seed.json').write_text(json.dumps({'calls':calls,'rows':rows,'cursor':cursor,'reference':str(ref) if 'ref' in locals() else ''},ensure_ascii=False))
print(json.dumps({'calls':calls,'rows':len(rows),'cursor':cursor,'first':rows[0]['model'] if rows else None},ensure_ascii=False))
