# Teams — aba fixa do Dashboard

Pacote do app Microsoft Teams que exibe o dashboard hospedado em:

**https://dashboard-reseach.vercel.app/**

## Instalar no canal (ex.: Pesquisa > Geral)

1. Compacte estes 3 arquivos em um `.zip` (na raiz do zip, sem subpasta):
   - `manifest.json`
   - `color.png`
   - `outline.png`

2. No Teams: **Apps** → **Gerenciar seus apps** → **Fazer upload de um app personalizado** → **Fazer upload para mim** (ou para a organização, se tiver permissão).

3. Abra o time **Pesquisa** → canal **Geral** → **+** (Adicionar uma guia).

4. Busque **Dashboard Research** e adicione a aba.

5. Opcional: clique com o botão direito na aba → **Fixar** para deixá-la sempre visível.

## Observação

O dashboard precisa permitir embed no Teams. O `next.config.mjs` do projeto principal já envia o header `Content-Security-Policy: frame-ancestors ...` para isso. **Faça deploy na Vercel** após essa alteração.
