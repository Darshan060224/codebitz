/* Deep space background with nebula clouds, stars, floating diamonds, and rising particles */
const DIAMONDS = [
  {w:38,h:38,top:"3%",left:"20%",rot:20,delay:0,dur:4.5,op:.75,ca:"#a5b4fc",cb:"#7c3aed"},
  {w:22,h:22,top:"9%",left:"14%",rot:45,delay:1.2,dur:5,op:.55,ca:"#c084fc",cb:"#818cf8"},
  {w:32,h:32,top:"1.5%",left:"62%",rot:-15,delay:.4,dur:4,op:.65,ca:"#38bdf8",cb:"#818cf8"},
  {w:50,h:50,top:"17%",left:"2%",rot:30,delay:.7,dur:6,op:.7,ca:"#7c3aed",cb:"#4f46e5"},
  {w:28,h:28,top:"32%",left:"6%",rot:10,delay:2,dur:5,op:.5,ca:"#a78bfa",cb:"#6d28d9"},
  {w:72,h:72,bottom:"18%",left:"9%",rot:15,delay:1,dur:7,op:.72,ca:"#818cf8",cb:"#4338ca"},
  {w:32,h:32,bottom:"30%",left:"4%",rot:-20,delay:2.5,dur:4.5,op:.5,ca:"#c084fc",cb:"#7c3aed"},
  {w:34,h:34,top:"15%",right:"3%",rot:25,delay:.3,dur:5.5,op:.62,ca:"#a5b4fc",cb:"#38bdf8"},
  {w:26,h:26,top:"38%",right:"1.5%",rot:-10,delay:1.8,dur:4.2,op:.48,ca:"#818cf8",cb:"#6366f1"},
  {w:40,h:40,top:"55%",right:"4%",rot:35,delay:.9,dur:5.8,op:.58,ca:"#c084fc",cb:"#7c3aed"},
  {w:30,h:30,bottom:"14%",right:"8%",rot:20,delay:.5,dur:4.8,op:.52,ca:"#a78bfa",cb:"#818cf8"},
  {w:20,h:20,bottom:"6%",right:"30%",rot:45,delay:2,dur:4,op:.42,ca:"#38bdf8",cb:"#818cf8"},
];

const COINS = [
  {e:"🔨",b:"19%",l:"36%",dur:3.5,delay:0},
  {e:"🪙",b:"14%",l:"46%",dur:4,delay:.8},
  {e:"🪙",b:"21%",l:"53%",dur:3.2,delay:1.6},
  {e:"🔨",b:"11%",r:"14%",dur:4.5,delay:.4},
  {e:"🪙",b:"17%",r:"22%",dur:3.8,delay:1.2},
  {e:"🔨",b:"7%",l:"29%",dur:4.2,delay:2},
  {e:"🪙",b:"8%",r:"40%",dur:3.6,delay:2.4},
];

