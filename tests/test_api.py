import os,tempfile,unittest
from datetime import date
TEMP=tempfile.TemporaryDirectory(prefix='orbit-tests-');os.environ['ORBIT_DATA_DIR']=TEMP.name
from fastapi.testclient import TestClient
from backend.main import app,database,Route,calculate
HEAD={'X-Explorer-Client':'orbit-explorer'}
ROUTE={'origin':'earth','destination':'mars','launch':'2026-01-01'}
class OrbitTests(unittest.TestCase):
 def setUp(self):
  with database() as db:db.execute('DELETE FROM missions')
  self.c=TestClient(app);self.c.get('/api/session')
 def save(self):return self.c.post('/api/missions',json={**ROUTE,'title':'Ares I'},headers=HEAD)
 def test_catalog(self):self.assertEqual(len(self.c.get('/api/planets').json()),8)
 def test_transfer_benchmark(self):
  result=self.c.post('/api/transfer',json=ROUTE,headers=HEAD).json();self.assertAlmostEqual(result['days'],259,delta=1);self.assertAlmostEqual(result['total'],5.59,delta=.05)
 def test_same_world(self):self.assertEqual(self.c.post('/api/transfer',json={**ROUTE,'destination':'earth'},headers=HEAD).status_code,422)
 def test_invalid_world(self):self.assertEqual(self.c.post('/api/transfer',json={**ROUTE,'destination':'fake'},headers=HEAD).status_code,422)
 def test_invalid_date(self):self.assertEqual(self.c.post('/api/transfer',json={**ROUTE,'launch':'2026-02-30'},headers=HEAD).status_code,422)
 def test_server_rejects_injected_result(self):self.assertEqual(self.c.post('/api/transfer',json={**ROUTE,'total':1},headers=HEAD).status_code,422)
 def test_cross_origin(self):self.assertEqual(self.c.post('/api/transfer',json=ROUTE,headers={**HEAD,'Origin':'https://evil.example'}).status_code,403)
 def test_missing_header(self):self.assertEqual(self.c.post('/api/transfer',json=ROUTE).status_code,403)
 def test_owner_session_required(self):self.assertEqual(TestClient(app).get('/api/missions').status_code,401)
 def test_save_and_shared_read(self):
  saved=self.save();self.assertEqual(saved.status_code,201);shared=TestClient(app).get('/api/missions/'+saved.json()['id']).json();self.assertEqual(shared['route'],ROUTE);self.assertNotIn('owner',shared)
 def test_owner_isolation(self):
  key=self.save().json()['id'];other=TestClient(app);other.get('/api/session');self.assertEqual(other.get('/api/missions').json(),[]);self.assertEqual(other.delete('/api/missions/'+key,headers=HEAD).status_code,404)
 def test_delete_revokes_link(self):
  key=self.save().json()['id'];self.assertEqual(self.c.delete('/api/missions/'+key,headers=HEAD).status_code,204);self.assertEqual(self.c.get('/api/missions/'+key).status_code,404)
 def test_blank_name(self):self.assertEqual(self.c.post('/api/missions',json={**ROUTE,'title':'  '},headers=HEAD).status_code,422)
 def test_utc_arrival(self):self.assertEqual(calculate(Route(**ROUTE))['arrival_date'],'2026-09-16')
 def test_static_home(self):self.assertEqual(self.c.get('/').status_code,200)
