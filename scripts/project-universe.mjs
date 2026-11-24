import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';

const projects = [
  ['orb','orb','Automation in orbit','#a78bfa','orbit'],
  ['jardim','Jardim','A garden of digital memories','#fbbf24','flower'],
  ['photointel','PhotoIntel','Visual intelligence cloud','#38bdf8','camera'],
  ['userscripts-cf','Userscripts','Make the web yours','#fb7185','puzzle'],
  ['shell','Shell','Explore the command line','#34d399','terminal'],
  ['ast-explorer','AST Explorer','Code beneath the surface','#2dd4bf','tree'],
  ['rodtui','RodTUI','Terminal interfaces in Rust','#fb923c','crab'],
  ['eita','Eita','Developer tooling','#facc15','bolt'],
  ['github','GitHub Tools','Engineering automation','#c084fc','orbit'],
  ['ejc','EJC','Community tools','#f472b6','flower'],
];
// Explicit production URLs; preview URLs are only taken from GitHub deployment records.
const sites = {
  photointel: 'https://photos.migos.club',
  shell: 'https://shell.migos.club',
  'ast-explorer': null,
};
const art = {
  orbit: '<ellipse rx="80" ry="35" transform="rotate(-30)"/><circle r="37"/><circle cx="61" cy="-35" r="8"/>',
  flower: Array.from({length:8},(_,i)=>'<ellipse cy="-43" rx="16" ry="30" transform="rotate('+i*45+')"/>').join('')+'<circle r="20"/>',
  camera: '<rect x="-65" y="-45" width="130" height="90" rx="18"/><circle r="30"/><path d="M-40 -45l12 -15h56l12 15"/>',
  puzzle: '<path d="M-60 -60h40a20 20 0 1 1 40 0h40v40a20 20 0 1 1 0 40v40H-60V20a20 20 0 1 0 0-40z"/>',
  terminal: '<rect x="-70" y="-55" width="140" height="110" rx="15"/><path d="M-45 -25l25 25 -25 25 M-5 25h45"/>',
  tree: '<path d="M0 -50v40 M-50 -10h100 M-50 -10v40 M50 -10v40"/><circle cy="-55" r="12"/><circle cx="-50" cy="42" r="12"/><circle cx="50" cy="42" r="12"/>',
  crab: '<ellipse cy="10" rx="45" ry="30"/><path d="M-40 0l-30-25 15-25 20 20 M40 0l30-25-15-25-20 20 M-40 30l-25 20 M40 30l25 20"/><circle cx="-15" r="3"/><circle cx="15" r="3"/>',
  bolt: '<path d="M20 -65l-70 75h45l-15 55 70-85H5z"/>',
};
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const label = value => String(value).replace(/[\r\n]+/g,' ').replace(/[\\[\]<>`*_]/g,c=>'\\'+c).trim().slice(0,120);
const api = (path, paginate=false) => JSON.parse(execFileSync('gh',['api',...(paginate?['--paginate','--slurp']:[]),path],{encoding:'utf8',maxBuffer:20*1024*1024}));
const statusOf = run => run.conclusion || run.status;
const colors = {success:'#16a34a',failure:'#dc2626',in_progress:'#2563eb',queued:'#ca8a04'};
// Each project has a distinct editorial motif, with semantic status kept separate.
function renderCard({repo,name,tag,color,shape,theme,bg,fg,muted,status,prs,branch,language}) {
  const dark=theme==='dark';
  const ink='#14141b';
  const motifs={
    orb: '<circle r="105" fill="none" stroke="currentColor" opacity=".25"/><circle r="82" fill="none" stroke="currentColor" opacity=".4"/><circle r="44" fill="currentColor"/><ellipse rx="110" ry="30" transform="rotate(-35)" fill="none" stroke="'+ink+'" stroke-width="5"/><circle cx="85" cy="-60" r="12" fill="'+ink+'"/>',
    jardim: Array.from({length:12},(_,i)=>'<ellipse cy="-58" rx="23" ry="48" transform="rotate('+i*30+')" fill="currentColor" stroke="'+ink+'" stroke-width="1.5"/>').join('')+'<circle r="39" fill="'+ink+'"/><circle r="25" fill="none" stroke="currentColor" stroke-dasharray="2 6" stroke-width="8"/>',
    photointel: '<rect x="-100" y="-78" width="200" height="156" rx="24" fill="'+ink+'"/><circle r="62" fill="currentColor"/>'+Array.from({length:6},(_,i)=>'<path d="M0 -60L52 30L0 15Z" transform="rotate('+i*60+')" fill="'+ink+'" opacity=".8"/>').join('')+'<circle r="20" fill="currentColor"/><circle cx="77" cy="-55" r="7" fill="currentColor"/>',
    'userscripts-cf': '<rect x="-105" y="-75" width="210" height="150" rx="15" fill="'+ink+'"/><path d="M-105 -40H105" stroke="currentColor" stroke-width="2"/><circle cx="-84" cy="-57" r="5" fill="currentColor"/><circle cx="-68" cy="-57" r="5" fill="currentColor"/><path d="M-55 -12L-80 12L-55 36M55 -12L80 12L55 36M15 -20L-15 45" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>',
    shell: '<rect x="-110" y="-76" width="220" height="152" rx="16" fill="'+ink+'"/><path d="M-83 -35l30 25-30 25M-40 15h65" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M-82 42h130M-82 56h80" stroke="currentColor" opacity=".35" stroke-width="5"/>',
    'ast-explorer': '<path d="M0 -70V-25M-75 -25H75M-75 -25V35M75 -25V35M0 -25V35" fill="none" stroke="'+ink+'" stroke-width="5"/>'+[[-75,48],[0,48],[75,48],[0,-70]].map(([x,y])=>'<rect x="'+(x-20)+'" y="'+(y-16)+'" width="40" height="32" rx="8" fill="'+ink+'"/><circle cx="'+x+'" cy="'+y+'" r="6" fill="currentColor"/>').join(''),
    rodtui: '<g fill="'+ink+'"><ellipse cy="15" rx="62" ry="43"/><path d="M-50 0L-100 -40L-85 -80L-60 -45L-38 -65L-20 -30ZM50 0L100 -40L85 -80L60 -45L38 -65L20 -30Z"/></g><path d="M-45 35l-40 35M45 35l40 35M-20 50l-15 28M20 50l15 28" stroke="'+ink+'" stroke-width="12" stroke-linecap="round"/><circle cx="-23" cy="5" r="8" fill="currentColor"/><circle cx="23" cy="5" r="8" fill="currentColor"/>',
    eita: '<path d="M30 -105L-90 20H-15L-40 105L90 -25H15Z" fill="'+ink+'"/><path d="M-100 -65h45M60 65h45" stroke="'+ink+'" stroke-width="6"/>',
    github: '<g fill="'+ink+'"><rect x="-100" y="-65" width="65" height="42" rx="9"/><rect x="35" y="-65" width="65" height="42" rx="9"/><rect x="-32" y="25" width="64" height="42" rx="9"/></g><path d="M-68 -23V0H68V-23M0 0V25" fill="none" stroke="'+ink+'" stroke-width="5"/><path d="M-83 -44l10 10 20-20M52 -44l10 10 20-20M-15 45l10 10 20-20" stroke="currentColor" stroke-width="5" fill="none"/>',
    ejc: '<path d="M0 85C-140 0 -95 -100 0 -45C95 -100 140 0 0 85Z" fill="'+ink+'"/><path d="M0 -30V35M-32 0H32" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>'
  };
  const statusInk=dark?({success:'#4ade80',failure:'#fb7185',in_progress:'#93c5fd',queued:'#fde047'}[status]||'#a1a1aa'):(colors[status]||'#64748b');
  const info=escape((language||'Code')+' / '+branch);
  const paper=dark?'#18181b':'#f5f3ee';
  const subtle=dark?'#303036':'#dedbd4';
  const statusLabel=escape(status.replaceAll('_',' ').toUpperCase());
  const illustration=(motifs[repo]||art[shape]).replaceAll('currentColor',repo==='orb'||repo==='jardim'?'#f5f3ee':color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="280" viewBox="0 0 800 280">
  <title>${escape(name)} project card</title>
  <defs><clipPath id="frame"><rect x="1" y="1" width="798" height="278" rx="18"/></clipPath>
  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#14141b" stroke-opacity=".09"/></pattern></defs>
  <g clip-path="url(#frame)">
  <rect width="800" height="280" fill="${paper}"/>
  <rect x="508" width="292" height="280" fill="${color}"/>
  <rect x="508" width="292" height="280" fill="url(#grid)"/>
  <circle cx="654" cy="133" r="112" fill="none" stroke="#14141b" stroke-opacity=".18"/>
  <circle cx="654" cy="133" r="94" fill="none" stroke="#14141b" stroke-opacity=".12"/>
  <g transform="translate(654 133) scale(.88)" color="${color}">${illustration}</g>
  <g font-family="Geist,Arial,sans-serif">
  <circle cx="34" cy="32" r="5" fill="${color}"/>
  <text x="48" y="36" font-size="11" font-weight="600" letter-spacing="2" fill="${muted}">RODKISTEN / PROJECTS</text>
  <text x="30" y="103" font-size="48" letter-spacing="-2" font-weight="700" fill="${fg}">${escape(name)}</text>
  <text x="33" y="136" font-size="17" fill="${muted}">${escape(tag)}</text>
  <text x="33" y="166" font-size="12" font-family="monospace" fill="${muted}">${info}</text>
  <path d="M32 193H476" stroke="${subtle}"/>
  <rect x="32" y="211" width="208" height="37" rx="7" fill="${statusInk}" fill-opacity=".10"/>
  <circle cx="47" cy="229" r="4" fill="${statusInk}"/>
  <text x="59" y="233" font-size="11" font-weight="700" fill="${statusInk}">${statusLabel}</text>
  <text x="264" y="235" font-size="24" font-weight="700" fill="${fg}">${prs}</text>
  <text x="312" y="232" font-size="11" letter-spacing="1" fill="${muted}">OPEN PRs</text>
  <text x="526" y="25" font-size="10" font-family="monospace" fill="#14141b">FIG. ${String(projects.findIndex(p=>p[0]===repo)+1).padStart(2,'0')}</text>
  <text x="782" y="260" text-anchor="end" font-size="11" font-weight="700" letter-spacing="1.5" fill="#14141b">${escape(repo.toUpperCase())}</text>
  </g></g><rect x="1" y="1" width="798" height="278" rx="18" fill="none" stroke="${subtle}"/></svg>`;

}

const dir='assets/projects';
await mkdir(dir,{recursive:true});
const blocks=[], generated=new Set(), failures=[];
let successful=0;
const totals={prs:0,healthy:0,failed:0,pending:0,unknown:0};
for (const [repo,name,tag,color,shape] of projects) {
  const base='repos/rodkisten/'+repo, url='https://github.com/rodkisten/'+repo;
  let meta, prs, runs;
  try {
    meta=api(base);
    if(meta.private || meta.visibility !== 'public') continue;
    prs=api(base+'/pulls?state=open&per_page=100',true).flat();
    runs=api(base+'/actions/runs?per_page=100').workflow_runs;
  } catch(error) {
    console.warn('Unable to retrieve '+repo+': '+error.message);
    failures.push(repo);
    blocks.push('**'+name+'** · Data unavailable');
    continue;
  }
  successful++;
  const latest=new Map();
  for(const run of runs){
    if(run.actor?.type==='Bot'||['skipped','cancelled'].includes(run.conclusion)) continue;
    const key=run.workflow_id+':'+(run.pull_requests?.[0]?.number ?? run.head_branch);
    if(!latest.has(key)) latest.set(key,run);
  }
  const recent=[...latest.values()].slice(0,3);
  const main=[...latest.values()].filter(run=>run.head_branch===meta.default_branch);
  const states=main.map(statusOf);
  const status=['failure','timed_out','action_required','in_progress','queued','pending','requested'].find(state=>states.includes(state)) || (states.length&&states.every(state=>state==='success')?'success':states[0]||'unknown');
  totals.prs+=prs.length;
  if(status==='success') totals.healthy++;
  else if(['failure','timed_out','action_required'].includes(status)) totals.failed++;
  else if(['in_progress','queued','pending','requested'].includes(status)) totals.pending++;
  else totals.unknown++;
  for(const [theme,bg,fg,muted] of [['dark','#18181b','#f8fafc','#a1a1aa'],['light','#f5f3ee','#18181b','#52525b']]){
    const file=repo+'-'+theme+'.svg';
    const svg=renderCard({repo,name,tag,color,shape,theme,bg,fg,muted,status,prs:prs.length,branch:meta.default_branch,language:meta.language});
    await writeFile(dir+'/'+file,svg);
    generated.add(file);
  }
  const picture='<picture><source media="(prefers-color-scheme: dark)" srcset="'+dir+'/'+repo+'-dark.svg"><img alt="'+escape(name)+' project status" src="'+dir+'/'+repo+'-light.svg" width="800"></picture>';
  const production=Object.hasOwn(sites,repo) ? sites[repo] : (/^https:\/\//.test(meta.homepage||'') ? meta.homepage : null);
  const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href.replaceAll('(','%28').replaceAll(')','%29'):null;}catch{return null;}};
  const extra=[];
  if(safeUrl(production)) extra.push('[Live app]('+safeUrl(production)+')');
  // A preview is linked only when GitHub reports a successful deployment for the PR head.
  for(const pr of prs.slice(0,3)){
    try {
      const deployments=api(base+'/deployments?sha='+encodeURIComponent(pr.head.sha)+'&per_page=10');
      for(const deployment of deployments.filter(d=>/preview|pr[- /]|pull.request/i.test(d.environment)).slice(0,3)){
        const states=api(base+'/deployments/'+deployment.id+'/statuses?per_page=1');
        const state=states[0];
        const preview=safeUrl(state?.environment_url);
        if(state?.state==='success'&&preview){extra.push('[Preview #'+pr.number+']('+preview+')');break;}
      }
    }catch{console.warn('Preview lookup unavailable for '+repo+' #'+pr.number);}
  }
  const links=[...extra,'[Repository]('+url+')','[All PRs]('+url+'/pulls)','[Actions]('+url+'/actions)',...recent.map(r=>'['+label(r.name)+' · '+label(statusOf(r))+']('+r.html_url+')'),...prs.slice(0,3).map(p=>'[#'+p.number+' '+label(p.title)+']('+p.html_url+')')];
  blocks.push('<a href="'+url+'">'+picture+'</a>\n\n'+links.join(' · '));
  console.log(name+': '+status+' / '+prs.length+' open PRs');
}
if(!successful) throw new Error('No public project data retrieved; refusing to overwrite README. Check token permissions.');
console.log('Project Universe: '+successful+' projects retrieved; '+failures.length+' unavailable');
for(const file of await readdir(dir)) if(projects.some(([repo])=>[repo+'-dark.svg',repo+'-light.svg'].includes(file))&&!generated.has(file)) await unlink(dir+'/'+file);
const metrics=[['PROJECTS',successful,'#a78bfa'],['OPEN PRs',totals.prs,'#38bdf8'],['CI HEALTHY',totals.healthy,'#34d399'],['CI FAILING',totals.failed,'#fb7185']];
for(const [theme,bg,fg,muted] of [['dark','#18181b','#f8fafc','#a1a1aa'],['light','#f8fafc','#18181b','#52525b']]){
  const tiles=metrics.map(([label,value,color],i)=>{
    const x=30+i*188;
    return '<g transform="translate('+x+' 176)"><rect width="176" height="92" rx="12" fill="'+color+'" fill-opacity=".12" stroke="'+color+'" stroke-opacity=".5"/><text x="15" y="28" font-size="11" letter-spacing="1.5" fill="'+muted+'">'+label+'</text><text x="14" y="69" font-size="36" font-weight="700" fill="'+fg+'">'+value+'</text></g>';
  }).join('');
  const planets=projects.map((p,i)=>{const a=i*2.399963;const x=666+Math.cos(a)*(40+i*7);const y=79+Math.sin(a)*(18+i*3);return '<circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="'+(5+i%4*2)+'" fill="'+p[3]+'"/>';}).join('');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300"><title>Rod’s Project Universe</title><rect x="1" y="1" width="798" height="298" rx="24" fill="'+bg+'" stroke="'+muted+'" stroke-opacity=".3"/><g font-family="Geist,Arial,sans-serif"><text x="32" y="38" font-size="12" letter-spacing="3" fill="'+muted+'">@RODKISTEN / LIVE DASHBOARD</text><text x="29" y="90" font-size="43" font-weight="700" fill="'+fg+'">Project Universe</text><text x="32" y="122" font-size="16" fill="'+muted+'">Ideas in orbit. Software in motion.</text><text x="32" y="150" font-size="12" fill="'+muted+'">'+totals.pending+' pending · '+totals.unknown+' unknown · '+failures.length+' unavailable</text>'+tiles+'</g><g fill="none" stroke="'+muted+'" stroke-opacity=".3"><ellipse cx="666" cy="79" rx="100" ry="42" transform="rotate(-20 666 79)"/><ellipse cx="666" cy="79" rx="77" ry="28" transform="rotate(25 666 79)"/></g>'+planets+'</svg>';
  await writeFile(dir+'/universe-'+theme+'.svg',svg);
}
const hero='<picture><source media="(prefers-color-scheme: dark)" srcset="assets/projects/universe-dark.svg"><img alt="Project Universe: '+successful+' projects, '+totals.prs+' open PRs, '+totals.healthy+' healthy, '+totals.failed+' failing" src="assets/projects/universe-light.svg" width="800"></picture>';

const old=await readFile('README.md','utf8');
const start='<!-- project-universe:start -->',end='<!-- project-universe:end -->';
const section=start+'\n\n## Project Universe\n\n'+hero+'\n\nA living dashboard of public projects. CI reflects recent default-branch workflows; preview links require successful GitHub deployments.\n\n'+blocks.join('\n\n')+'\n\n'+end;
const a=old.indexOf(start),b=old.indexOf(end);
if((a<0)!==(b<0)|| (a>=0&&b<a)) throw new Error('Invalid README markers');
await writeFile('README.md',a>=0?old.slice(0,a)+section+old.slice(b+end.length):section+'\n\n---\n\n'+old);
