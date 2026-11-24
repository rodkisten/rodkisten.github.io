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
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="180" viewBox="0 0 640 180"><rect x="1" y="1" width="638" height="178" rx="20" fill="'+bg+'" stroke="'+color+'" stroke-opacity=".45"/><rect x="20" y="22" width="5" height="136" rx="2" fill="'+color+'"/><g transform="translate(530 85)" fill="none" stroke="'+color+'" stroke-width="3" opacity=".8">'+art[shape]+'</g><g font-family="Arial,sans-serif"><text x="42" y="39" font-size="11" letter-spacing="3" fill="'+muted+'">ROD / PROJECT UNIVERSE</text><text x="40" y="82" font-size="32" font-weight="bold" fill="'+fg+'">'+escape(name)+'</text><text x="42" y="108" font-size="14" fill="'+muted+'">'+escape(tag)+'</text><circle cx="48" cy="145" r="5" fill="'+(colors[status]||'#94a3b8')+'"/><text x="60" y="150" font-size="13" fill="'+fg+'">'+escape(status.replaceAll('_',' ').toUpperCase())+' · '+prs.length+' OPEN PRs</text></g></svg>';
    await writeFile(dir+'/'+file,svg);
    generated.add(file);
  }
  const picture='<picture><source media="(prefers-color-scheme: dark)" srcset="'+dir+'/'+repo+'-dark.svg"><img alt="'+escape(name)+' project status" src="'+dir+'/'+repo+'-light.svg" width="640"></picture>';
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
