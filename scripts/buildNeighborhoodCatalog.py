import json,struct,math,collections,unicodedata,re,pathlib
root=pathlib.Path('/app/base44/shared/neighborhoodData')
areas=json.load(open('/tmp/neighborhood_service_areas.json'))
def norm(s):return re.sub('[^a-z0-9]+',' ',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip()
def inside(x,y,r):
 v=False
 for a,b in zip(r,r[1:]+r[:1]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:v=not v
 return v
for a in areas:
 a['city']=a['name'].split(',')[0];p=[p for r in a['polygons'] for p in r];a['bbox']=[min(x[0] for x in p),min(x[1] for x in p),max(x[0] for x in p),max(x[1] for x in p)]
def cityat(x,y):
 for a in areas:
  b=a['bbox']
  if not(b[0]<=x<=b[2] and b[1]<=y<=b[3]):continue
  if any(inside(x,y,r) and not any(inside(x,y,h) for h in (a.get('polygon_holes') or [[]]*len(a['polygons']))[i]) for i,r in enumerate(a['polygons'])):return a['city']
 return None
names=json.load(open('/tmp/sp_bairros_names.json'));b=open('/tmp/sp_bairros/SP_bairros_CD2022.shp','rb').read();pos=100;features={};geometries={};cities={a['city'] for a in areas};idx=0
while pos<len(b):
 no,length=struct.unpack_from('>2i',b,pos);d=b[pos+8:pos+8+length*2];pos+=8+length*2;r=names[idx];idx+=1
 if r['NM_MUN'] not in cities:continue
 typ=struct.unpack_from('<i',d)[0]
 if typ!=5:raise ValueError(typ)
 np,nv=struct.unpack_from('<2i',d,36);parts=list(struct.unpack_from('<%di'%np,d,44))+[nv];pts=[list(struct.unpack_from('<2d',d,44+np*4+i*16)) for i in range(nv)]
 rings=[[[round(x,7),round(y,7)] for x,y in pts[parts[i]:parts[i+1]]] for i in range(np)]
 key='ibge_'+r['CD_BAIRRO'];bbox=list(struct.unpack_from('<4d',d,4))
 if key in features:geometries[key]+=rings;continue
 features[key]={'id':key,'name':r['NM_BAIRRO'],'city':r['NM_MUN'],'state':'SP','source':'IBGE Censo 2022','source_url':'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/bairros/shp/UF/SP_bairros_CD2022.zip','lat':round((bbox[1]+bbox[3])/2,7),'lng':round((bbox[0]+bbox[2])/2,7),'boundary_verified':True};geometries[key]=rings
official_keys={(norm(r['city']),norm(r['name'])) for r in features.values()}
seen={}
for item in json.load(open('/tmp/osm_neighborhoods.json')).get('elements',[]):
 tag=item.get('tags',{});name=tag.get('name');p=item if 'lat' in item else item.get('center',{})
 if not name or 'lat' not in p:continue
 city=cityat(p['lon'],p['lat'])
 if not city:continue
 key=(norm(city),norm(name))
 if key in official_keys or any(math.hypot((p['lat']-lat)*111.2,(p['lon']-lng)*102)<0.3 for lat,lng in seen.get(key,[])):continue
 seen.setdefault(key,[]).append((p['lat'],p['lon']));id='osm_'+item['type']+'_'+str(item['id'])
 features[id]={'id':id,'name':name,'city':city,'state':'SP','source':'OpenStreetMap','source_url':'https://www.openstreetmap.org/'+item['type']+'/'+str(item['id']),'lat':p['lat'],'lng':p['lon'],'boundary_verified':False}
rows=sorted(features.values(),key=lambda r:(r['city'],r['name']));bycity=collections.defaultdict(list)
for r in rows:bycity[r['city']].append(r)
for r in rows:
 near=sorted(((math.hypot((q['lat']-r['lat'])*111.2,(q['lng']-r['lng'])*102),q) for q in bycity[r['city']] if q['id']!=r['id']),key=lambda p:p[0]);r['neighbors']=[q['id'] for dist,q in near[:5] if dist<3]
for name,data in [('catalog',rows),('geometry',geometries),('municipalities',[{'city':a['city'],'bbox':a['bbox'],'polygons':a['polygons'],'polygon_holes':a.get('polygon_holes',[])} for a in areas])]:
 (root/(name+'.ts')).write_text('export default '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
stats={'total':len(rows),'official':len(geometries),'cities':dict(collections.Counter(r['city'] for r in rows)),'missing_cities':sorted(cities-set(bycity)),'sources':['IBGE Censo 2022','OpenStreetMap / ODbL'],'checked_at':'2026-09-29'}
(root/'manifest.ts').write_text('export default '+json.dumps(stats,ensure_ascii=False,separators=(',',':'))+';\n');print(json.dumps(stats,ensure_ascii=False));print('bytes',sum(p.stat().st_size for p in root.glob('*.ts')))
