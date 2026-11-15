# GOODSPOTLESS — Checklist de lançamento (sem dependência da hospedagem Lovable)

Projeto autorizado: ONLY `imprimartdrop-dev/london-clean-route-new-2026`. Não editar projetos, credenciais, banco ou bot da CWX Property Solutions. O Lovable continua como interface de prévia sincronizada com a branch `main`. Publicação comercial ficará em hospedagem independente.

## Ordem de execução

1. **Supabase primeiro.** Criar projeto próprio `GOODSPOTLESS-CLEANING-UK` na região `eu-west-2` (Londres), na organização confirmada pelo proprietário. Conferir eventual preço antes de confirmar. Nunca aplicar migração no banco CWX. O projeto de limpeza ainda não existe.
2. **Banco e controle de acesso.** Revisar `docs/supabase-schema.sql` e `supabase/migrations/20261113_telegram_bot.sql`, nesta ordem, antes de executar no banco NOVO. O helper `private.has_role` já está no esquema de preparo; conferir RLS, autenticação e políticas em um teste real antes de publicar. Rodar verificações de segurança e testes SQL. O banco ficará como fonte operacional de dados.
3. **Telegram exclusivo.** Criar bot via @BotFather, guardar token diretamente em Supabase Edge Function Secrets (nunca no GitHub nem no frontend). Capturar admin user ID e chat ID, criar segredo para webhook e registrar o webhook após publicar a função. Revisar instruções em `docs/TELEGRAM-LCR-SETUP.md`.
4. **API de pedidos.** Publicar `submit-cleaning-enquiry` e `telegram-webhook` no projeto Supabase NOVO. Só habilitar entrada pública depois de validar Cloudflare Turnstile, restrições de origem, deduplicação, limites contra spam, armazenamento privado de fotos, permissões, retenção e aviso de privacidade. O frontend `src/lib/backend/enquiry-service.ts` CONTINUA em modo preview até teste ponta a ponta.
5. **Hospedagem externa.** Criar Cloudflare Workers na conta do proprietário; conectar GitHub `imprimartdrop-dev/london-clean-route-new-2026`, branch `main`. O site é TanStack Start/SSR e usa `@lovable.dev/vite-tanstack-config`; testar uma implantação `workers.dev` antes de alterar configuração de build e sem quebrar a prévia do Lovable. Se necessário, converter configuração seguindo documentação oficial `https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/` e validar que a prévia do Lovable continue funcional. Não criar deploy sobre o projeto CWX.
6. **Integração site ↔ backend.** Configurar somente URLs/chaves publicáveis no frontend. Tokens de Telegram, senhas, service role e secrets permanecem no servidor (Supabase). Dois formulários de orçamento do site precisam usar a MESMA API, com referência única e sem duplicatas.
7. **Google Sheets.** Criar uma planilha exclusiva da GOODSPOTLESS e outra, separada, para CWX após autorização específica. Exportar pedidos e atualizações com idempotência; auditar erros/repetições. Não apagar pedidos do Supabase até confirmar cada cópia e um backup independente. Google Sheets não substitui backup completo de banco, arquivos e autenticação.
8. **Domínio.** Depois de testar a página e os formulários em `workers.dev`, adicionar o domínio REAL registrado na HostGator à Cloudflare; conferir previamente registros DNS e de e-mail; atualizar nameservers só no momento de apontar. Configurar site + www e HTTPS. Não assumir o nome de domínio sem confirmação do proprietário.
9. **Testes de lançamento.** Usar dados fictícios: site → Supabase → alerta Telegram → aprovar / pedir detalhes / recusar → mensagem WhatsApp para enviar MANUALMENTE → registro atualizado → planilha. Testar falha de Telegram, proteção anti-spam, login admin e permissões RLS. Somente depois ativar formulários reais e anúncios.

## Estado verificado em 2026-11-15

- Código no GitHub, branch `main`, já sincronizada com Lovable.
- Lovable projeto `97c7ba2e-a152-4ebb-8ec5-b150f4e1bdf0`; ainda não publicado.
- Banco exclusivo de GOODSPOTLESS ainda NÃO criado. Apenas projetos prévios na organização Supabase existente; não tocá-los.
- Funções e migrações do Telegram são rascunhos, não implantados.
- Formulários ainda são simulações: não gravam pedidos nem notificam Telegram.
- Nenhuma hospedagem Cloudflare, domínio nem planilha foram conectados automaticamente.

## Regra de segurança e custos

Nunca inserir tokens, senhas, chaves do Supabase service role ou arquivos de clientes neste repositório. Despesas e publicação de produção precisam ser aprovadas pelo titular. Não declarar sistema ativo antes de efetuar testes com respostas verificadas.
