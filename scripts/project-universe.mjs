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
const label = value => String(value).replace(/[^\p{L}\p{N} .:/#-]/gu,' ').slice(0,100);
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
  return '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="248" viewBox="0 0 800 248"><title>'+escape(name)+' project card</title><defs><clipPath id="clip"><rect x="1" y="1" width="798" height="246" rx="24"/></clipPath><pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="'+ink+'" opacity=".15"/></pattern></defs><g clip-path="url(#clip)"><rect width="800" height="248" fill="'+bg+'"/><rect x="500" width="300" height="248" fill="'+color+'"/><rect x="500" width="300" height="248" fill="url(#dots)"/><g transform="translate(650 120)" color="'+color+'">'+(motifs[repo]||art[shape])+'</g><g font-family="Geist, Arial, sans-serif"><text x="32" y="34" fill="'+muted+'" font-size="12" letter-spacing="2">ROD / PROJECT UNIVERSE</text><text x="30" y="94" fill="'+fg+'" font-size="43" font-weight="700">'+escape(name)+'</text><text x="32" y="126" fill="'+muted+'" font-size="17">'+escape(tag)+'</text><text x="32" y="153" fill="'+muted+'" font-size="12">'+info+'</text><path d="M32 174H468" stroke="'+muted+'" opacity=".25"/><circle cx="39" cy="204" r="6" fill="'+statusInk+'"/><text x="52" y="209" fill="'+statusInk+'" font-size="13" font-weight="700">'+escape(status.replaceAll('_',' ').toUpperCase())+'</text><text x="265" y="209" fill="'+fg+'" font-size="13" font-weight="700">'+prs+' OPEN PRs</text><text x="775" y="228" text-anchor="end" fill="'+ink+'" font-size="11" letter-spacing="2">/ '+escape(repo.toUpperCase())+'</text></g></g><rect x="1" y="1" width="798" height="246" rx="24" fill="none" stroke="'+muted+'" stroke-opacity=".3"/></svg>';
}

const dir='assets/projects';
await mkdir(dir,{recursive:true});
const blocks=[], generated=new Set();
for (const [repo,name,tag,color,shape] of projects) {
  const base='repos/rodkisten/'+repo, url='https://github.com/rodkisten/'+repo;
  let meta, prs, runs;
  try {
    meta=api(base);
    if(meta.private || meta.visibility !== 'public') continue;
    prs=api(base+'/pulls?state=open&per_page=100',true).flat();
    runs=api(base+'/actions/runs?per_page=100').workflow_runs;
  } catch(error) {
    console.warn('Unable to retrieve '+repo);
    blocks.push('**'+name+'** · Data unavailable');
    continue;
  }
  const latest=new Map();
  for(const run of runs){
    if(run.actor?.type==='Bot'||['skipped','cancelled'].includes(run.conclusion)) continue;
    const key=run.workflow_id+':'+(run.pull_requests?.[0]?.number ?? run.head_branch);
    if(!latest.has(key)) latest.set(key,run);
  }
  const recent=[...latest.values()].slice(0,3);
  const main=[...latest.values()].find(run=>run.head_branch===meta.default_branch);
  const status=main?statusOf(main):'unknown';
  for(const [theme,bg,fg,muted] of [['dark','#101218','#f8fafc','#a1a1aa'],['light','#f8fafc','#18181b','#52525b']]){
    const file=repo+'-'+theme+'.svg';
    const svg=renderCard({repo,name,tag,color,shape,theme,bg,fg,muted,status,prs:prs.length,branch:meta.default_branch,language:meta.language});
    await writeFile(dir+'/'+file,svg);
    generated.add(file);
  }
  const picture='<picture><source media="(prefers-color-scheme: dark)" srcset="'+dir+'/'+repo+'-dark.svg"><img alt="'+escape(name)+' project status" src="'+dir+'/'+repo+'-light.svg" width="800"></picture>';
  const links=['[Repository]('+url+')','[All PRs]('+url+'/pulls)','[Actions]('+url+'/actions)',...recent.map(r=>'['+label(r.name)+' · '+label(statusOf(r))+']('+r.html_url+')'),...prs.slice(0,3).map(p=>'[#'+p.number+' '+label(p.title)+']('+p.html_url+')')];
  blocks.push('<a href="'+url+'">'+picture+'</a>\n\n'+links.join(' · '));
  console.log(name+': '+status+' / '+prs.length+' open PRs');
}
for(const file of await readdir(dir)) if(projects.some(([repo])=>[repo+'-dark.svg',repo+'-light.svg'].includes(file))&&!generated.has(file)) await unlink(dir+'/'+file);
const old=await readFile('README.md','utf8');
const start='<!-- project-universe:start -->',end='<!-- project-universe:end -->';
const section=start+'\n\n## Project Universe\n\n'+blocks.join('\n\n')+'\n\n'+end;
const a=old.indexOf(start),b=old.indexOf(end);
if((a<0)!==(b<0)|| (a>=0&&b<a)) throw new Error('Invalid README markers');
await writeFile('README.md',a>=0?old.slice(0,a)+section+old.slice(b+end.length):section+'\n\n---\n\n'+old);
