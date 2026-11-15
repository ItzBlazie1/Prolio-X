/* ==========================================================================
   Prolio Engine  (js/prolio-engine.js)
   Everything runs in the browser. No server, no build step, no dependencies.

   Sections, in order:
   1. Settings and data tables   LINK_BASE, BAN (banners), STAT, AVS, RINGS,
                                 ACC (accents), ACHM (achievements), PERKS
   2. Link codec                 enc / dec (JSON <-> short base62 text),
                                 sanitize (cleans any shared data), parseShared
   3. Profile renderer           buildHeader, achGrid, buildVisitor, openPreview,
                                 route (profile-only page when a link is opened)
   4. Onboarding                 welcome typing, Profiley animation, the 6 questions
   5. Profile studio             tabs: Design, Home, Updates, Perks, Link, Others;
                                 photo cropper, XP, levels, achievements
   6. Theme and extras           dark / light switch, night-city skyline, pollen
   ========================================================================== */
(function(){
  var scene=document.getElementById("scene"),btn=document.getElementById("go"),sub=document.getElementById("sub"),
      walker=document.getElementById("walker"),bubble=document.getElementById("bubble"),said=document.getElementById("said"),
      panel=document.getElementById("panel"),fx=document.getElementById("fx"),tok=0;
  var Q=[
    {k:"name",say:"What is your name?",label:"Your name",ph:"e.g. Alex",req:1},
    {k:"age",say:"How old are you?",label:"Your age",ph:"e.g. 21",type:"number",req:1,check:function(v){var n=+v;return n>=1&&n<=120&&n%1===0?"":"Enter an age from 1 to 120."}},
    {k:"from",say:"Where are you from? Totally optional!",label:"Where are you from? (optional)",ph:"City or country"},
    {k:"gender",say:"Your gender? Optional too!",label:"Gender (optional)",sel:["Male","Female","Non-binary","Other","Prefer not to say"]},
    {k:"user",say:"Pick a cool username!",label:"Username",ph:"cool_name_42",pre:"@",req:1,check:function(v){return /^[A-Za-z0-9_]{3,20}$/.test(v)?"":"Use 3 to 20 letters, numbers or underscores."}},
    {k:"display",say:"Last one! What display name?",label:"Display name",ph:"What others will see",req:1}
  ];
  var A={},qi=0;
  function type(el,text,cb){
    var my=++tok,i=0;(function tick(){
      if(my!==tok)return;
      if(i<=text.length){el.textContent=text.slice(0,i++);setTimeout(tick,45+Math.random()*50)}
      else if(cb){cb()}
    })();
  }
  function mk(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e}
  function ask(){
    var q=Q[qi];type(said,q.say);
    panel.textContent="";
    var pr=mk("div","prog");pr.appendChild(mk("span","","Question "+(qi+1)+" of "+Q.length));
    var d=mk("div","dots");Q.forEach(function(_,n){d.appendChild(mk("i",n<=qi?"on":""))});pr.appendChild(d);panel.appendChild(pr);
    var lb=mk("label","",q.label);lb.htmlFor="inp";panel.appendChild(lb);
    var f=mk("div","field"),inp;
    if(q.pre)f.appendChild(mk("span","",q.pre));
    if(q.sel){
      inp=mk("div","chips");inp.value=A[q.k]||"";
      q.sel.forEach(function(o){var b=mk("button","chipb",o);b.type="button";b.setAttribute("aria-pressed",inp.value===o?"true":"false");
        b.onclick=function(){inp.value=inp.value===o?"":o;[].forEach.call(inp.children,function(c){c.setAttribute("aria-pressed",c.textContent===inp.value?"true":"false")})};inp.appendChild(b)});
      inp.id="inp";panel.appendChild(inp);
    }else{
      inp=mk("input");inp.type=q.type||"text";inp.placeholder=q.ph||"";inp.maxLength=40;inp.autocomplete="off";if(q.type==="number"){inp.min=1;inp.max=120}
      inp.id="inp";inp.value=A[q.k]||"";f.appendChild(inp);panel.appendChild(f);
    }
    var er=mk("div","err");panel.appendChild(er);
    var row=mk("div","row");
    if(!q.req){var sk=mk("button","btn ghost","Skip");sk.type="button";sk.onclick=function(){A[q.k]="";next()};row.appendChild(sk)}
    var nx=mk("button","btn",qi===Q.length-1?"Finish":"Next");nx.type="button";
    function go(){
      var v=inp.value.trim();
      if(q.req&&!v){er.textContent="Please fill this in.";return}
      if(v&&q.check){var m=q.check(v);if(m){er.textContent=m;return}}
      A[q.k]=v;next();
    }
    nx.onclick=go;inp.addEventListener("keydown",function(e){if(e.key==="Enter")go()});
    row.appendChild(nx);panel.appendChild(row);
    panel.classList.add("show");
    setTimeout(function(){try{inp.focus({preventScroll:true})}catch(e){}},400);
  }
  function next(){qi++;if(qi<Q.length)ask();else done()}
  function done(){
    type(said,"Ready to start your profile?");
    panel.textContent="";
    panel.appendChild(mk("h2","","Ready to start your profile?")).style.margin="0 0 6px";
    panel.appendChild(mk("p","note","All 6 questions are done. Press Continue when you are ready."));
    var row=mk("div","row"),c=mk("button","btn","Continue");c.type="button";c.onclick=launch;row.appendChild(c);panel.appendChild(row);
    setTimeout(function(){try{c.focus({preventScroll:true})}catch(e){}},400);
  }
  function launch(){
    panel.classList.remove("show");
    type(said,"Awesome, let\u2019s gooo!",function(){
      setTimeout(function(){walker.classList.add("exit");scene.classList.add("riding")},550);
    });
  }
  function profile(){
    scene.classList.remove("riding","stage2");
    walker.className="walker";bubble.classList.remove("show");
    btn.style.display="none";panel.classList.remove("show");
    var who=A.display||A.name,t=document.getElementById("typed");
    t.textContent="";sub.classList.remove("show");sub.textContent="Welcome, "+who+"! Your profile is ready.";
    type(t,"Let\u2019s get started!",function(){sub.classList.add("show");buildScreen();
      setTimeout(function(){document.getElementById("screen").scrollIntoView({behavior:"smooth",block:"nearest"})},400)});
  }
  var CFG=window.PROLIO_CONFIG||{};
  var LINK_BASE=(function(){
    if(CFG.siteUrl)return CFG.siteUrl.replace(/#.*$/,"");
    var h=location.hostname;
    if(/\.(github\.io|pages\.dev|netlify\.app|vercel\.app)$/.test(h))return location.origin+location.pathname.replace(/index\.html$/,"");
    return CFG.fallbackUrl||location.href.split("#")[0];
  })();
  var BAN=["linear-gradient(120deg,#43cea2,#185a9d)","linear-gradient(120deg,#ff9a9e,#fad0c4)","linear-gradient(120deg,#a18cd1,#fbc2eb)","linear-gradient(120deg,#f6d365,#fda085)","linear-gradient(120deg,#0f2027,#2c5364)","linear-gradient(120deg,#ff512f,#dd2476)","linear-gradient(120deg,#00c9ff,#92fe9d)","linear-gradient(120deg,#1a0b3b,#6a3df0,#ff6bd6)"];
  var STAT=["😎 Chilling","🛹 Skating","🎮 Gaming","📚 Studying","🎧 Vibing"],AVS=["","😎","🦊","🐼","🐸","🚀","🌵","👾"],RINGS=["gold","accent","rainbow"];
  var ACC=[["Green","#2f9e5a"],["Blue","#3b82f6"],["Pink","#e0559a"],["Orange","#f08a24"],["Purple","#8b5cf6"]];
  var ACHM=[
    {id:"ready",e:"🛹",t:"Skate In",d:"Meet Profiley and finish the questions",xp:50,g:"linear-gradient(135deg,#43cea2,#185a9d)"},
    {id:"pfp",e:"📸",t:"Say Cheese",d:"Upload a profile picture",xp:100,g:"linear-gradient(135deg,#ff9a9e,#f6416c)"},
    {id:"ban",e:"🖼️",t:"Banner Boss",d:"Upload a banner image",xp:80,g:"linear-gradient(135deg,#a18cd1,#5b6cf0)"},
    {id:"bio",e:"✍️",t:"Wordsmith",d:"Write a bio",xp:40,g:"linear-gradient(135deg,#f6d365,#fda085)"},
    {id:"vibe",e:"😎",t:"Vibe Check",d:"Pick a status",xp:30,g:"linear-gradient(135deg,#84fab0,#8fd3f4)"},
    {id:"col",e:"🎨",t:"True Colors",d:"Change your accent color",xp:30,g:"linear-gradient(135deg,#fccb90,#d57eeb)"},
    {id:"nite",e:"🌙",t:"Night Owl",d:"Switch to dark mode",xp:30,g:"linear-gradient(135deg,#0f2027,#2c5364)"},
    {id:"full",e:"💯",t:"Fully Loaded",d:"Reach 100% profile strength",xp:150,g:"linear-gradient(135deg,#ffd54a,#b8860b)"}];
  var PERKS=[
    {l:1,e:"🎁",t:"Starter pack",d:"Gold and accent rings, 5 banners, 5 accent colors, emoji avatars and statuses"},
    {l:2,e:"🌈",t:"Rainbow ring",d:"Wrap your avatar in a rainbow ring"},
    {l:3,e:"🎆",t:"Premium banners",d:"3 extra banners: Sunset, Aurora and Galaxy"},
    {l:4,e:"💬",t:"Custom status",d:"Write your own status line (up to 24 characters)"},
    {l:5,e:"✨",t:"Glowing name",d:"Give your display name a glowing gradient"},
    {l:6,e:"👑",t:"Legend badge",d:"A gold Legend badge on your profile"}];
  var B62="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  function enc(o){
    var by=new TextEncoder().encode(JSON.stringify(o)),n=BigInt(1),i,out="",b62=BigInt(62);
    for(i=0;i<by.length;i++)n=n*BigInt(256)+BigInt(by[i]);
    while(n>BigInt(0)){out=B62.charAt(Number(n%b62))+out;n=n/b62}
    return out;
  }
  function dec(t){
    var n=BigInt(0),b62=BigInt(62),b256=BigInt(256),one=BigInt(1),by=[],i,k;
    for(i=0;i<t.length;i++){k=B62.indexOf(t.charAt(i));if(k<0)return null;n=n*b62+BigInt(k)}
    while(n>one){by.unshift(Number(n%b256));n=n/b256}
    if(n!==one)return null;
    return JSON.parse(new TextDecoder().decode(new Uint8Array(by)));
  }
  function sanitize(o){
    if(!o||typeof o!=="object")return null;
    function t(v,n){return typeof v==="string"?v.slice(0,n):""}
    var P={display:t(o.d,24),user:t(o.u,20),bio:t(o.b,80),status:t(o.s,30),avatar:t(o.a,8),pfp:"",bannerImg:"",banner:0,ring:"gold",glow:!!o.g,mask:0,meta:"",accent:""};
    if(!P.display||!/^[A-Za-z0-9_]{3,20}$/.test(P.user))return null;
    var n=+o.n;if(n>=0&&n<BAN.length&&n%1===0)P.banner=n;
    if(RINGS.indexOf(o.r)>-1)P.ring=o.r;
    if(typeof o.c==="string"&&/^[0-9a-fA-F]{6}$/.test(o.c))P.accent=o.c;
    var m=+o.m;if(m>=0&&m<256&&m%1===0)P.mask=m;
    if(Array.isArray(o.x))P.meta=o.x.slice(0,3).map(function(v){return t(v,40)}).filter(Boolean).join(" \u00b7 ");
    return P;
  }
  function maskOf(done){return ACHM.reduce(function(m,a,i){return done[a.id]?m|(1<<i):m},0)}
  function xpOf(mask){return ACHM.reduce(function(t,a,i){return mask&(1<<i)?t+a.xp:t},0)}
  function buildHeader(P){
    var lvN=Math.floor(xpOf(P.mask)/100)+1,h=mk("div","ph"),bn=mk("div","pbanner");
    bn.style.background=P.bannerImg?"url("+P.bannerImg+") center/cover":BAN[P.banner];h.appendChild(bn);
    var ct=mk("div","pcenter"),ring=mk("div","ring ring-"+P.ring),av=mk("div","avatar");
    if(P.pfp){var im=mk("img");im.src=P.pfp;im.alt="Profile picture";av.appendChild(im)}else av.textContent=P.avatar||(P.display.charAt(0)||"?").toUpperCase();
    ring.appendChild(av);ct.appendChild(ring);ct.appendChild(mk("h2","pname"+(P.glow?" glow":""),P.display));
    var pl=mk("div","pills");pl.appendChild(mk("span","pill p1","@"+P.user));if(P.status)pl.appendChild(mk("span","pill p2",P.status));
    pl.appendChild(mk("span","pill p3","Level "+lvN));if(lvN>=6)pl.appendChild(mk("span","pill p4","👑 Legend"));ct.appendChild(pl);
    if(P.bio)ct.appendChild(mk("p","bio",P.bio));
    if(P.meta)ct.appendChild(mk("div","muted",P.meta));
    var into=xpOf(P.mask)%100,w=mk("div","xpwrap"),xm=mk("div","xpm");xm.appendChild(mk("small","",(100-into)+" XP to Level "+(lvN+1)));
    var bar=mk("div","xpbar"),fi=mk("i");fi.style.width=into+"%";bar.appendChild(fi);bar.appendChild(mk("span","",into+"%"));xm.appendChild(bar);
    w.appendChild(xm);w.appendChild(mk("div","lvl",String(lvN)));ct.appendChild(w);h.appendChild(ct);return h;
  }
  function achGrid(mask){
    var g=mk("div","achs");
    ACHM.forEach(function(a,i){
      var on=!!(mask&(1<<i)),c=mk("div","ach"+(on?"":" lock")),art=mk("div","art",a.e);art.style.background=a.g;c.appendChild(art);
      c.appendChild(mk("span","st",on?"✓ Unlocked":"🔒 Locked"));
      var bd=mk("div","abody");bd.appendChild(mk("b","",a.t));bd.appendChild(mk("small","",a.d));bd.appendChild(mk("small","","+"+a.xp+" XP"));c.appendChild(bd);g.appendChild(c)});
    return g;
  }
  function buildVisitor(P){
    var c=mk("div","vcard");if(P.accent)c.style.setProperty("--accent","#"+P.accent);
    c.appendChild(buildHeader(P));
    var xp=xpOf(P.mask),n=ACHM.filter(function(a,i){return P.mask&(1<<i)}).length,st=mk("div","stats");
    [["⭐",Math.floor(xp/100)+1,"Level"],["✨",xp,"XP"],["🏆",n+" / "+ACHM.length,"Achievements"]].forEach(function(x){
      var q=mk("div","stat");q.appendChild(mk("span","ic",x[0]));q.appendChild(mk("b","",String(x[1])));q.appendChild(mk("small","",x[2]));st.appendChild(q)});
    c.appendChild(st);c.appendChild(mk("h3","sech","Achievements"));c.appendChild(achGrid(P.mask));return c;
  }
  function openPreview(P){
    var ov=mk("div","modal"),box=mk("div","mbox wide");ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");
    box.appendChild(buildVisitor(P));
    var row=mk("div","row"),cl=mk("button","btn","Close");cl.type="button";row.appendChild(cl);box.appendChild(row);ov.appendChild(box);document.body.appendChild(ov);
    function close(){ov.remove();document.removeEventListener("keydown",kd)}
    function kd(e){if(e.key==="Escape")close()}
    document.addEventListener("keydown",kd);cl.onclick=close;cl.focus();
  }
  function parseShared(txt){
    var m=/p-([0-9A-Za-z]+)\s*$/.exec((txt||"").trim());
    if(!m)return null;
    try{return sanitize(dec(m[1]))}catch(e){return null}
  }
  function route(){
    var vp=document.getElementById("vp"),P=/^#p-/.test(location.hash)?parseShared(location.hash):null;
    vp.textContent="";
    if(P){document.body.classList.add("visitor");vp.appendChild(buildVisitor(P))}else document.body.classList.remove("visitor");
  }
  var afterEdit=null;
  function toast(m){
    var t=mk("div","toast",m);document.getElementById("toasts").appendChild(t);
    setTimeout(function(){t.classList.add("out")},2800);setTimeout(function(){t.remove()},3400);
  }
  function cropper(file,ow,oh,round,done,fail){
    var rd=new FileReader();
    rd.onerror=function(){fail("Could not read that file. Your current picture is unchanged.")};
    rd.onload=function(){var im=new Image();
      im.onerror=function(){fail("That image could not be opened. Your current picture is unchanged.")};
      im.onload=function(){openIt(im)};im.src=rd.result};
    rd.readAsDataURL(file);
    function openIt(im){
      var cw=round?260:360,ch=round?260:Math.round(360*oh/ow),z=1,ox=0,oy=0,dr=null;
      var ov=mk("div","modal"),box=mk("div","mbox");ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");
      box.appendChild(mk("h3","","Adjust your "+(round?"picture":"banner")));
      var cv=mk("canvas","cv"+(round?" round":""));cv.width=cw;cv.height=ch;box.appendChild(cv);
      box.appendChild(mk("p","note","Drag to move. Use the slider to zoom."));
      var rg=mk("input");rg.type="range";rg.min=1;rg.max=3;rg.step=.01;rg.value=1;rg.setAttribute("aria-label","Zoom");box.appendChild(rg);
      var row=mk("div","row"),cn=mk("button","btn ghost","Cancel"),ok=mk("button","btn","Use this");
      cn.type="button";ok.type="button";row.appendChild(cn);row.appendChild(ok);box.appendChild(row);ov.appendChild(box);document.body.appendChild(ov);
      var ctx=cv.getContext("2d");
      function geom(){var k=Math.max(cw/im.width,ch/im.height)*z,iw=im.width*k,ih=im.height*k,mx=(iw-cw)/2,my=(ih-ch)/2;
        ox=Math.max(-mx,Math.min(mx,ox));oy=Math.max(-my,Math.min(my,oy));return[(cw-iw)/2+ox,(ch-ih)/2+oy,iw,ih]}
      function draw(){var g=geom();ctx.clearRect(0,0,cw,ch);ctx.drawImage(im,g[0],g[1],g[2],g[3])}
      cv.addEventListener("pointerdown",function(e){dr=[e.clientX,e.clientY];cv.setPointerCapture(e.pointerId)});
      cv.addEventListener("pointermove",function(e){if(!dr)return;var sx=cw/cv.getBoundingClientRect().width;ox+=(e.clientX-dr[0])*sx;oy+=(e.clientY-dr[1])*sx;dr=[e.clientX,e.clientY];draw()});
      ["pointerup","pointercancel"].forEach(function(n){cv.addEventListener(n,function(){dr=null})});
      rg.oninput=function(){z=+rg.value;draw()};
      function close(){ov.remove();document.removeEventListener("keydown",kd)}
      function kd(e){if(e.key==="Escape")close()}
      document.addEventListener("keydown",kd);
      cn.onclick=close;
      ok.onclick=function(){
        var g=geom(),r=ow/cw,oc=document.createElement("canvas");oc.width=ow;oc.height=oh;
        var oc2=oc.getContext("2d");oc2.fillStyle="#fff";oc2.fillRect(0,0,ow,oh);oc2.drawImage(im,g[0]*r,g[1]*r,g[2]*r,g[3]*r);
        done(oc.toDataURL("image/jpeg",.85));close();
      };
      draw();ok.focus();
    }
  }
  function buildScreen(){
    var sc=document.getElementById("screen"),names=["Design","Home","Updates","Perks","Link","Others"],prev=null,barSpan;
    var T={ready:function(){return true},pfp:function(){return !!A.pfp},ban:function(){return !!A.bannerImg},bio:function(){return !!A.bio},vibe:function(){return !!A.status},col:function(){return !!A.accent},nite:function(){return !!A.night},full:function(){return strength()===100}};
    var ACH=ACHM.map(function(a){return Object.assign({},a,{test:T[a.id]})});
    if(A.banner===undefined)A.banner=0;
    A.done=A.done||{ready:1};A.log=A.log||[["Profile created","just now"]];
    function who(){return A.display||A.name}
    function strength(){return Math.round(([A.name,A.age,A.from,A.gender,A.bio,A.status,A.pfp||A.avatar,A.bannerImg].filter(Boolean).length+2)/10*100)}
    function xp(){return ACH.reduce(function(t,a){return t+(A.done[a.id]?a.xp:0)},0)}
    function lv(){return Math.floor(xp()/100)+1}
    A.lv=A.lv||lv();
    function check(){
      ACH.forEach(function(a){if(!A.done[a.id]&&a.test()){A.done[a.id]=1;A.log.unshift(["Unlocked: "+a.t,"+"+a.xp+" XP"]);toast("🏆 "+a.t+" unlocked! +"+a.xp+" XP")}});
      if(lv()>A.lv){A.lv=lv();toast("⬆️ Level up! You are now level "+A.lv);var pk=PERKS.filter(function(p){return p.l===A.lv})[0];if(pk)toast(pk.e+" Perk unlocked: "+pk.t)}
    }
    function refresh(){
      check();updateLocks();
      if(prev&&prev.isConnected){prev.textContent="";prev.appendChild(header())}
      if(barSpan)barSpan.textContent="prolio.app/@"+A.user;
    }
    afterEdit=refresh;
    function toP(){return {display:who(),user:A.user,bio:A.bio||"",status:A.status||"",avatar:A.avatar||"",pfp:A.pfp||"",bannerImg:A.bannerImg||"",banner:A.banner,ring:A.ring||"gold",glow:!!A.glow,mask:maskOf(A.done),meta:[A.age?A.age+" yrs":"",A.from,A.gender].filter(Boolean).join(" \u00b7 ")}}
    function header(){return buildHeader(toP())}
    function updateLocks(){
      [].forEach.call(view.querySelectorAll("[data-need]"),function(b){
        var n=+b.dataset.need,l=lv()<n;b.classList.toggle("locked",l);b.title=l?"Unlocks at Level "+n:"";
        if(b.tagName==="INPUT")b.disabled=l;else if(b.dataset.t!==undefined)b.textContent=b.dataset.t+(l?" 🔒":"");
      });
    }
    var bar0=mk("div","bar");["#ff5f57","#febc2e","#28c840"].forEach(function(c){var d=mk("i");d.style.background=c;bar0.appendChild(d)});
    barSpan=mk("span","","prolio.app/@"+A.user);bar0.appendChild(barSpan);
    sc.textContent="";sc.hidden=false;sc.appendChild(bar0);
    var tb=mk("div","tabs"),view=mk("div","view");tb.setAttribute("role","tablist");
    function sec(t){view.appendChild(mk("h4","sec",t))}
    function row(label,val,type,max,fn){
      var w=mk("div","frow");w.appendChild(mk("label","",label));
      var f=mk("div","field"),i=mk("input"),er=mk("div","err");i.type=type||"text";i.value=val||"";i.maxLength=max||40;i.autocomplete="off";
      i.addEventListener("input",function(){er.textContent=fn(i.value.trim())||"";refresh()});
      f.appendChild(i);w.appendChild(f);w.appendChild(er);view.appendChild(w);return i;
    }
    function chips(label,list,key,show,need){
      var w=mk("div","frow");w.appendChild(mk("label","",label));var c=mk("div","chips");
      function mark(){[].forEach.call(c.children,function(b,i){b.setAttribute("aria-pressed",(A[key]||"")===list[i]?"true":"false")})}
      list.forEach(function(o){var tx=show?show(o):o,b=mk("button","chipb",tx),n=need?need(o):0;b.type="button";b.dataset.t=tx;if(n)b.dataset.need=n;
        b.onclick=function(){if(n&&lv()<n){toast("🔒 Reach Level "+n+" to unlock this");return}A[key]=(A[key]===o&&o!=="")?"":o;mark();refresh()};c.appendChild(b)});
      mark();w.appendChild(c);view.appendChild(w);
    }
    function swatches(label,items,isOn,pick,need){
      var w=mk("div","frow");w.appendChild(mk("label","",label));var c=mk("div","swatches");
      function mark(){[].forEach.call(c.children,function(b,i){b.classList.toggle("on",isOn(i))})}
      items.forEach(function(it,i){var b=mk("button","sw"),n=need?need(i):0;b.type="button";b.style.background=it[1];b.setAttribute("aria-label",it[0]);if(n)b.dataset.need=n;
        b.onclick=function(){if(n&&lv()<n){toast("🔒 Reach Level "+n+" to unlock this");return}pick(i);mark();refresh()};c.appendChild(b)});
      mark();w.appendChild(c);view.appendChild(w);
    }
    function uploader(label,key,ow,oh,round){
      var w=mk("div","frow");w.appendChild(mk("label","",label));
      var r=mk("div","upl"),pv=mk("div","upv"+(round?"":" ban")),inp=mk("input"),up=mk("button","btn","Upload photo"),rm=mk("button","btn ghost","Remove"),er=mk("div","err");
      inp.type="file";inp.accept="image/*";inp.hidden=true;up.type="button";rm.type="button";
      function thumb(){pv.style.backgroundImage=A[key]?"url("+A[key]+")":"none";pv.textContent=A[key]?"":(round?"Aa":"")}
      up.onclick=function(){inp.click()};
      inp.onchange=function(){
        var f=inp.files&&inp.files[0];inp.value="";if(!f)return;
        if(!/^image\//.test(f.type)){er.textContent="That file is not an image. Your current picture is unchanged.";return}
        if(f.size>10485760){er.textContent="That image is over 10 MB. Try a smaller one. Your current picture is unchanged.";return}
        er.textContent="";
        cropper(f,ow,oh,round,function(url){A[key]=url;thumb();refresh();toast(round?"Profile picture updated":"Banner updated")},function(m){er.textContent=m});
      };
      rm.onclick=function(){A[key]="";thumb();refresh()};
      thumb();r.appendChild(pv);r.appendChild(up);r.appendChild(rm);r.appendChild(inp);w.appendChild(r);w.appendChild(er);view.appendChild(w);
    }
    var views=[
      function(){
        prev=mk("div");prev.appendChild(header());view.appendChild(prev);
        view.appendChild(mk("p","note","Edit anything below. Your profile updates live and nothing leaves this page."));
        var sur=mk("button","btn","🎲 Surprise me");sur.type="button";
        sur.onclick=function(){
          function pk(l){return l[Math.floor(Math.random()*l.length)]}
          A.avatar=pk(AVS.slice(1));A.status=pk(STAT);A.banner=Math.floor(Math.random()*(lv()>=3?BAN.length:5));A.ring=pk(lv()>=2?RINGS:RINGS.slice(0,2));A.accent=true;
          root.style.setProperty("--accent",pk(ACC)[1]);check();show(0);
        };
        view.appendChild(sur);
        sec("Pictures");
        uploader("Profile picture","pfp",256,256,true);
        uploader("Banner image","bannerImg",900,280,false);
        sec("About you");
        row("Display name",A.display,"text",24,function(v){if(!v)return "Required.";A.display=v});
        row("Username",A.user,"text",20,function(v){if(!/^[A-Za-z0-9_]{3,20}$/.test(v))return "Use 3 to 20 letters, numbers or underscores.";A.user=v});
        row("Name",A.name,"text",30,function(v){if(!v)return "Required.";A.name=v});
        row("Age",A.age,"number",3,function(v){var n=+v;if(!(n>=1&&n<=120&&n%1===0))return "Enter an age from 1 to 120.";A.age=String(n)});
        row("From (optional)",A.from,"text",40,function(v){A.from=v});
        row("Bio (80 characters)",A.bio,"text",80,function(v){A.bio=v});
        chips("Gender (optional)",["Male","Female","Non-binary","Other","Prefer not to say"],"gender");
        sec("Style");
        chips("Status",STAT,"status");
        var cs=row("Custom status (Level 4 perk)",A.status,"text",24,function(v){A.status=v});cs.dataset.need=4;
        chips("Emoji avatar (used when there is no photo)",AVS,"avatar",function(o){return o||"Aa"});
        chips("Avatar ring",RINGS,"ring",function(o){return o.charAt(0).toUpperCase()+o.slice(1)},function(o){return o==="rainbow"?2:0});
        chips("Name effect",["Glow"],"glow",function(){return "✨ Glowing name (Level 5 perk)"},function(){return 5});
        swatches("Banner (used when there is no banner image)",BAN.map(function(g,i){return ["Banner "+(i+1),g]}),function(i){return A.banner===i},function(i){A.banner=i},function(i){return i>=5?3:0});
        swatches("Accent color",ACC,function(i){return root.style.getPropertyValue("--accent")===ACC[i][1]},function(i){A.accent=true;root.style.setProperty("--accent",ACC[i][1])});
      },
      function(){
        view.appendChild(header());
        var done=ACH.filter(function(a){return A.done[a.id]}).length,st=mk("div","stats");
        [["⭐",lv(),"Level"],["✨",xp(),"XP"],["🏆",done+" / "+ACH.length,"Achievements"],["📈",strength()+"%","Profile strength"],["✅","6 / 6","Questions"],["📅","1 day","With Prolio"]].forEach(function(x){
          var c=mk("div","stat");c.appendChild(mk("span","ic",x[0]));c.appendChild(mk("b","",String(x[1])));c.appendChild(mk("small","",x[2]));st.appendChild(c)});
        view.appendChild(st);
        view.appendChild(mk("h3","sech","Achievements"));
        view.appendChild(achGrid(maskOf(A.done)));
      },
      function(){
        A.log.forEach(function(u){
          var r=mk("div","upd");r.appendChild(mk("i"));var d=mk("div");d.appendChild(mk("b","",u[0]));d.appendChild(mk("small","",u[1]));r.appendChild(d);view.appendChild(r)});
      },
      function(){
        view.appendChild(mk("h3","","Level perks"));
        var next=PERKS.filter(function(p){return p.l>lv()})[0];
        view.appendChild(mk("p","note","You are Level "+lv()+". "+(next?"Next perk at Level "+next.l+": "+next.t+".":"You have unlocked every perk.")+" Earn XP by unlocking achievements on the Home tab."));
        var list=mk("div","perks");
        PERKS.forEach(function(p){
          var on=lv()>=p.l,c=mk("div","perk"+(on?" on":" lock")+(p.l===Math.min(lv(),PERKS.length)?" cur":""));
          c.appendChild(mk("div","lvl",String(p.l)));
          var b=mk("div","pbd");b.appendChild(mk("b","",p.e+" "+p.t));b.appendChild(mk("small","",p.d));c.appendChild(b);
          c.appendChild(mk("span","pst",on?"✓ Unlocked":"🔒 Level "+p.l));list.appendChild(c)});
        view.appendChild(list);
      },
      function(){
        view.appendChild(mk("h3","","Share your profile"));
        view.appendChild(mk("p","note","Anyone who opens your link sees only your profile page, nothing else. They need to be able to open this page."));
        if(!A.sh)A.sh={};
        var link=mk("input");link.readOnly=true;link.className="linkin";link.setAttribute("aria-label","Your profile link");
        function payload(){
          var x=[];if(A.sh.age&&A.age)x.push(A.age+" yrs");if(A.sh.from&&A.from)x.push(A.from);if(A.sh.gender&&A.gender)x.push(A.gender);
          var ac=A.accent?root.style.getPropertyValue("--accent").replace("#",""):"";
          return {d:who(),u:A.user,b:A.bio||"",s:A.status||"",a:A.avatar||"",n:A.banner,r:A.ring||"gold",c:/^[0-9a-fA-F]{6}$/.test(ac)?ac:"",g:A.glow?1:0,m:maskOf(A.done),x:x};
        }
        function sync(){link.value=LINK_BASE+"#p-"+enc(payload())}
        sec("What to include");
        var tg=mk("div","chips");
        [["age","Age"],["from","Where I am from"],["gender","Gender"]].forEach(function(t){
          var has=!!A[t[0]],b=mk("button","chipb",t[1]+(has?"":" (not set)"));b.type="button";b.disabled=!has;
          b.setAttribute("aria-pressed",A.sh[t[0]]&&has?"true":"false");
          b.onclick=function(){A.sh[t[0]]=!A.sh[t[0]];b.setAttribute("aria-pressed",A.sh[t[0]]?"true":"false");sync()};tg.appendChild(b)});
        view.appendChild(tg);
        view.appendChild(mk("p","note","Always shared: display name, @username, bio, status, emoji or initial avatar, banner, ring, accent, level and achievements. Never shared: your real name and uploaded photos, which are too big for a link."));
        sec("Your link");
        var lr=mk("div","linkrow"),cp=mk("button","btn","Copy link"),pv=mk("button","btn ghost","Preview");cp.type="button";pv.type="button";
        cp.onclick=function(){
          sync();var t=link.value;
          function fb(){link.focus();link.select();var ok=false;try{ok=document.execCommand("copy")}catch(e){}toast(ok?"Link copied":"Press Ctrl+C to copy the link")}
          if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){toast("Link copied")},fb)}else fb();
        };
        pv.onclick=function(){sync();var P=sanitize(payload());if(P)openPreview(P)};
        lr.appendChild(link);lr.appendChild(cp);lr.appendChild(pv);view.appendChild(lr);sync();
        if(/claude\.ai/.test(LINK_BASE))view.appendChild(mk("p","note","This preview runs on claude.ai, so its link does too. Host Prolio on GitHub Pages and this same button gives you your own link."));
        sec("Open a profile");
        var or=mk("div","linkrow"),oi=mk("input"),ob=mk("button","btn","Open"),oe=mk("div","err");oi.className="linkin";oi.placeholder="Paste a profile link";oi.setAttribute("aria-label","Profile link to open");ob.type="button";
        ob.onclick=function(){var P=parseShared(oi.value);if(P){oe.textContent="";openPreview(P)}else oe.textContent="That is not a valid profile link."};
        or.appendChild(oi);or.appendChild(ob);view.appendChild(or);view.appendChild(oe);
      },
      function(){
        var dl=mk("dl");
        [["Name",A.name],["Age",A.age],["From",A.from],["Gender",A.gender],["Username",A.user?"@"+A.user:""],["Display name",A.display],["Status",A.status],["Bio",A.bio],["Level",String(lv())],["XP",String(xp())]].forEach(function(r){
          dl.appendChild(mk("dt","",r[0]));dl.appendChild(mk("dd","",r[1]||"Not set"))});
        view.appendChild(dl);view.appendChild(mk("p","note","Everything stays in this page. Nothing is saved or sent anywhere."));
      }];
    function show(n){
      [].forEach.call(tb.children,function(b,i){b.setAttribute("aria-selected",i===n?"true":"false")});
      view.textContent="";prev=null;view.style.animation="none";void view.offsetWidth;view.style.animation="";views[n]();updateLocks();
    }
    names.forEach(function(n,i){var b=mk("button","tab",n);b.type="button";b.setAttribute("role","tab");b.onclick=function(){show(i)};tb.appendChild(b)});
    sc.appendChild(tb);sc.appendChild(view);check();show(1);
  }
  // theme
  var root=document.documentElement,sbs=document.querySelectorAll(".sbtn");
  function setTheme(t){root.setAttribute("data-theme",t);sbs.forEach(function(b){b.setAttribute("aria-pressed",b.dataset.t===t?"true":"false")})}
  setTheme(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
  sbs.forEach(function(b){b.addEventListener("click",function(){setTheme(b.dataset.t);if(b.dataset.t==="dark"){A.night=true;if(afterEdit)afterEdit()}})});
  // night city skyline (replaces the nature scene when the animation starts)
  function makeSky(el,minW,maxW,minH,maxH,prob){
    var inner=mk("div","skyin"),seq=[],tot=0,need=Math.max(window.innerWidth,900)*1.15,skyH=Math.max(450,window.innerHeight*.66)*.52;
    while(tot<need){
      var w=minW+Math.floor(Math.random()*(maxW-minW)),h=minH+Math.floor(Math.random()*(maxH-minH)),
          cols=Math.max(1,Math.floor((w-6)/10)),rows=Math.max(1,Math.floor(skyH*h/100/13)-1),lit=[],k;
      for(k=0;k<Math.min(cols*rows,70);k++)lit.push(Math.random()<prob);
      seq.push({w:w,h:h,lit:lit});tot+=w;
    }
    for(var pass=0;pass<2;pass++)seq.forEach(function(b){
      var d=mk("div","bld");d.style.width=b.w+"px";d.style.height=b.h+"%";
      b.lit.forEach(function(on){d.appendChild(mk("i","win"+(on?" on":"")))});
      inner.appendChild(d);
    });
    el.appendChild(inner);
  }
  makeSky(document.getElementById("skyfar"),34,64,34,66,.12);
  makeSky(document.getElementById("skynear"),52,96,14,40,.3);
  // ambient scene extras
  var cols=["#ff7aa8","#ffd23f","#fff","#b388ff","#ff9f5a"],h="";
  for(var i=0;i<14;i++)h+='<span class="pollen" style="left:'+(Math.random()*95)+'%;bottom:'+(14+Math.random()*30)+'%;animation-duration:'+(6+Math.random()*7)+'s;animation-delay:-'+(Math.random()*10)+'s"></span>';
  for(var j=0;j<12;j++)h+='<span class="flower" style="left:'+(3+Math.random()*92)+'%;background:'+cols[j%5]+';animation-delay:-'+(Math.random()*3)+'s"></span>';
  fx.innerHTML=h;
  // intro
  setTimeout(function(){type(document.getElementById("typed"),"Welcome new user",function(){btn.classList.add("show");sub.classList.add("show")})},500);
  btn.addEventListener("click",function(){
    btn.disabled=true;scene.classList.add("stage2","cool");
    setTimeout(function(){walker.classList.add("enter");scene.classList.add("riding")},550);
  });
  walker.addEventListener("animationend",function(e){
    if(e.target===walker&&e.animationName==="ride"){
      scene.classList.remove("riding");walker.classList.add("hop");
    }else if(e.target===walker&&e.animationName==="leave"){
      profile();
    }else if(e.animationName==="ollie"){
      walker.classList.remove("hop");walker.classList.add("arrived","waving");
      bubble.classList.add("show");
      setTimeout(function(){type(said,"I\u2019m gonna ask you 6 quick questions!",function(){
        setTimeout(function(){walker.classList.remove("waving");ask();panel.scrollIntoView({behavior:"smooth",block:"nearest"})},900);
      })},300);
    }
  });
  route();window.addEventListener("hashchange",route);
  document.querySelectorAll("nav a").forEach(function(a){a.addEventListener("click",function(e){e.preventDefault()})});
})();
