import os
from fastapi.testclient import TestClient
import server

api=TestClient(server.app)

def make_game():
    h=api.post('/api/rooms',json={}).json(); code=h['code']; ppl=[]
    for i in range(4):
        res=api.post(f'/api/rooms/{code}/join',json={'name':f'APITEST-{i}'})
        assert res.status_code==200,res.text
        ppl.append(res.json())
    headers={'Authorization': 'Bearer '+h['token']}
    assert api.post(f'/api/rooms/{code}/action',headers=headers,json={'name':'start','data':{}}).status_code==200
    ph={'Authorization':'Bearer '+ppl[0]['token']}
    assert api.post(f'/api/rooms/{code}/action',headers=ph,json={'name':'lock_profile','data':{'profile':'An anxious municipal clerk'}}).status_code==200
    for pl in ppl[1:]:
        auth={'Authorization':'Bearer '+pl['token']}
        card=api.get(f'/api/rooms/{code}',headers=auth).json()['me']['hand'][0]['id']
        assert api.post(f'/api/rooms/{code}/action',headers=auth,json={'name':'submit','data':{'card_id':card}}).status_code==200
    assert api.get(f'/api/rooms/{code}',headers=headers).json()['phase']=='generate'
    return h,ppl

class FakeResponse:
    def __init__(self,kind,meta=None):self.kind=kind;self.meta=meta or {}
    def raise_for_status(self):return None
    def json(self):
        if self.kind=='models':return {'id':'gpt-4.1-mini'}
        return {'output':[{'content':[{'type':'output_text','text':
               'A: The office will issue apology badges to every employee effective immediately.\n'
               'B: The copier has been promoted to company president, so submit your complaints to its paper tray.\n'
               'C: We propose an obligatory three-hour meeting to decide which meeting should happen first.'}]}],
                'usage':{'input_tokens':800,'output_tokens':200,'input_tokens_details':{'cached_tokens':80}}}
class FakeClient:
    captured=[]
    def __init__(self,*args,**kwargs):pass
    async def __aenter__(self):return self
    async def __aexit__(self,*args):return False
    async def post(self,url,headers=None,json=None):
        self.captured.append((url,headers,json))
        return FakeResponse('outputs')
    async def get(self,url,headers=None):
        self.captured.append((url,headers,None))
        return FakeResponse('models')

def test_api_key_connection_and_paid_generation_with_fake_client(monkeypatch):
    # No actual HTTP request or real secret is involved.
    dummy='test-only-not-a-real-secret-key-xyz'
    monkeypatch.setenv('OPENAI_API_KEY',dummy)
    monkeypatch.setenv('AGENT_FAULT_MODEL','gpt-4.1-mini')
    monkeypatch.setattr(server.httpx,'AsyncClient',FakeClient)
    FakeClient.captured.clear()
    h,ppl=make_game();code=h['code'];auth={'Authorization':'Bearer '+h['token']}
    c=api.post(f'/api/rooms/{code}/check-ai',headers=auth)
    assert c.status_code==200,c.text
    assert c.json()['reachable'] is True
    assert len(FakeClient.captured)==1 and '/v1/models/' in FakeClient.captured[0][0]
    assert server.usage_snapshot(code)['requests']==0
    nonhost=api.post(f'/api/rooms/{code}/check-ai',headers={'Authorization':'Bearer '+ppl[1]['token']})
    assert nonhost.status_code==403
    answer=api.post(f'/api/rooms/{code}/generate',headers=auth)
    assert answer.status_code==200,answer.text
    result=answer.json();assert result['complete'] is True
    # Cost: (720*.4 +80*.1 +200*1.6)/1_000_000 = $0.000616.
    assert result['billing']['estimated_usd']==0.000616
    assert result['billing']['input_tokens']==800
    assert result['billing']['output_tokens']==200
    assert server.usage_snapshot(code)['requests']==1
    assert server.usage_snapshot(code)['estimated_usd']==0.000616
    first_url,first_headers,prompt_data=FakeClient.captured[1]
    assert first_url=='https://api.openai.com/v1/responses'
    assert first_headers['Authorization']=='Bearer '+dummy
    assert prompt_data['model']=='gpt-4.1-mini'
    assert prompt_data['store'] is False
    assert 'BREAKPOINT A:' not in prompt_data['input']
    assert 'FAULT:' not in prompt_data['input']
    assert dummy not in str(api.get(f'/api/rooms/{code}',headers=auth).json())
    assert api.get(f'/api/rooms/{code}',headers=auth).json()['phase']=='spotlight'
    again=api.post(f'/api/rooms/{code}/generate',headers=auth)
    assert again.status_code==409
    assert len(FakeClient.captured)==2

def test_reject_non_whitelisted_models_before_a_billable_call(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY','dummy-non-real')
    monkeypatch.setenv('AGENT_FAULT_MODEL','gpt-6-astra')
    monkeypatch.setattr(server.httpx,'AsyncClient',FakeClient)
    FakeClient.captured.clear()
    h,_=make_game();code=h['code']
    answer=api.post(f'/api/rooms/{code}/generate',headers={'Authorization':'Bearer '+h['token']})
    assert answer.status_code==422
    assert server.usage_snapshot(code)['requests']==0
    assert not FakeClient.captured


def test_estimator_exact_math():
    assert server.estimate_usd('gpt-4.1-mini',{'input_tokens':599,'output_tokens':277})==0.0006828
    assert server.estimate_usd('unknown',{'input_tokens':10,'output_tokens':10}) is None
