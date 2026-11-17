"""AGENT/FAULT LIVE — standalone authoritative local-room party server.

Do not deploy this dev server publicly without TLS, operational rate limiting and a reverse proxy.
"""
from __future__ import annotations
import asyncio
import hashlib
import hmac
import json
import os
import random
import re
import secrets
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
DB = Path(os.environ.get('AGENT_FAULT_DB', str(ROOT / 'api_rooms.sqlite3')))
SCENES = json.loads((ROOT / 'data/AGENT_FAULT_WEB_SCENARIO.json').read_text())
INF = json.loads((ROOT / 'data/AGENT_FAULT_WEB_INTERFERENCE.json').read_text())
FAULTS = json.loads((ROOT / 'data/AGENT_FAULT_WEB_FAULT.json').read_text())
assert (len(SCENES), len(INF), len(FAULTS)) == (24, 36, 6)
CARDS = {c['id']: c for c in SCENES + INF + FAULTS}
app = FastAPI(title='AGENT/FAULT LIVE — API EDITION', version='0.2.0-api')
app.mount('/static', StaticFiles(directory=ROOT / 'static'), name='static')
lock = threading.RLock()
DB.parent.mkdir(parents=True, exist_ok=True)
conn = sqlite3.connect(str(DB), check_same_thread=False)
conn.execute('PRAGMA journal_mode=WAL')
conn.execute('CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, payload TEXT NOT NULL, updated REAL NOT NULL)')
conn.execute('''CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT, at REAL NOT NULL, room TEXT NOT NULL,
    model TEXT NOT NULL, outcome TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER NOT NULL DEFAULT 0, estimated_usd REAL NOT NULL DEFAULT 0.0
)''')
conn.commit()
TTL = 24 * 3600
ABC = 'ABCDEFG'

# Unit prices from public OpenAI API pricing at time this edition was prepared.
# Estimates exclude credits, taxes and any future price changes. Never claim these are invoices.
MODEL_PRICES = {
    'gpt-4.1-mini': (0.40, 1.60, 0.10),
    'gpt-5-mini': (0.25, 2.00, 0.025),
    'gpt-4o-mini': (0.15, 0.60, 0.075),
}
DEFAULT_MODEL = 'gpt-4.1-mini'  # tested baseline; override AGENT_FAULT_MODEL as needed
MAX_DAILY_CALLS = 48
MAX_DAILY_ESTIMATED_USD = 0.25
MAX_ROOM_CALLS = 12

def model_name():
    return os.getenv('AGENT_FAULT_MODEL', DEFAULT_MODEL).strip()

def ai_ready():
    return bool(os.getenv('OPENAI_API_KEY', '').strip())

def usage_snapshot(room=None):
    day_start = time.time() - (time.time() % 86400)  # UTC day, matches global daily budget
    query = '''SELECT COUNT(*), COUNT(CASE WHEN outcome='ok' THEN 1 END),
                     COALESCE(SUM(input_tokens),0), COALESCE(SUM(output_tokens),0),
                     COALESCE(SUM(estimated_usd),0)
               FROM api_usage WHERE at>=?'''
    args=[day_start]
    if room is not None:
        query+=' AND room=?';args.append(room)
    n,success,inputs,outputs,total=conn.execute(query,args).fetchone()
    return {'requests': n, 'successful':success,'input_tokens':inputs,'output_tokens':outputs,
            'estimated_usd':round(total,8), 'date_utc':time.strftime('%Y-%m-%d',time.gmtime())}

def estimate_usd(model, usage):
    if model not in MODEL_PRICES:
        return None
    inp = max(0,int(usage.get('input_tokens') or 0))
    out = max(0,int(usage.get('output_tokens') or 0))
    details=usage.get('input_tokens_details') or {}
    cached=min(inp,max(0,int(details.get('cached_tokens') or 0)))
    i,o,c=MODEL_PRICES[model]
    return round(((inp-cached)*i+cached*c+out*o)/1_000_000, 9)

def create_usage_record(room, model):
    conn.execute('INSERT INTO api_usage (at,room,model,outcome) VALUES(?,?,?,?)',
                 (time.time(),room,model,'attempted'))
    pk=conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    conn.commit()
    return pk

