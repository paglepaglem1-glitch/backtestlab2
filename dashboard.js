const marketEl=document.getElementById('market'),pairEl=document.getElementById('pair'),tfEl=document.getElementById('timeframe');
const pairs={crypto:['BTC/USDT','ETH/USDT','SOL/USDT'],forex:['EUR/USD','GBP/USD','USD/JPY','XAU/USD']};
const canvas=document.getElementById('chart'),ctx=canvas.getContext('2d');
let side='BUY', tradeCount=0,wins=0,losses=0,pnl=0, peak=0, candles=[];
function params(){const p=new URLSearchParams(location.search); if(p.get('market')==='forex') marketEl.value='forex';}
function fillPairs(){pairEl.innerHTML=pairs[marketEl.value].map(x=>`<option>${x}</option>`).join(''); draw(); updateSymbol();}
function updateSymbol(){document.getElementById('symbol').textContent=pairEl.value; document.getElementById('price').textContent=marketEl.value==='crypto'?'$100,000.00':'1.10000';}
function seed(){candles=[];let price=100;for(let i=0;i<34;i++){let o=price,c=o+(Math.random()-.47)*5,h=Math.max(o,c)+Math.random()*3,l=Math.min(o,c)-Math.random()*3;candles.push({o,h,l,c});price=c}}
function draw(){
 const d=devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);
 ctx.strokeStyle='#1c222c';ctx.lineWidth=1;for(let y=40;y<h-35;y+=55){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
 const max=Math.max(...candles.map(x=>x.h)),min=Math.min(...candles.map(x=>x.l)),range=max-min||1;const gap=w/candles.length;
 candles.forEach((c,i)=>{const x=i*gap+gap/2, bodyW=Math.max(4,gap*.55),y=v=>35+(max-v)/range*(h-75);
   ctx.strokeStyle=c.c>=c.o?'#6ee7b7':'#ef7d8a';ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.moveTo(x,y(c.h));ctx.lineTo(x,y(c.l));ctx.stroke();ctx.fillRect(x-bodyW/2,Math.min(y(c.o),y(c.c)),bodyW,Math.max(2,Math.abs(y(c.o)-y(c.c))));
 });
}
function stats(){document.getElementById('trades').textContent=tradeCount;document.getElementById('wins').textContent=wins;document.getElementById('losses').textContent=losses;document.getElementById('winrate').textContent=tradeCount?Math.round(wins/tradeCount*100)+'%':'0%';document.getElementById('pnl').textContent=(pnl>=0?'+':'')+'$'+pnl.toFixed(2);document.getElementById('drawdown').textContent='$'+Math.max(0,peak-pnl).toFixed(2)}
document.getElementById('nextCandle').onclick=()=>{candles.shift();let last=candles[candles.length-1].c;let o=last,c=o+(Math.random()-.47)*5,h=Math.max(o,c)+Math.random()*3,l=Math.min(o,c)-Math.random()*3;candles.push({o,h,l,c});document.getElementById('price').textContent=marketEl.value==='crypto'?'$'+(c*1000).toFixed(2):c.toFixed(5);draw()};
document.getElementById('buyTab').onclick=()=>{side='BUY';document.getElementById('buyTab').classList.add('active');document.getElementById('sellTab').classList.remove('active')};
document.getElementById('sellTab').onclick=()=>{side='SELL';document.getElementById('sellTab').classList.add('active');document.getElementById('buyTab').classList.remove('active')};
document.getElementById('placeTrade').onclick=()=>{tradeCount++;Math.random()>.45?wins++:losses++;let result=wins+losses===tradeCount&&wins===tradeCount?'WIN':Math.random()>.45?'WIN':'LOSS';if(result==='WIN'){pnl+=25}else{pnl-=15}peak=Math.max(peak,pnl);const e=document.getElementById('entry').value,s=document.getElementById('sl').value,t=document.getElementById('tp').value,z=document.getElementById('size').value;document.getElementById('historyBody').insertAdjacentHTML('afterbegin',`<tr><td>${tradeCount}</td><td>${side}</td><td>${e}</td><td>${s}</td><td>${t}</td><td>${z}</td><td>${result}</td></tr>`);document.querySelector('.empty')?.remove();document.getElementById('tradeMessage').textContent='Demo trade added';stats()};
marketEl.onchange=fillPairs;pairEl.onchange=updateSymbol;document.getElementById('reset').onclick=()=>{tradeCount=wins=losses=pnl=peak=0;document.getElementById('historyBody').innerHTML='<tr><td colspan="7" class="empty">No trades yet. Place a demo trade to see it here.</td></tr>';stats();seed();draw()};
window.onresize=draw;params();fillPairs();seed();draw();stats();
