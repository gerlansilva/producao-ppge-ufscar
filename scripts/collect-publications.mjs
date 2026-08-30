import fs from "node:fs/promises";
import path from "node:path";

const root=process.cwd(),dataDir=path.join(root,"public","data");
const docentes=JSON.parse(await fs.readFile(path.join(dataDir,"docentes.json"),"utf8"));
const mail=process.env.OPENALEX_MAILTO||"gerlanmatfis@gmail.com";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getJson(url,headers={},attempts=4){let error;for(let n=1;n<=attempts;n++){try{const r=await fetch(url,{headers:{"User-Agent":`PPGE-UFSCar-Observatorio/2.0 (mailto:${mail})`,...headers}});if(r.ok)return r.json();error=new Error(`${r.status} ${r.statusText}`);if(![429,500,502,503,504].includes(r.status))throw error}catch(e){error=e}await sleep(650*2**(n-1))}throw error}
const normalizeDoi=v=>v?.toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//,"").replace(/^doi:\s*/,"").trim()||null;
const records=new Map(),warnings=[],coverage=[];

async function resolveAuthor(docente){
 if(docente.openalex)return docente.openalex;
 const page=await getJson(`https://api.openalex.org/authors?filter=orcid:${docente.orcid}&per-page=5&mailto=${encodeURIComponent(mail)}`);
 const exact=(page.results||[]).find(a=>a.orcid?.toLowerCase()===`https://orcid.org/${docente.orcid}`.toLowerCase());
 return exact?.id?.split("/").pop()||null;
}
async function authorWorks(authorId){
 const works=[];let cursor="*";
 do{const page=await getJson(`https://api.openalex.org/works?filter=authorships.author.id:${authorId}&per-page=200&cursor=${encodeURIComponent(cursor)}&mailto=${encodeURIComponent(mail)}`);works.push(...(page.results||[]));cursor=page.meta?.next_cursor||null;await sleep(80)}while(cursor);
 return works;
}
async function orcidFallback(docente){
 const record=await getJson(`https://pub.orcid.org/v3.0/${docente.orcid}/works`,{Accept:"application/json"});
 const dois=[];for(const group of record.group||[]){if(!(group["work-summary"]||[]).some(w=>w.type==="journal-article"))continue;const ids=group["external-ids"]?.["external-id"]||[];const doi=normalizeDoi(ids.find(i=>i["external-id-type"]?.toLowerCase()==="doi")?.["external-id-normalized"]?.value||ids.find(i=>i["external-id-type"]?.toLowerCase()==="doi")?.["external-id-value"]);if(doi)dois.push(doi)}return dois;
}

for(const [index,docente] of docentes.entries()){
 process.stdout.write(`[${index+1}/${docentes.length}] ${docente.nome}\n`);
 try{
  const authorId=await resolveAuthor(docente);
  if(!authorId){warnings.push(`${docente.nome}: perfil OpenAlex não localizado; usada a lista pública do ORCID.`);const dois=await orcidFallback(docente);coverage.push({nome:docente.nome,orcid:docente.orcid,openalex:null,encontradosOrcid:dois.length,validos:0});continue}
  const works=await authorWorks(authorId);let valid=0,suspicious=0;
  for(const work of works){const source=work.primary_location?.source,doi=normalizeDoi(work.doi||work.ids?.doi);if(!doi||work.type!=="article"||!source?.id||source.type!=="journal")continue;if(work.publication_year&&work.publication_year<1980){suspicious++;continue}const key=`doi:${doi}`,current=records.get(key)||{openalexId:work.id,doi,titulo:work.title||work.display_name||"Sem título",ano:work.publication_year||null,dataPublicacao:work.publication_date||null,periodico:source.display_name,sourceId:source.id,issn:source.issn_l||source.issn?.[0]||null,url:`https://doi.org/${doi}`,citacoes:work.cited_by_count||0,autores:(work.authorships||[]).map(a=>a.author?.display_name).filter(Boolean),docentes:[],linhas:[],topicos:(work.topics||[]).slice(0,3).map(t=>t.display_name).filter(Boolean)};if(!current.docentes.some(d=>d.orcid===docente.orcid))current.docentes.push({nome:docente.nome,orcid:docente.orcid,linha:docente.linha});if(!current.linhas.includes(docente.linha))current.linhas.push(docente.linha);records.set(key,current);valid++}
  coverage.push({nome:docente.nome,orcid:docente.orcid,openalex:authorId,encontradosOpenAlex:works.length,validos,anterioresA1980:suspicious});
 }catch(e){warnings.push(`${docente.nome}: ${e.message}`)}
 await sleep(80);
}
const artigos=[...records.values()].sort((a,b)=>(b.ano||0)-(a.ano||0)||a.titulo.localeCompare(b.titulo,"pt-BR"));
const porAno=Object.entries(artigos.reduce((o,a)=>{if(a.ano)o[a.ano]=(o[a.ano]||0)+1;return o},{})).map(([ano,total])=>({ano:Number(ano),total})).sort((a,b)=>a.ano-b.ano);const porLinha={};for(const a of artigos)for(const l of a.linhas)porLinha[l]=(porLinha[l]||0)+1;
const metricas={atualizadoEm:new Date().toISOString(),totalDocentes:docentes.length,totalArtigos:artigos.length,totalPeriodicos:new Set(artigos.map(a=>a.sourceId)).size,artigosCoautoria:artigos.filter(a=>a.autores.length>1).length,porAno,porLinha,perfisOpenAlex:coverage.filter(x=>x.openalex).length,avisos:warnings};
await fs.writeFile(path.join(dataDir,"artigos.json"),JSON.stringify(artigos,null,2)+"\n");await fs.writeFile(path.join(dataDir,"metricas.json"),JSON.stringify(metricas,null,2)+"\n");await fs.writeFile(path.join(dataDir,"cobertura.json"),JSON.stringify(coverage,null,2)+"\n");
await fs.writeFile(path.join(dataDir,"artigos.csv"),["openalex_id,doi,titulo,ano,periodico,source_id,issn,url,autores,docentes_ppge,linhas",...artigos.map(a=>[a.openalexId,a.doi,a.titulo,a.ano,a.periodico,a.sourceId,a.issn,a.url,a.autores.join("; "),a.docentes.map(d=>d.nome).join("; "),a.linhas.join("; ")].map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(","))].join("\n")+"\n");
console.log(`Concluído: ${coverage.filter(x=>x.openalex).length} perfis OpenAlex; ${artigos.length} artigos; ${warnings.length} avisos.`);
