(function(){
"use strict";
const defs=[
{id:"foyer",name:"The Foyer",detail:"EXIT"},
{id:"archive",name:"Archive",detail:"RECORD",proof:true},
{id:"gallery",name:"The Gallery",detail:"RECORD",proof:true},
{id:"observatory",name:"Observatory",detail:"RECORD",proof:true},
{id:"parlour",name:"Blue Parlour",detail:"An old mirror"},
{id:"bell",name:"Bell Tower",detail:"A silent clock"},
{id:"garden",name:"Winter Garden",detail:"A dark fountain"},
{id:"stair",name:"False Stair",detail:"No upper floor"},
{id:"hall",name:"Long Hall",detail:"Another doorway"}
];
const byId=Object.fromEntries(defs.map(r=>[r.id,r]));
const $=id=>document.getElementById(id);
const els={house:$("house"),turn:$("turnDisplay"),ap:$("apDisplay"),proof:$("proofDisplay"),shift:$("shiftDisplay"),room:$("roomDisplay"),forecast:$("forecastDisplay"),message:$("gameMessage"),trace:$("traceBtn"),focus:$("focusBtn"),exit:$("exitBtn"),end:$("endTurnBtn"),reset:$("resetBtn")};
let game;
const shuffle=a=>{const v=[...a];for(let i=v.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[v[i],v[j]]=[v[j],v[i]];}return v;};
function pickForecast(){const picks=shuffle(defs.filter(r=>r.id!=="foyer").map(r=>r.id));return picks.slice(0,2);}
function announce(msg){game.message=msg;render();}
function start(){const ids=shuffle(defs.filter(r=>r.id!=="foyer").map(r=>r.id));ids.splice(4,0,"foyer");game={layout:ids,player:"foyer",turn:1,ap:2,shifts:0,proofs:new Set(),focus:null,forecast:pickForecast(),over:false,won:false,message:"The Foyer feels familiar. Collect the three Records."};render();}
function spend(){if(game.ap<=0||game.over){announce("No actions remain. End the turn to continue.");return false;}game.ap--;return true;}
function move(id){
if(game.over)return;
const from=game.layout.indexOf(game.player),to=game.layout.indexOf(id);
if(Math.abs(Math.floor(from/3)-Math.floor(to/3))+Math.abs(from%3-to%3)!==1){announce("You can only STEP into an adjacent room.");return;}
if(!spend())return;
game.player=id;announce("You STEP into "+byId[id].name+".");
}
function trace(){if(game.over)return;const r=byId[game.player];if(!r.proof||game.proofs.has(r.id)){announce("There is no unclaimed Record in this room.");return;}if(!spend())return;game.proofs.add(r.id);announce("Record recovered: "+r.name+". "+game.proofs.size+" of 3 claimed.");}
function focus(){if(game.over)return;if(!spend())return;game.focus=game.player;announce("Focus anchored to "+byId[game.player].name+". It will resist the next Shift.");}
function exit(){if(game.over)return;if(game.player!=="foyer"||game.proofs.size!==3){announce("EXIT requires all three Records and your pawn in the Foyer.");return;}if(!spend())return;game.over=true;game.won=true;announce("You escaped on turn "+game.turn+" after "+game.shifts+" shifts. The house goes still.");}
function shift(){
let [a,b]=game.forecast;
if(game.focus===a||game.focus===b){const replacement=shuffle(defs.filter(r=>r.id!=="foyer"&&r.id!==game.focus&&r.id!==(game.focus===a?b:a)).map(r=>r.id))[0];if(game.focus===a)a=replacement;else b=replacement;}
const x=game.layout.indexOf(a),y=game.layout.indexOf(b);
[game.layout[x],game.layout[y]]=[game.layout[y],game.layout[x]];
game.shifts++;game.focus=null;game.forecast=pickForecast();
return byId[a].name+" traded places with "+byId[b].name+".";
}
function endTurn(){if(game.over)return;let msg="Turn "+game.turn+" complete.";if(game.turn%3===0){msg="SHIFT "+(game.shifts+1)+": "+shift();if(game.shifts>=12){game.over=true;game.won=false;msg+=" The twelfth Shift locks the exit. The house wins.";}}if(!game.over){game.turn++;game.ap=2;}announce(msg);}
function render(){
els.turn.textContent="Turn "+game.turn;els.ap.textContent=game.ap+" of 2 actions";els.proof.textContent=game.proofs.size+" of 3 records";els.shift.textContent=game.shifts+" of 12 shifts";
els.room.textContent="Current room: "+byId[game.player].name+(game.focus?" · Focus on "+byId[game.focus].name:"");
els.forecast.textContent=game.over?(game.won?"ESCAPED":"EXIT SEALED"):"Next forecast: "+byId[game.forecast[0]].name+" ↔ "+byId[game.forecast[1]].name+". Resolves after turn "+(3*Math.ceil(game.turn/3))+".";
els.message.textContent=game.message;
els.house.replaceChildren();
for(let i=0;i<9;i++){
const id=game.layout[i],r=byId[id],tile=document.createElement("button");
tile.type="button";tile.className="house-room"+(game.player===id?" current":"")+(game.forecast.includes(id)?" forecast":"");
const p=r.proof?(game.proofs.has(id)?"RECOVERED":"RECORD"):(id==="foyer"?"FOYER / EXIT":r.detail);
tile.setAttribute("aria-label",r.name+", "+p+(game.player===id?", you are here":"")+(game.forecast.includes(id)?", forecast target":""));
const number=document.createElement("span");number.className="room-number";number.textContent="ROOM / "+String(i+1).padStart(2,"0");
const label=document.createElement("span");label.className="room-title";label.textContent=r.name;
const detail=document.createElement("span");detail.className="room-detail";detail.textContent=p;
tile.append(number,label,detail);
if(game.player===id){const token=document.createElement("span");token.className="room-player";token.textContent="●";token.setAttribute("aria-hidden","true");tile.append(token);}
const pos=game.layout.indexOf(game.player);const adjacent=Math.abs(Math.floor(pos/3)-Math.floor(i/3))+Math.abs(pos%3-i%3)===1;
tile.disabled=game.over||game.ap===0||!adjacent;
tile.addEventListener("click",()=>move(id));els.house.appendChild(tile);
}
els.trace.disabled=game.over||game.ap<=0||!byId[game.player].proof||game.proofs.has(game.player);
els.focus.disabled=game.over||game.ap<=0;
els.exit.disabled=game.over||game.ap<=0||game.player!=="foyer"||game.proofs.size!==3;
els.end.disabled=game.over;
}
els.trace.addEventListener("click",trace);els.focus.addEventListener("click",focus);els.exit.addEventListener("click",exit);els.end.addEventListener("click",endTurn);els.reset.addEventListener("click",start);start();
}());