def update_usage_record(pk, outcome, usage=None, model=None):
    usage=usage or {}
    input_count=max(0,int(usage.get('input_tokens') or 0))
    output_count=max(0,int(usage.get('output_tokens') or 0))
    cached=max(0,int((usage.get('input_tokens_details') or {}).get('cached_tokens') or 0))
    value=estimate_usd(model,usage) if model else None
    conn.execute('''UPDATE api_usage SET outcome=?, input_tokens=?,output_tokens=?,
                    cached_tokens=?,estimated_usd=? WHERE id=?''',
                 (outcome,input_count,output_count,cached,value or 0.0,pk))
    conn.commit()


def digest(t: str) -> str:
    return hashlib.sha256(t.encode('utf-8')).hexdigest()


def token() -> str:
    return secrets.token_urlsafe(32)


def shuffle_cards(source: list) -> list:
    seq = list(source)
    random.SystemRandom().shuffle(seq)
    return seq


def save(r: dict):
    r['updated'] = time.time()
    r['version'] = r.get('version', 0) + 1
    conn.execute('INSERT INTO rooms(code,payload,updated) VALUES(?,?,?) '
                 'ON CONFLICT(code) DO UPDATE SET payload=excluded.payload,updated=excluded.updated',
                 (r['code'], json.dumps(r, ensure_ascii=False), r['updated']))
    conn.commit()


def load(code: str) -> dict:
    row = conn.execute('SELECT payload, updated FROM rooms WHERE code=?', (code.upper(),)).fetchone()
    if not row:
        raise HTTPException(404, 'Room not found')
    if time.time() - row[1] > TTL:
        conn.execute('DELETE FROM rooms WHERE code=?', (code.upper(),))
        conn.commit()
        raise HTTPException(410, 'This room expired')
    return json.loads(row[0])


def player(r: dict, player_id: str) -> dict:
    return next(p for p in r['players'] if p['id'] == player_id)


def authenticate(r: dict, bearer: str | None):
    auth = (bearer or '').replace('Bearer ', '', 1)
    if not auth or len(auth) > 200:
        raise HTTPException(401, 'Session token required')
    hashed = digest(auth)
    if hmac.compare_digest(hashed, r['host_hash']):
        return 'host', None
    for p in r['players']:
        if hmac.compare_digest(hashed, p['token_hash']):
            return 'player', p
    raise HTTPException(401, 'Invalid session token')


def actor(r, bearer):
    role, p = authenticate(r, bearer)
    if role == 'player' and not p['active']:
        raise HTTPException(403, 'Player removed from room')
    return role, p


def judge(r: dict):
    return next((p for p in r['players'] if p['active'] and p['id'] == r.get('judge_id')), None)


def demand(cond, msg, code=409):
    if not cond:
        raise HTTPException(code, msg)


def draw(r: dict, name: str) -> str:
    deck = r['decks'][name]
    if not deck:
        if not r['discard'][name]:
            raise HTTPException(409, 'No more ' + name + ' cards')
        r['decks'][name] = shuffle_cards(r['discard'][name])
        r['discard'][name] = []
        deck = r['decks'][name]
    return deck.pop()


def new_round(r: dict):
    r['round'] += 1
    r['phase'] = 'setup'
    r['scenario_id'] = draw(r, 'Scenario')
    r['fault_id'] = draw(r, 'Fault')
    r['profile'] = None
    r['submissions'] = {}
    r['candidates'] = []
    r['answers'] = {}
    r['spotlight'] = None
    r['proposal'] = None
    r['approvals'] = {}
    r['challenge'] = None
    r['round_record'] = None
    r['ai_attempted'] = False


