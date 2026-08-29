# Dados do portal

Esta pasta receberá os arquivos estáticos produzidos pela rotina ORCID–OpenAlex.

- `docentes.json`: docentes e identificadores persistentes validados.
- `artigos.json`: corpus deduplicado de artigos de periódicos.
- `metricas.json`: totais e séries usados pelo painel.

Os números não devem ser preenchidos manualmente sem registro da data e dos critérios da coleta.

## Atualização

Execute `npm run collect:data` ou use a ação **Atualizar publicações** no GitHub.
A rotina consulta a OpenAlex a partir do ORCID de cada docente, mantém apenas
registros do tipo `article` cuja fonte seja identificada como `journal`, e
deduplica por DOI ou, quando ausente, pelo OpenAlex Work ID.
