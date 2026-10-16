import json,os,re,secrets,sqlite3,time,uuid,math
from contextlib import contextmanager
from datetime import date,timedelta
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse
from fastapi import FastAPI,Request,Response,HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel,ConfigDict,Field

ROOT=Path(os.path.abspath(__file__)).parents[1]
DATA=Path(os.getenv('ORBIT_DATA_DIR',str(ROOT/'data')));DATA.mkdir(parents=True,exist_ok=True)
PLANETS=json.loads((ROOT/'frontend/planets.json').read_text(encoding='utf-8'))
PlanetId=Literal['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']
class Route(BaseModel):
    model_config=ConfigDict(extra='forbid')
    origin:PlanetId='earth'
    destination:PlanetId='mars'
    launch:date
class Mission(Route):
    title:str=Field(min_length=1,max_length=70)

def calculate(body):
    if body.origin==body.destination:raise HTTPException(422,'İki farklı gezegen seç.')
    origin=next(p for p in PLANETS if p['id']==body.origin);target=next(p for p in PLANETS if p['id']==body.destination)
    r1=origin['distance']*1e6;r2=target['distance']*1e6;a=(r1+r2)/2;mu=132712440018
    seconds=math.pi*math.sqrt(a**3/mu);days=seconds/86400
    departure=abs(math.sqrt(mu/r1)*(math.sqrt(2*r2/(r1+r2))-1));arrival=abs(math.sqrt(mu/r2)*(1-math.sqrt(2*r1/(r1+r2))))
    try:arrival_date=(body.launch+timedelta(seconds=seconds)).isoformat()
    except OverflowError:raise HTTPException(422,'Varış tarihi desteklenen aralığın dışında.')
    return dict(days=days,departure=departure,arrival=arrival,total=departure+arrival,phase=(180-360*days/target['period'])%360,synodic=1/abs(1/origin['period']-1/target['period']),arrival_date=arrival_date,educational=True)

@contextmanager
def database():
    db=sqlite3.connect(DATA/'missions.sqlite3',timeout=20);db.row_factory=sqlite3.Row
    try:
        with db:yield db
    finally:db.close()
with database() as db:db.execute('CREATE TABLE IF NOT EXISTS missions(id TEXT PRIMARY KEY,owner TEXT,title TEXT,payload TEXT,created REAL)')
app=FastAPI(title='Orbit Explorer API',version='1.0.0');COOKIE='orbit_explorer_owner'
def owner(request):
    token=request.cookies.get(COOKIE,'')
    if not re.fullmatch('[a-f0-9]{64}',token):raise HTTPException(401,'Oturum başlatılmalı.')
    return token
@app.middleware('http')
async def protect(request,call_next):
    if request.method in ['POST','DELETE','PUT','PATCH'] and request.url.path.startswith('/api/'):
        origin=request.headers.get('origin')
        if request.headers.get('x-explorer-client')!='orbit-explorer' or (origin and urlparse(origin).netloc!=request.headers.get('host')):return JSONResponse({'detail':'Yazma isteği engellendi.'},status_code=403)
    return await call_next(request)
@app.get('/api/health')
def health():return {'status':'ok'}
@app.get('/api/planets')
def planets():return PLANETS
@app.get('/api/session')
def session(request:Request,response:Response):
    if not re.fullmatch('[a-f0-9]{64}',request.cookies.get(COOKIE,'')):response.set_cookie(COOKIE,secrets.token_hex(32),httponly=True,samesite='lax',secure=request.url.scheme=='https',max_age=31536000)
    response.headers['Cache-Control']='no-store'
    return {'status':'ready'}
@app.post('/api/transfer')
def preview(body:Route):return calculate(body)
def serialize(row):
    payload=json.loads(row['payload']);return dict(id=row['id'],title=row['title'],route=payload,result=calculate(Route(**payload)),created_at=row['created'])
@app.get('/api/missions')
def missions(request:Request):
    with database() as db:rows=db.execute('SELECT * FROM missions WHERE owner=? ORDER BY created DESC',(owner(request),)).fetchall()
    return [serialize(row) for row in rows]
@app.post('/api/missions',status_code=201)
def save(body:Mission,request:Request):
    calculate(body);token=owner(request);title=body.title.strip()
    if not title:raise HTTPException(422,'Görev adı boş olamaz.')
    key=uuid.uuid4().hex;payload={'origin':body.origin,'destination':body.destination,'launch':body.launch.isoformat()}
    with database() as db:
        if db.execute('SELECT COUNT(*) FROM missions WHERE owner=?',(token,)).fetchone()[0]>=100:raise HTTPException(409,'En fazla 100 görev kaydedilebilir.')
        db.execute('INSERT INTO missions VALUES(?,?,?,?,?)',(key,token,title,json.dumps(payload),time.time()));row=db.execute('SELECT * FROM missions WHERE id=?',(key,)).fetchone()
    return serialize(row)
@app.get('/api/missions/{key}')
def shared(key:str):
    with database() as db:row=db.execute('SELECT * FROM missions WHERE id=?',(key,)).fetchone()
    if not row:raise HTTPException(404,'Görev bulunamadı.')
    return serialize(row)
@app.delete('/api/missions/{key}',status_code=204)
def delete(key:str,request:Request):
    with database() as db:changed=db.execute('DELETE FROM missions WHERE id=? AND owner=?',(key,owner(request))).rowcount
    if not changed:raise HTTPException(404,'Görev bulunamadı.')
if (ROOT/'frontend/dist').exists():app.mount('/',StaticFiles(directory=ROOT/'frontend/dist',html=True),name='web')
