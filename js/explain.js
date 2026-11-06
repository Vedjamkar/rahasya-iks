/* Explanations use the paper's real data. No dependencies, requests or modules. */
(function () {
  'use strict';
  var D = document, P = window.IKS && IKS.paper;
  if (!P) return;
  function el(tag, cls, txt) { var n=D.createElement(tag); if(cls)n.className=cls; if(txt!=null)n.textContent=txt; return n; }
  function $(s) { return D.querySelector(s); }
  function all(s, host) { return Array.prototype.slice.call((host||D).querySelectorAll(s)); }
  function append(n) { for(var i=1;i<arguments.length;i++) if(arguments[i])n.appendChild(arguments[i]); return n; }
  function watch(node, fn) { if(!node)return; new MutationObserver(fn).observe(node,{childList:true,subtree:true,characterData:true}); }
  function scene(n) {
    if(!n)return;
    P.inView(n,function(){n.classList.add('is-in');},{threshold:.08});
    if(!P.rm() && 'IntersectionObserver' in window) new IntersectionObserver(function(entries){n.classList.toggle('ex-playing',entries[0].isIntersecting);}).observe(n);
  }
  all('.ex-scene').forEach(scene);

  /* Source leaves retain source identity, tier and reading status separately. */
  (function(){
    var host=$('#fig-sources'), list=$('#src-list'); if(!host||!list)return;
    var leaves=el('div','ex-source-leaves'), refs=all('.refs2>li');
    refs.sort(function(a,b){return 'PRTWB'.indexOf(a.querySelector('.seal').textContent)-'PRTWB'.indexOf(b.querySelector('.seal').textContent);});
    refs.forEach(function(ref){
      var tier=ref.querySelector('.seal').textContent, number=ref.querySelector('.n').textContent;
      var a=el('a','ex-source-leaf seal-'+tier); a.href='#'+ref.id;
      a.dataset.t=tier; a.title=ref.querySelector('div').textContent;
      append(a,el('b',null,number),el('span',null,tier));
      if(number==='6'||number==='7') { a.classList.add('is-pending'); append(a,el('small',null,number==='6'?'to check':'not opened')); }
      leaves.appendChild(a);
    });
    host.insertBefore(leaves,list);
    var route=el('div','ex-source-route');
    [['Jayamaṅgalā → Kahn / Ganguly','A primary text reported through secondary sources.'],['Aitareya Brāhmaṇa → Wikipedia','A primary-text quotation reached indirectly.']].forEach(function(r){append(route,append(el('span'),el('b',null,r[0]),D.createTextNode(r[1])));});
    host.insertBefore(route,list);
    var det=el('details','own src-fold'); append(det,el('summary',null,'See the source names')); list.replaceWith(det); det.appendChild(list);
    function filter(){var on={};all('.tb',host).forEach(function(b){on[b.dataset.t]=b.getAttribute('aria-pressed')==='true';});all('.ex-source-leaf',host).forEach(function(a){a.hidden=!on[a.dataset.t];});}
    all('.tb',host).forEach(function(b){b.addEventListener('click',filter);});
    all('.srcs li',host).forEach(function(li){var a=li.querySelector('a');if(!a)return;var id=a.getAttribute('href');if(id==='#ref-6'||id==='#ref-7')li.appendChild(el('span','src-status',id==='#ref-6'?'To check':'Not opened yet'));});
    var cap=host.querySelector('.cap');cap.textContent='';append(cap,el('b',null,'Sources by tier. '),D.createTextNode(refs.filter(function(r){return r.querySelector('.seal-P');}).length+' primary texts; '+refs.filter(function(r){return r.querySelector('.seal-R');}).length+' peer-reviewed sources. Tier and reading status are separate. Papers 6 and 7 cannot support a claim yet.'));
  })();

  /* Table 1 is readable first: nine tokens in four goal niches, then optional comparison. */
  (function(){
    var host=$('#fig-table1'); if(!host)return;
    var rows=all('#t1-data tbody tr'), goals=[['integrity','Integrity','ex-integrity'],['confidentiality','Confidentiality','ex-cipher'],['encoding','Encoding','ex-encoding'],['hidden','Meaning / access','ex-access']];
    var overview=el('div','ex-overview ex-scene'), summary=el('p','ex-t1-summary');
    goals.forEach(function(g){
      var box=el('div',g[2]), art=$('#abstract .'+g[2]+' .ex-art').cloneNode(true), tokens=el('div','ex-token-row');
      var matching=rows.filter(function(r){return r.dataset.goal===g[0];});
      matching.forEach(function(r){var t=el('span','ex-practice-token'+(r.dataset.method==='yes'?' is-method':''));t.title=r.querySelector('.c-practice').textContent;t.setAttribute('aria-label',t.title);tokens.appendChild(t);});
      append(box,art,el('b',null,g[1]),tokens,el('small',null,matching.map(function(r){var p=r.querySelector('.c-practice').textContent;return /recitation/.test(p)?'Recitation':/chosen/.test(p)?'Chosen students':/Parokṣa/.test(p)?'Parokṣa':/Arthashastra/.test(p)?'Spy messages':/Mlecchita/.test(p)?'Secret-writing art':/ciphers/.test(p)?'Cipher tables':/Aryabhata/.test(p)?'Aryabhata':/Katapayadi/.test(p)?'Katapayadi':'Sandhyā bhāṣā';}).join(' · ')));
      overview.appendChild(box);
    });
    var conf=rows.filter(function(r){return r.dataset.goal==='confidentiality';}),methods=conf.filter(function(r){return r.dataset.method==='yes';});
    append(summary,el('b',null,conf.length+' of '+rows.length),D.createTextNode(' concern secret messages. '),el('b',null,String(methods.length)),D.createTextNode(' gives a method we could rebuild.'));
    var det=el('details','own ex-sort');append(det,el('summary',null,'Compare your placement with ours'));
    while(host.firstChild)det.appendChild(host.firstChild);
    append(host,overview,summary,el('p','ex-t1-key','Each leaf is one practice. The outlined leaf is the method-bearing row. These placements are our judgement.'),det);scene(overview);
    var allBtn=host.querySelector('.t1-all');allBtn.addEventListener('click',function(){var line=host.querySelector('.t1-live');if(/^You placed 0/.test(line.textContent))line.textContent='Our placements are shown. You have not made any personal placements.';});
  })();

  /* Fig. 1: the same computed sequences, readable as well as spatial. */
  (function(){
    var host=$('#fig-1'),C=IKS.logic.chant;if(!host||!C)return;
    var defs=[['Pada',C.WORDS.map(function(_,i){return i;})],['Krama',[].concat.apply([],C.kramaIdx(C.WORDS.length))],['Jaṭā',[].concat.apply([],C.jataIdx(C.WORDS.length))],['Ghana',[].concat.apply([],C.ghanaIdx(C.WORDS.length))]];
    var label=el('p','ex-courses','Top → bottom: Pada · Krama · Jaṭā · Ghana. Each brick is one word said.');host.querySelector('.c1-art').appendChild(label);
    var ribbons=[];
    all('.c1-row',host).forEach(function(row,i){var rib=el('div','ex-ribbon');rib.setAttribute('role','img');defs[i][1].forEach(function(word){var tick=el('i');tick.dataset.word=word;rib.appendChild(tick);});var group=el('div','ex-seq');append(group,el('p','ex-sequence-label',defs[i][0]+' · reading order →'),rib);row.after(group);ribbons.push(rib);});
    function mark(q){ribbons.forEach(function(rib,i){all('i',rib).forEach(function(t){t.classList.toggle('is-word',+t.dataset.word===q);});rib.setAttribute('aria-label',defs[i][0]+': '+defs[i][1].filter(function(x){return x===q;}).length+' occurrences of '+C.WORDS[q]+', in reading order.');});}
    all('.plq',host).forEach(function(b,i){b.addEventListener('click',function(){mark(i);});});mark(3);
  })();

  /* Fig. 2 labels the source endpoints as they move with the date choice. */
  (function(){
    var host=$('#fig-years');if(!host)return;
    var dates=el('div','ex-dating'),early=el('span'),late=el('span');append(dates,early,late);$('#yrs').before(dates);
    var defs=[['Kama Sutra · latest date','6th c. CE','Jayamaṅgalā · earliest date','10th c. CE'],['Kama Sutra · middle dates','3rd c. CE','Jayamaṅgalā · middle dates','12th c. CE'],['Kama Sutra · earliest date','1st c. CE','Jayamaṅgalā · latest date','13th c. CE']];
    function show(i){early.textContent='';late.textContent='';append(early,el('b',null,defs[i][0]),D.createTextNode(defs[i][1]+' · named, no method'));append(late,el('b',null,defs[i][2]),D.createTextNode(defs[i][3]+' · method we found'));}
    all('#yrs-ctl button').forEach(function(b,i){b.addEventListener('click',function(){show(i);});});show(1);
  })();

  /* Fig. 3: fixed pairs are shown simultaneously, never concealed by a tile flip. */
  (function(){var host=$('#fig-3');if(!host)return;var key=el('div','ex-swap-key');append(key,el('span',null,'Swaps: original above, result below'),el('span',null,'Unchanged: one tall tablet'));host.querySelector('.c3-tiles').before(key);})();

  /* Fig. 4 follows the exact seeded table and frequency ranking used by the figure. */
  (function(){
    var host=$('#fig-count'),L=IKS.logic.breakit;if(!host||!L)return;
    var path=el('div','ex-count-path ex-scene'),a=el('div'),b=el('div'),c=el('div');
    append(path,a,el('i',null,'→'),b,el('i',null,'→'),c);host.querySelector('.bars').before(path);
    var note=el('p','ex-count-note');path.after(note);
    var table=L.randomReciprocal(4107,13);
    function render(){var text=$('#cnt-text').value,cipher=L.applyPairs(text,table).toUpperCase(),rank=L.rankCipher(cipher),counts=L.freq(cipher),top=rank[0],guess=L.ENGLISH_ORDER[0];
      a.textContent='';b.textContent='';c.textContent='';
      append(a,el('b',null,top||'–'),el('small',null,'most common cipher letter'));
      append(b,el('b',null,String(counts[top]||0)),el('small',null,'occurrences counted'));
      append(c,el('b',null,guess),el('small',null,'English rank suggests'));
      var total=(text.match(/[a-z]/gi)||[]).length;
      note.textContent=total<30?'Too short to assess recovery. Try at least 30 English letters.':(table[top]===guess?'That guess matches this test’s known input.':'That guess is wrong for this test’s known input.')+' Other ranks can be wrong: counting gives only a partial recovery. English · same-type table.';
    }
    render();watch($('#cnt-rec'),render);scene(path);
  })();

  /* Fig. 5 retains vowels visibly and uses the live parser for cluster decisions. */
  (function(){
    var host=$('#fig-5'),K=IKS.logic.katapayadi;if(!host||!K)return;
    var word=el('div','ex-kata-word ex-scene'),rule=el('div','ex-kata-rule');
    host.querySelector('.k5-slots').before(word);append(rule,el('i',null,'↓'),el('span',null,'Vowels bypass the digit lane. In a cluster, only the last consonant counts.'));host.querySelector('.k5-slots').after(rule);
    var pub=el('p','ex-kata-public','Same open table → anyone can read the number');host.querySelector('.k5-plate').after(pub);
    function render(){word.textContent='';var raw=$('#k5-in').value;Array.from(raw).forEach(function(ch){if(!/[a-zA-Z]/.test(ch))return;var vowel=/[aeiouAEIOU]/.test(ch),tile=el('span','ex-kata-letter'+(vowel?' is-vowel':''),ch);if(vowel)tile.appendChild(el('small',null,'bypass'));word.appendChild(tile);});word.setAttribute('aria-label','Input with vowels marked as bypassing the digit lane');}
    render();watch(host.querySelector('.k5-slots'),render);scene(word);
  })();

  /* Fig. 6 attaches actual key values to the public journey and private home. */
  (function(){
    var host=$('#fig-6');if(!host)return;
    var keys=host.querySelector('.c6-keys');host.querySelector('.c6-lanes').after(keys);
    all('.c6-lane').forEach(function(svg){svg.setAttribute('aria-label',svg.getAttribute('aria-label')+' The scene is an explanatory analogy.');});
  })();

  /* In-page citations reveal the destination before scrolling, including deep links. */
  function revealTarget(id,scroll){var target=D.getElementById(id);if(!target)return;var parent=target.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}if(scroll)requestAnimationFrame(function(){target.scrollIntoView({block:'start',behavior:P.rm()?'instant':'smooth'});});}
  D.addEventListener('click',function(e){var a=e.target.closest('a[href^="#"]');if(!a)return;var id=a.getAttribute('href').slice(1);if(!id)return;revealTarget(id,false);});
  window.addEventListener('hashchange',function(){revealTarget(decodeURIComponent(location.hash.slice(1)),true);});
  if(location.hash)revealTarget(decodeURIComponent(location.hash.slice(1)),true);
})();