export default function SpaceBG() {
  const stars = Array.from({length:80},(_,i)=>({
    top:`${(i*13.7)%100}%`,left:`${(i*7.3+4)%100}%`,
    size:i%8===0?2.2:i%4===0?1.6:1,
    dur:`${2+(i%5)*0.6}s`,delay:`${(i*.19)%3.8}s`,
  }));

  const particles = Array.from({length:10},(_,i)=>({
    left:`${(i*7.2+2)%100}%`,
    delay:`${i*.7}s`,dur:`${10+(i%5)}s`,
    size:2+(i%3),color:["#818cf8","#38bdf8","#c084fc","#a78bfa"][i%4],
  }));

  return (
    <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",
      background:"radial-gradient(ellipse at 25% 30%,#120e3a 0%,#0c0a28 40%,#06051a 100%)"}}>

      {/* Nebula clouds */}
      <div className="nebula-cloud" style={{top:"8%",left:"-8%",width:680,height:520,
        background:"radial-gradient(ellipse,rgba(20,30,100,.92) 0%,rgba(10,12,50,.7) 45%,transparent 70%)",
        animationDelay:"0s"}}/>
      <div className="nebula-cloud" style={{top:"12%",left:"0%",width:560,height:440,
        background:"radial-gradient(ellipse,rgba(30,120,160,.12) 0%,rgba(10,40,80,.1) 45%,transparent 70%)",
        filter:"blur(40px)",animationDelay:"2s",animationDuration:"18s"}}/>
      <div className="nebula-cloud" style={{top:"5%",right:"-10%",width:520,height:440,
        background:"radial-gradient(ellipse,rgba(70,10,140,.55) 0%,rgba(40,5,80,.35) 45%,transparent 70%)",
        animationDelay:"1s",animationDuration:"20s"}}/>
      <div className="nebula-cloud" style={{top:"20%",right:"2%",width:420,height:350,
        background:"radial-gradient(ellipse,rgba(90,40,180,.14) 0%,transparent 70%)",
        filter:"blur(48px)",animationDelay:"3s",animationDuration:"12s"}}/>

      {/* Constellation lines */}
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.14}}>
        <line x1="20%" y1="14%" x2="36%" y2="26%" stroke="#818cf8" strokeWidth=".7"/>
        <line x1="36%" y1="26%" x2="28%" y2="42%" stroke="#818cf8" strokeWidth=".7"/>
        <line x1="68%" y1="8%"  x2="79%" y2="22%" stroke="#818cf8" strokeWidth=".7"/>
        <line x1="79%" y1="22%" x2="72%" y2="38%" stroke="#818cf8" strokeWidth=".7"/>
        <line x1="84%" y1="58%" x2="93%" y2="43%" stroke="#818cf8" strokeWidth=".5"/>
      </svg>

      {/* Stars */}
      {stars.map((s,i)=>(
        <div key={i} className="star" style={{top:s.top,left:s.left,
          width:s.size,height:s.size,
          animationDuration:s.dur,animationDelay:s.delay}}/>
      ))}

      {/* Floating 3D diamonds */}
      {DIAMONDS.map((d,i)=>(
        <div key={`d${i}`} style={{position:"absolute",top:d.top,bottom:d.bottom,left:d.left,right:d.right,
          width:d.w,height:d.h,opacity:d.op,'--r':`${d.rot}deg`,
          animation:`${i%2===0?"floatA":"floatB"} ${d.dur}s ${d.delay}s ease-in-out infinite`}}>
          <div style={{width:"100%",height:"100%",
            background:`linear-gradient(135deg,${d.ca},${d.cb})`,
            clipPath:"polygon(50% 0%,100% 40%,80% 100%,20% 100%,0% 40%)",
            boxShadow:`0 0 ${d.w/2.5}px ${d.ca}55,inset 0 2px 4px rgba(255,255,255,.25)`,
            filter:"brightness(1.1)"}}/>
          <div style={{position:"absolute",top:"8%",left:"25%",right:"25%",height:"30%",
            background:"linear-gradient(180deg,rgba(255,255,255,.35),transparent)",
            clipPath:"polygon(50% 0%,100% 100%,0% 100%)"}}/>
        </div>
      ))}

      {/* Coins & hammers */}
      {COINS.map((c,i)=>(
        <div key={`c${i}`} style={{position:"absolute",bottom:c.b,left:c.l,right:c.r,
          fontSize:22,opacity:.5,
          animation:`coinBounce ${c.dur}s ${c.delay}s ease-in-out infinite`}}>
          {c.e}
        </div>
      ))}

      {/* Sparkle */}
      <div style={{position:"absolute",bottom:"11%",right:"1.2%",fontSize:34,color:"#e2e8f0",
        opacity:.95,animation:"pulse 3s ease-in-out infinite"}}>✦</div>

      {/* Rising particles */}
      {particles.map((p,i)=>(
        <div key={`p${i}`} style={{position:"absolute",bottom:0,left:p.left,
          width:p.size,height:p.size,borderRadius:"50%",background:p.color,
          boxShadow:`0 0 5px ${p.color}`,
          animation:`particleUp ${p.dur} ${p.delay} linear infinite`}}/>
      ))}
    </div>
  );
}
