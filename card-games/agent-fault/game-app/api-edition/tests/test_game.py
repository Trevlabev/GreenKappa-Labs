import importlib
import json
import os
import sys
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

os.environ['AGENT_FAULT_DB']=str(Path(tempfile.mkdtemp())/'game.db')
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server

c=TestClient(server.app)

def call(code,tok,action,data=None):
 return c.post(f'/api/rooms/{code}/action',headers={'Authorization':'Bearer '+tok},json={'name':action,'data':data or {}})

def get(code,tok):
 return c.get('/api/rooms/'+code,headers={'Authorization':'Bearer '+tok})

def build_game(n=4):
 a=c.post('/api/rooms',json={});assert a.status_code==200,a.text
 host=a.json();code=host['code'];all_players=[]
 for i in range(n):
  p=c.post(f'/api/rooms/{code}/join',json={'name':f'PLAYER{i+1}'})
  assert p.status_code==200,p.text
  all_players.append(p.json())
 return host,all_players

def test_bad_token_and_capped_lobby():
 host,players=build_game(8)
 code=host['code']
 assert get(code,'fake').status_code==401
 assert c.post('/api/rooms/'+code+'/join',json={'name':'player1'}).status_code==409
 assert c.post('/api/rooms/'+code+'/join',json={'name':'EXTRA'}).status_code==409
 assert call(code,players[1]['token'],'start').status_code==409
 assert call(code,host['token'],'start').status_code==200
 d=get(code,host['token']).json()
 assert d['card_counts']['Interference']==4
 for p in players:
  s=get(code,p['token']).json()
  assert len(s['me']['hand'])==4
  if not s['players'][0]['id']==p['player_id']:
   assert s['fault'] is None and s['profile'] is None


def test_full_round_and_scoring():
 host,players=build_game(4)
 code=host['code'];ht=host['token']
 assert call(code,ht,'start').status_code==200
 judge=players[0];pj=judge['token']
 s=get(code,players[2]['token']).json()
 assert s['phase']=='setup' and s['fault'] is None
 assert call(code,players[2]['token'],'lock_profile',{'profile':'A cheating bureaucrat'}).status_code==409
 assert call(code,pj,'lock_profile',{'profile':'A fearful clerk who loves paperwork'}).status_code==200
 for p in players[1:]:
  hand=get(code,p['token']).json()['me']['hand'];id=hand[0]['id']
  assert call(code,p['token'],'submit',{'card_id':id}).status_code==200
  assert call(code,p['token'],'submit',{'card_id':id}).status_code==409
 s=get(code,ht).json()
 assert s['phase']=='generate' and len(s['candidate_labels'])==3
 assert 'FAULT:' not in s['generation_prompt'].upper()
 assert 'BREAKPOINT A:' not in s['generation_prompt'].upper()
 assert call(code,players[1]['token'],'manual_answers',{'text':'A: hi'}).status_code==409
 bad=call(code,ht,'manual_answers',{'text':'A: hello\nB: there'})
 assert bad.status_code==422
 answers='\n'.join([f'{x}: Fictional response {x} is an invented test reply.' for x in 'ABC'])
 assert call(code,ht,'manual_answers',{'text':answers}).status_code==200
 assert get(code,players[2]['token']).json()['profile'] is None
 assert call(code,pj,'spotlight',{'label':'A'}).status_code==200
 assert get(code,players[2]['token']).json()['fault'] is not None
 proposal={'claims':{'B':{'breakpoint':True,'fault':False,'evidence':'Fictional response B'}},'bonus':'B'}
 assert call(code,pj,'propose_bonus',proposal).status_code==200
 for p in players:
  assert call(code,p['token'],'approve',{'yes':p is not players[3]}).status_code==200
 assert call(code,ht,'finalize').status_code==200
 state=get(code,ht).json();assert state['phase']=='results'
 assert state['last_round']['spotlight']=='A' and state['last_round']['bonus']=='B'
 assert sum(p['score'] for p in state['players'])==2
 assert len([x for x in state['players'] if x['score']>0]) in [1,2]
 assert call(code,ht,'next').status_code==200
 state=get(code,ht).json();assert state['round']==2 and state['judge_id']==players[1]['player_id']
 for p in players:
  assert len(get(code,p['token']).json()['me']['hand'])==4


def test_disputed_bonus_reopened_without_majority():
 host,people=build_game(4);code=host['code'];ht=host['token']
 call(code,ht,'start');call(code,people[0]['token'],'lock_profile',{'profile':'Impulsive clerk'})
 for p in people[1:]:call(code,p['token'],'submit',{'card_id':get(code,p['token']).json()['me']['hand'][0]['id']})
 call(code,ht,'manual_answers',{'text':'A: A sentence\nB: B sentence\nC: C sentence'})
 call(code,people[0]['token'],'spotlight',{'label':'A'})
 call(code,people[0]['token'],'propose_bonus',{'claims':{'B':{'breakpoint':True}},'bonus':'B'})
 for i,p in enumerate(people):call(code,p['token'],'approve',{'yes':i<2})
 assert call(code,ht,'finalize').status_code==409
 assert call(code,ht,'reopen').status_code==200
 assert get(code,ht).json()['phase']=='adjudicate'


def test_qr_and_health():
 host,_=build_game(4)
 res=c.get('/api/rooms/'+host['code']+'/qr.png')
 assert res.status_code==200 and res.headers['content-type']=='image/png'
 assert c.get('/api/health').json()['cards']=={'Scenario':24,'Interference':36,'Fault':6}
