import fs from "node:fs/promises";
import path from "node:path";

const root=process.cwd(),dataDir=path.join(root,"public","data");
const docentes=JSON.parse(await fs.readFile(path.join(dataDir,"docentes.json"),"utf8"));
const mail=process.env.OPENALEX_MAILTO||"gerlanmatfis@gmail.com";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function getJson(url,headers={},attempts=4){
 let error;
 for(let n=1;n<=attempts;n++){
  try{const r=await fetch(url,{headers:{"User-Agent":`PPGE-UFSCar-Observatorio/1.0 (mailto:${mail})`,...headers}});if(r.ok)return r.json();error=new Error(`${r.status} ${r.statusText}`);if(![429,500,502,503,504].includes(r.status))throw error}catch(e){error=e}
  await sleep(700*2**(n-1));
 }
 throw error;
}
const normalizeDoi=v=>v?.toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//,"").replace(/^doi:\s*/,"").trim()||null;
const chunks=(items,size)=>Array.from({length:Math.ceil(items.length/size)},(_,i)=>items.slice(i*size,i*size+size));
const claims=new Map(),warnings=[];

for(const [index,docente] of docentes.entries()){
 process.stdout.write(`[ORCID ${index+1}/${docentes.length}] ${docente.nome}\n`);
 try{
  const record=await getJson(`https://pub.orcid.org/v3.0/${docente.orcid}/works`,{Accept:"application/json"});
  for(const group of record.group||[]){
   const summaries=group["work-summary"]||[];
   const journal=summaries.find(w=>w.type==="journal-article");
   if(!journal)continue;
   const ids=[...(group["external-ids"]?.["external-id"]||[]),...(journal["external-ids"]?.["external-id"]||[])];
   const doi=normalizeDoi(ids.find(id=>id["external-id-type"]?.toLowerCase()==="doi")?.["external-id-normalized"]?.value||ids.find(id=>id["external-id-type"]?.toLowerCase()==="doi")?.["external-id-value"]);
   if(!doi)continue;
   const current=claims.get(doi)||{doi,docentes:[],linhas:[]};
   if(!current.docentes.some(d=>d.orcid===docente.orcid))current.docentes.push({nome:docente.nome,orcid:docente.orcid,linha:docente.linha});
   if(!current.linhas.includes(docente.linha))current.linhas.push(docente.linha);
   claims.set(doi,current);
  }
 }catch(e){warnings.push(`${docente.nome}: falha no ORCID (${e.message})`)}
 await sleep(80);
}

const openalex=[];
const doiList=[...claims.keys()];
for(const [index,batch] of chunks(doiList,40).entries()){
 process.stdout.write(`[OpenAlex ${index+1}/${Math.ceil(doiList.length/40)}] ${batch.length} DOI\n`);
 try{
  const filter=encodeURIComponent(`doi:${batch.join("|")}`);
  const page=await getJson(`https://api.openalex.org/works?filter=${filter}&per-page=200&mailto=${encodeURIComponent(mail)}`);
  openalex.push(...(page.results||[]));
 }catch(e){warnings.push(`Lote OpenAlex ${index+1}: ${e.message}`)}
 await sleep(120);
}

const artigos=[];
for(const work of openalex){
 const doi=normalizeDoi(work.doi||work.ids?.doi),claim=claims.get(doi),source=work.primary_location?.source;
 if(!claim||work.type!=="article"||!source?.id||!source?.display_name||source.type!=="journal")continue;
 artigos.push({
  openalexId:work.id,doi,titulo:work.title||work.display_name||"Sem título",ano:work.publication_year||null,dataPublicacao:work.publication_date||null,
  periodico:source.display_name,sourceId:source.id,issn:source.issn_l||source.issn?.[0]||null,url:`https://doi.org/${doi}`,citacoes:work.cited_by_count||0,
  autores:(work.authorships||[]).map(a=>a.author?.display_name).filter(Boolean),docentes:claim.docentes,linhas:claim.linhas
 });
}
artigos.sort((a,b)=>(b.ano||0)-(a.ano||0)||a.titulo.localeCompare(b.titulo,"pt-BR"));
const porAno=Object.entries(artigos.reduce((o,a)=>{if(a.ano)o[a.ano]=(o[a.ano]||0)+1;return o},{})).map(([ano,total])=>({ano:Number(ano),total})).sort((a,b)=>a.ano-b.ano);
const porLinha={};for(const a of artigos)for(const l of a.linhas)porLinha[l]=(porLinha[l]||0)+1;
const metricas={atualizadoEm:new Date().toISOString(),totalDocentes:docentes.length,totalArtigos:artigos.length,totalPeriodicos:new Set(artigos.map(a=>a.sourceId)).size,artigosCoautoria:artigos.filter(a=>a.autores.length>1).length,porAno,porLinha,registrosOrcidComDoi:claims.size,avisos:warnings};
await fs.writeFile(path.join(dataDir,"artigos.json"),JSON.stringify(artigos,null,2)+"\n");
await fs.writeFile(path.join(dataDir,"metricas.json"),JSON.stringify(metricas,null,2)+"\n");
await fs.writeFile(path.join(dataDir,"artigos.csv"),["openalex_id,doi,titulo,ano,periodico,source_id,issn,url,docentes,linhas",...artigos.map(a=>[a.openalexId,a.doi,a.titulo,a.ano,a.periodico,a.sourceId,a.issn,a.url,a.docentes.map(d=>d.nome).join("; "),a.linhas.join("; ")].map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(","))].join("\n")+"\n");
console.log(`Concluído: ${claims.size} registros ORCID com DOI; ${artigos.length} artigos validados; ${warnings.length} avisos.`);
