# Produção científica do PPGE/UFSCar

Portal estático para apresentar métricas e artigos de periódicos dos docentes do PPGE/UFSCar. A base reúne 74 ORCID institucionais e uma coleta ORCID–OpenAlex validada por identificadores persistentes.

Desenvolvido por **Gerlan Silva da Silva**, doutorando em Educação pela UFSCar.  
ORCID: https://orcid.org/0000-0002-9996-9983

## Publicar no Cloudflare Pages

1. Crie um repositório no GitHub e envie todos os arquivos desta pasta.
2. No Cloudflare, abra **Workers & Pages** e escolha **Create application**.
3. Selecione **Pages** e conecte o repositório do GitHub.
4. Configure:

   - Framework preset: `Next.js (Static HTML Export)`
   - Build command: `npm run build`
   - Build output directory: `out`
   - Node.js: `22`

5. Salve. O Cloudflare fornecerá um endereço terminado em `.pages.dev`.

## Primeira atualização no GitHub

1. Envie todos os arquivos deste pacote para o ramo principal do repositório.
2. Abra a aba **Actions** do GitHub.
3. Escolha **Atualizar publicações**.
4. Clique em **Run workflow**.
5. A rotina consulta os 74 ORCID, valida os DOI na OpenAlex, atualiza os arquivos de `public/data/` e cria um commit automaticamente.

Ela também é executada toda segunda-feira. Cada commit de dados dispara uma nova implantação no Cloudflare.

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Critério do corpus

Na rota principal, entram trabalhos registrados no ORCID como `journal-article`, com DOI e confirmação na OpenAlex como `article` de uma fonte do tipo `journal`. Quando a lista pública do ORCID está vazia, admite-se um OpenAlex Author ID revisado manualmente; os mesmos filtros de DOI, tipo e fonte continuam obrigatórios. Livros, capítulos, e-books, anais e repositórios são excluídos.
