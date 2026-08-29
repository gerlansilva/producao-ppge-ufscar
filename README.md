# Produção científica do PPGE/UFSCar

Portal estático para apresentar métricas e artigos de periódicos dos docentes do PPGE/UFSCar. A arquitetura prevê integração de ORCID e OpenAlex, validação do gênero documental e deduplicação por identificadores persistentes.

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

## Atualizações

Qualquer alteração enviada ao ramo principal do GitHub dispara uma nova implantação. Os dados validados deverão ser gravados em `public/data/`.

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Critério do corpus

Entram somente artigos de periódicos com fonte editorial identificada e autoria vinculada por identificadores persistentes. Livros, capítulos, e-books, anais e repositórios são excluídos, mesmo quando classificados como `article` na origem.
