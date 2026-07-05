# Como publicar na Vercel — Araras Pro Mundo

Este site é **100% estático** (só HTML, imagens, vídeo e JavaScript no navegador).
Não precisa de servidor, banco de dados nem build. O deploy é **zero-config**.

Escolha **uma** das três opções abaixo.

---

## Opção A — Arrastar e soltar (mais rápido, sem conta técnica)

1. Descompacte o arquivo `.zip`. Você vai ter uma pasta chamada `araras-pro-mundo`.
2. Acesse **https://vercel.com/new** e faça login (pode entrar com Google/GitHub).
3. Procure a área **"Deploy"** e a opção de subir arquivos direto
   (**"Upload"** / arrastar pasta).
4. **Arraste a pasta `araras-pro-mundo` inteira** para lá.
5. Clique em **Deploy** e aguarde alguns segundos.
6. A Vercel te dá um link no formato `https://araras-pro-mundo.vercel.app`. Pronto.

> Dica: se pedir para escolher um "Framework Preset", selecione **"Other"**
> (nenhum). Não há nada para compilar.

---

## Opção B — Importar do Git (recomendado para atualizar depois)

1. Crie um repositório no GitHub e suba o conteúdo da pasta `araras-pro-mundo`
   (o `index.html` precisa ficar na **raiz** do repositório).
2. Em **https://vercel.com/new**, clique em **Import Git Repository** e escolha o repo.
3. Framework Preset: **Other**. Build Command: **deixe vazio**.
   Output Directory: **deixe vazio** (a raiz já é o site).
4. Clique em **Deploy**.
5. A partir daí, todo `git push` publica a nova versão automaticamente.

---

## Opção C — Linha de comando (CLI)

Se você usa terminal:

```bash
npm i -g vercel        # instala a CLI (uma vez)
cd araras-pro-mundo    # entre na pasta do site
vercel                 # primeiro deploy (responda as perguntas com Enter)
vercel --prod          # publica em produção
```

---

## Depois de publicar

- O **vídeo do topo toca sozinho**: a Vercel serve por HTTPS com suporte a streaming
  (HTTP Range), então o autoplay funciona liso — melhor até do que abrir o
  arquivo direto pelo computador.
- As **fontes do Google** carregam normalmente (o navegador do visitante tem
  internet).
- O arquivo `vercel.json` já vem incluído: ele deixa as URLs limpas e coloca cache
  longo nas imagens/vídeo (`/assets`), deixando o site mais rápido em visitas
  seguintes. Você não precisa mexer nele.

## Domínio próprio (opcional)

No painel do projeto na Vercel: **Settings → Domains → Add**, e siga as
instruções para apontar seu domínio (ex.: `ararasarax.com.br`).

---

Qualquer atualização de conteúdo é só trocar os arquivos e publicar de novo
(arrastar a pasta de novo, ou `git push`, ou `vercel --prod`).
