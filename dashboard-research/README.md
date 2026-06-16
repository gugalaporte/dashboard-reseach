# TypeScript Teams Bot with Tab

Este app embute o dashboard em **https://dashboard-reseach.vercel.app/**

## Aba fixa no Teams (recomendado)

Use o pacote pronto em `../teams-app/`:

1. Faça upload de `teams-app/dashboard-research-teams.zip` no Teams.
2. No canal desejado (ex.: Pesquisa > Geral), adicione a guia **Dashboard Research**.

Veja `../teams-app/README.md` para o passo a passo completo.

## Desenvolvimento local (opcional)

- `src/index.ts`: servidor da aba.
- `src/Tab/App.tsx`: iframe do dashboard.

```bash
npm install
npm run dev
```

A aba local fica em `http://localhost:3978/tabs/test`.