def visible(r: dict, role: str, p: dict | None) -> dict:
    names = [{ 'id': q['id'], 'name': q['name'], 'score': q['score'], 'seat': q['seat'],
               'active': q['active'], 'submitted': q['id'] in r['submissions'],
               'is_judge': q['id'] == r.get('judge_id')} for q in r['players'] if q['active']]
    phase = r['phase']
    judge_here = p is not None and p['id'] == r.get('judge_id')
    revealed = phase in ('adjudicate', 'review', 'results', 'finished')
    state = {'code': r['code'], 'version': r['version'], 'phase': phase,
             'players': names, 'player_count': len(names), 'round': r['round'],
             'round_limit': r.get('round_limit'), 'judge_id': r.get('judge_id'),
             'scenario': CARDS.get(r.get('scenario_id')),
             'fault_family': CARDS[r['fault_id']]['family'] if r.get('fault_id') else None,
             'fault': CARDS[r['fault_id']] if r.get('fault_id') and (judge_here or revealed) else None,
             'profile': r['profile'] if judge_here or revealed else None,
             'submitted': len(r['submissions']), 'expected': max(0,len(names)-1),
             'candidates': [{'label': k, 'response': r['answers'].get(k),
                             'valid': bool(r['answers'].get(k) and r['answers'][k].upper() != 'SKIP')}
                            for k in ABC[:len(r['candidates'])]] if phase in ('spotlight','adjudicate','review','results','finished') else [],
             'spotlight': r['spotlight'] if revealed else None,
             'proposal': r['proposal'] if phase in ('review','results','finished') else None,
             'approvals': {k:v for k,v in r['approvals'].items()} if phase == 'review' else {},
             'last_round': r.get('last_round') if phase in ('results','finished') else None,
             'history': r['history'] if phase == 'finished' else [],
             'generation_calls': r['generation_calls'], 'ai_configured': ai_ready(),
              'ai_model': model_name() if role == 'host' else None,
              'ai_budget': {'room_remaining':max(0,MAX_ROOM_CALLS-r['generation_calls']),
                            'daily_remaining':max(0,MAX_DAILY_CALLS-usage_snapshot()['requests']),
                            'daily_estimated_usd':usage_snapshot()['estimated_usd'],
                            'daily_cap_estimated_usd':MAX_DAILY_ESTIMATED_USD} if role=='host' else None,
             'me': {'role': role, 'id': p['id'], 'name': p['name'],
                    'hand': [CARDS[cid] for cid in p['hand']]} if p else {'role':'host'},
             'card_counts': {kind:len(r['decks'][kind]) for kind in ('Scenario','Interference','Fault')}}
    if phase == 'generate' and role == 'host':
        state['generation_prompt'] = build_prompt(r)
        state['candidate_labels'] = [x['label'] for x in r['candidates']]
    if phase == 'results':
        state['owners'] = [{'label': x['label'], 'player':player(r,x['player_id'])['name']} for x in r['candidates']]
    return state


def build_prompt(r):
    scene = CARDS[r['scenario_id']]
    lines = ['You are writing fictional alternatives for a comedy card game. Produce one separate in-character answer for each listed letter. Each answer uses ONLY that letter\'s interference instruction, along with the common assignment and assistant personality. Keep answers 22–26 words when possible, absolutely no more than 30 words. Do not explain the game or compare answers. Return one line per letter, A:, B:, etc., no other text.',
             'ASSIGNMENT: ' + scene['public_assignment'],
             'REQUIRED BEHAVIOR: ' + scene['required_behavior'],
             'ASSISTANT PERSONALITY: ' + r['profile'],
             'CANDIDATES:']
    lines.extend(x['label'] + ': ' + CARDS[x['card_id']]['instruction'] for x in r['candidates'])
    return '\n'.join(lines)


def parse_answers(text: str, labels: list[str]) -> dict:
    # Deliberately require one clear line per letter for fair, reproducible reveal.
    result = {}
    pat = re.compile(r'^\s*([A-G])\s*[:.)\-]\s*(.*)$')
    for line in text.splitlines():
        match = pat.match(line)
        if match and match.group(1) in labels:
            result[match.group(1)] = ' '.join(match.group(2).strip().split()[:30])
    return result


class Create(BaseModel):
    pass

class Join(BaseModel):
    name: str = Field(min_length=1, max_length=24)

class Action(BaseModel):
    name: str
    data: dict[str, Any] = Field(default_factory=dict)


@app.get('/')
@app.get('/host/{code}')
@app.get('/play/{code}')
@app.get('/demo')
def home():
    return FileResponse(ROOT/'static/index.html')


@app.post('/api/rooms')
def create_room():
    with lock:
        row = conn.execute('SELECT code FROM rooms').fetchall()
        taken = {x[0] for x in row}
        code = ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
        while code in taken:
            code = ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
        host_token = token()
        r = {'code':code, 'host_hash':digest(host_token), 'phase':'lobby', 'players':[],
             'round':0,'round_limit':None,'judge_id':None,'scenario_id':None,'fault_id':None,
             'profile':None,'submissions':{},'candidates':[],'answers':{},'spotlight':None,
             'proposal':None,'approvals':{},'challenge':None,'history':[],'last_round':None,
             'decks':{},'discard':{},'generation_calls':0,'ai_attempted':False,'version':0}
        save(r)
        return {'code':code,'token':host_token,'role':'host'}


@app.post('/api/rooms/{code}/join')
def join_room(code: str, body:Join):
    with lock:
        r=load(code)
        demand(r['phase']=='lobby','Joining is closed')
        nickname = ' '.join(body.name.split())
        demand(2<=len(nickname)<=24, 'Nickname must be 2–24 characters',422)
        demand(not any(x['name'].casefold()==nickname.casefold() and x['active'] for x in r['players']), 'Nickname already in use')
        demand(sum(x['active'] for x in r['players'])<8,'Room is full')
        private=token();p={'id':secrets.token_hex(8),'token_hash':digest(private),'name':nickname,
            'seat':len(r['players']),'active':True,'hand':[],'score':0}
        r['players'].append(p);save(r)
        return {'code':r['code'],'token':private,'role':'player','player_id':p['id']}


@app.get('/api/rooms/{code}')
def room_state(code:str,authorization:str|None=Header(default=None)):
    with lock:
        r=load(code);role,p=actor(r,authorization)
        return visible(r,role,p)


@app.post('/api/rooms/{code}/action')
def room_action(code:str,body:Action,authorization:str|None=Header(default=None)):
    with lock:
        r=load(code);role,p=actor(r,authorization)
        a=body.name;d=body.data;phase=r['phase'];host=role=='host';j=p and p['id']==r.get('judge_id')
        if a=='remove_player':
            demand(host and phase=='lobby','Only host can remove players before game')
            target=next((x for x in r['players'] if x['id']==d.get('id')),None)
            demand(target is not None,'Player not found')
            target['active']=False
        elif a=='start':
            demand(host and phase=='lobby','Only host can start game')
            participants=[x for x in r['players'] if x['active']]
            demand(4<=len(participants)<=8,'Need 4–8 players')
            r['decks']={k:shuffle_cards([x['id'] for x in arr]) for k,arr in [('Scenario',SCENES),('Interference',INF),('Fault',FAULTS)]}
            r['discard']={k:[] for k in r['decks']}
            for x in participants:
                x['hand']=[draw(r,'Interference') for _ in range(4)]
                x['score']=0
            r['judge_id']=participants[0]['id']
            r['round_limit']=8 if len(participants)==4 else len(participants)
            new_round(r)
        elif a=='skip_scenario':
            demand(host and phase=='setup' and not r['profile'] and not r['submissions'],'Cannot skip after Judge has locked')
            r['discard']['Scenario'].append(r['scenario_id']);r['scenario_id']=draw(r,'Scenario')
        elif a=='lock_profile':
            demand(j and phase=='setup','Only current Judge can lock profile')
            v=' '.join(str(d.get('profile','')).split())
            demand(1<=len(v.split())<=20 and len(v)<=220,'Profile must be 1–20 words')
            r['profile']=v;r['phase']='submit'
        elif a=='submit':
            demand(role=='player' and not j and phase=='submit','Only contestants can submit now')
            cid=str(d.get('card_id',''))
            demand(cid in p['hand'],'Card not in your hand')
            demand(p['id'] not in r['submissions'],'You already submitted')
            r['submissions'][p['id']]=cid
            if len(r['submissions'])==len([q for q in r['players'] if q['active']])-1:
                ids=[{'player_id':k,'card_id':v} for k,v in r['submissions'].items()]
                random.SystemRandom().shuffle(ids)
                r['candidates']=[{**entry,'label':ABC[i]} for i,entry in enumerate(ids)]
                r['phase']='generate'
        elif a=='manual_answers':
            demand(host and phase=='generate','Only host can paste outputs')
            labels=[x['label'] for x in r['candidates']]
            answers=parse_answers(str(d.get('text',''))[:9000],labels)
            demand(set(labels)==set(answers),'Include exactly one A:, B:, etc. answer per contestant',422)
            r['answers']=answers
            demand(sum(bool(v and v.upper()!='SKIP') for v in answers.values())>=2, 'Need at least two valid answers; correct or retry',422)
            r['phase']='spotlight'
        elif a=='spotlight':
            demand(j and phase=='spotlight','Only Judge may lock Spotlight')
            label=str(d.get('label','')).upper()
            demand(label in r['answers'] and r['answers'][label].upper()!='SKIP','Not a valid response')
            r['spotlight']=label;r['phase']='adjudicate'
        elif a=='propose_bonus':
            demand(j and phase=='adjudicate','Only Judge may propose bonus')
            labels=[x['label'] for x in r['candidates']]
            claimed=d.get('claims',{})
            demand(isinstance(claimed,dict) and all(k in labels and isinstance(v,dict) for k,v in claimed.items()),'Invalid claims')
            qualifications={}
            for label in labels:
                v=claimed.get(label,{})
                qualifications[label]={
                    'breakpoint':bool(v.get('breakpoint',False)),
                    'fault':bool(v.get('fault',False)),
                    'evidence':str(v.get('evidence',''))[:240]
                }
                if not r['answers'].get(label) or r['answers'][label].upper()=='SKIP':
                    qualifications[label]={'breakpoint':False,'fault':False,'evidence':''}
            bp=[k for k,v in qualifications.items() if v['breakpoint']]
            fs=[k for k,v in qualifications.items() if v['fault']]
            eligible=bp or fs
            bonus=d.get('bonus') or None
            demand((not eligible and bonus is None) or (eligible and bonus in eligible),'Bonus must come from highest qualifying tier')
            r['proposal']={'claims':qualifications,'bonus':bonus,'tier':'Breakpoint' if bp else 'Fault' if fs else None}
            r['approvals']={}
            r['phase']='review'
        elif a=='approve':
            demand(role=='player' and phase=='review','Only players can review proposal')
            demand(p['id'] not in r['approvals'],'Already responded')
            r['approvals'][p['id']]=bool(d.get('yes'))
        elif a=='finalize':
            demand(host and phase=='review','Only host can resolve scoring')
            participants=[x for x in r['players'] if x['active']]
            if r['proposal']['bonus']:
                demand(len(r['approvals'])==len(participants),'All players must review or host must reopen')
                demand(sum(r['approvals'].values()) > len(participants)//2,'Proposal lacks strict majority; reopen scoring')
            else:
                demand(len(r['approvals'])==len(participants),'All players must review')
                demand(sum(r['approvals'].values()) > len(participants)//2,'Proposal lacks strict majority; reopen scoring')
            owners={e['label']:e['player_id'] for e in r['candidates']}
            sp=owners[r['spotlight']]
            player(r,sp)['score']+=1
            award=r['proposal']['bonus']
            if award:player(r,owners[award])['score']+=1
            for entry in r['candidates']:
                person=player(r,entry['player_id'])
                cid=entry['card_id'];person['hand'].remove(cid)
                r['discard']['Interference'].append(cid)
            for q in participants:
                if q['id']!=r['judge_id']:
                    q['hand'].append(draw(r,'Interference'))
            snapshot={'round':r['round'],'scenario':CARDS[r['scenario_id']]['title'],
                'spotlight':r['spotlight'],'bonus':award,'tier':r['proposal']['tier'],
                'owners':{label:player(r,pid)['name'] for label,pid in owners.items()},
                'responses':r['answers'].copy(),
                'scores':{q['name']:q['score'] for q in participants}}
            r['history'].append(snapshot);r['last_round']=snapshot
            r['phase']='results'
        elif a=='reopen':
            demand(host and phase=='review','Host may reopen disputed qualifications')
            r['proposal']=None;r['approvals']={};r['phase']='adjudicate'
        elif a=='next':
            demand(host and phase=='results','Only host can advance')
            if r['round']>=r['round_limit']:
                r['phase']='finished'
            else:
                participants=[x for x in r['players'] if x['active']]
                ix=next(i for i,x in enumerate(participants) if x['id']==r['judge_id'])
                r['judge_id']=participants[(ix+1)%len(participants)]['id']
                r['discard']['Scenario'].append(r['scenario_id'])
                r['discard']['Fault'].append(r['fault_id'])
                new_round(r)
        elif a=='close':
            demand(host,'Host only')
            r['phase']='finished'
        else:
            raise HTTPException(400,'Unknown action')
        save(r)
        return visible(r,role,p)


@app.post('/api/rooms/{code}/check-ai')
async def check_ai_connection(code:str,authorization:str|None=Header(default=None)):
    with lock:
        r=load(code);role,_=actor(r,authorization)
        demand(role=='host','Host only',403)
    key=os.getenv('OPENAI_API_KEY','').strip()
    demand(bool(key),'OpenAI key not configured on this computer',503)
    model=model_name()
    demand(model in MODEL_PRICES,'Choose a supported economical model',422)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp=await client.get('https://api.openai.com/v1/models/'+model,
                headers={'Authorization':'Bearer '+key})
            resp.raise_for_status()
        return {'configured':True,'reachable':True,'model':model,
                'note':'Verified API authentication and model access. No inference request was made.'}
    except Exception:
        raise HTTPException(502,'API connection failed. Verify the key, project permissions and model access.')


@app.post('/api/rooms/{code}/generate')
async def generate(code:str,authorization:str|None=Header(default=None)):
    key=os.getenv('OPENAI_API_KEY','').strip()
    demand(bool(key),'Server-side OPENAI_API_KEY not configured',503)
    model=model_name()
    demand(model in MODEL_PRICES,'Unsupported model for this low-budget edition',422)
    with lock:
        r=load(code);role,p=actor(r,authorization)
        demand(role=='host' and r['phase']=='generate','Only host may generate now')
        demand(r['generation_calls']<MAX_ROOM_CALLS,'Room generation call limit reached',429)
        demand(not r.get('ai_attempted',False),
               'AI already attempted this round. Complete missing letters manually.',429)
        budget=usage_snapshot()
        demand(budget['requests']<MAX_DAILY_CALLS,'Daily request limit reached',429)
        demand(budget['estimated_usd']<MAX_DAILY_ESTIMATED_USD,
               'Daily estimated usage limit reached',429)
        r['ai_attempted']=True
        r['generation_calls']+=1;save(r)
        usage_id=create_usage_record(r['code'],model)
        prompt=build_prompt(r)
        labels=[x['label'] for x in r['candidates']]
    # Never send the hidden Fault, Breakpoints, player identities or tokens.
    raw='';usage={}
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp=await client.post('https://api.openai.com/v1/responses',
                headers={'Authorization':'Bearer '+key},json={
                'model':model,
                'instructions':'You produce short fictional card-game alternatives. Return only labeled answers. Do not explain your process.',
                'input':prompt,'max_output_tokens':500,'store':False})
            resp.raise_for_status();data=resp.json()
        usage=data.get('usage') or {}
        raw=''.join(a.get('text','') for block in data.get('output',[])
                    for a in block.get('content',[]) if a.get('type')=='output_text')
        parsed=parse_answers(raw,labels)
    except Exception:
        with lock:
            # The attempt counts toward the daily cap, even if provider billing is unknown.
            update_usage_record(usage_id,'error',usage,model)
        raise HTTPException(502,'AI generation failed. Use manual entry; check connection/settings. No key or provider diagnostics exposed.')
    with lock:
        update_usage_record(usage_id,'ok',usage,model)
        r=load(code)
        if r['phase']!='generate':raise HTTPException(409,'Room has already moved on')
        meta={'model':model,'input_tokens':usage.get('input_tokens'),
              'output_tokens':usage.get('output_tokens'),
              'estimated_usd':estimate_usd(model,usage),
              'usage_utc':usage_snapshot()}
        if set(parsed)!=set(labels):
            return {'complete':False,'raw':raw[:7000],
                    'missing':[x for x in labels if x not in parsed], 'billing':meta}
        if sum(bool(x and x.upper()!='SKIP') for x in parsed.values())<2:
            return {'complete':False,'raw':raw[:7000], 'missing':[], 'billing':meta}
        r['answers']=parsed;r['phase']='spotlight';save(r)
        return {'complete':True,'billing':meta}


@app.get('/api/health')
def health():
    return {'status':'ok','cards':{'Scenario':24,'Interference':36,'Fault':6},'mode':'self-hosted',
            'ai_configured':ai_ready(),'edition':'api-v0.2.0', 'estimated_today':usage_snapshot()['estimated_usd']}


@app.get('/api/rooms/{code}/qr.png')
def room_qr(code:str,request:Request):
    import qrcode
    from fastapi.responses import Response
    import io
    with lock:
        r=load(code)
    url=str(request.base_url).rstrip('/') + '/play/' + r['code']
    img=qrcode.make(url)
    b=io.BytesIO();img.save(b,format='PNG')
    return Response(content=b.getvalue(),media_type='image/png',headers={'Cache-Control':'no-store'})
