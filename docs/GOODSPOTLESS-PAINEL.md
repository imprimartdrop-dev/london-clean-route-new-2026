# GOODSPOTLESS — Painel operacional no GitHub

Escopo exclusivo: `imprimartdrop-dev/london-clean-route-new-2026` e Supabase
`hrypzfgvjlniuhnglmzm`. **Não modificar CWX.** O Lovable é somente o espelho.

## O que o painel oferece

- `/admin`: login por e-mail/senha do Supabase Auth e verificação obrigatória de
  `user_roles.role = admin`. Sem papel de administrador não existe acesso aos dados.
- Resumo: pedidos pendentes, serviços abertos, entradas, despesas e resultado.
- Pedidos do formulário: visualizar, alterar status/orçamento e abrir WhatsApp
  para contato humano. O site público não foi alterado.
- Clientes, casas, funcionárias, agenda, rotas manuais e financeiro: cadastrar,
  editar e excluir quando permitido pelas relações do banco.
- Finanças: entradas e despesas em colunas/totais separados; aportes de sócios e
  distribuição **não** contam como receita ou despesa operacional.
- Sócios: Gabriel Assunção e Wallafy cadastrados sem porcentagens iniciais.
  O painel só faz a simulação de divisão quando todas as participações somam 100%.
- CSV: exportar listas para Excel/Google Sheets, somente após autenticação.
- Atualização de dados enquanto o painel está aberto: consulta a cada 20 segundos.

## Implantação e permissões

1. Revisar `docs/GOODSPOTLESS-OPERATIONS-SCHEMA.sql` e aplicar no projeto
   Supabase **GOODSPOTLESS** (`hrypzfgvjlniuhnglmzm`) apenas uma vez. Nenhuma tabela
   do fluxo público é alterada por esse script.
2. Em `Authentication > Users` do **mesmo** projeto, convidar/criar a conta
   administrativa. Não reutilizar senhas publicadas em chats ou projetos antigos.
3. Depois que a conta existir em `auth.users`, atribuir a função `admin` de forma
   confiável, por exemplo no SQL Editor (troque o e-mail pelo correto):

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin'::public.app_role
   from auth.users where lower(email) = lower('EMAIL_DA_CONTA_AQUI')
   on conflict (user_id, role) do nothing;
   ```

4. Publicar o código a partir do GitHub. O painel fica em `/admin`, sem links no
   cabeçalho público. A chave usada no browser é **publishable**, nunca `service_role`.
5. Entrar, cadastrar um cliente de teste, casa, funcionária, serviço, lançamento
   financeiro e verificar RLS usando outro usuário sem papel `admin`.

## Limites e segurança

- Nenhuma senha/código de casa deve ir nos campos de observações nem no CSV.
  O cofre separado com permissões por tarefa é uma etapa futura.
- As listas exibem no máximo 500 registros por tabela (paginação futura).
- Rotas são ordenadas manualmente e enviadas ao Google Maps; não há otimização
  automática. Não são compartilhadas publicamente.
- Valores de serviços são previsões; **não geram receita automaticamente**. É
  preciso confirmar o efetivo recebimento em Financeiro para evitar duplicidade.
- O financeiro é gerencial, não substitui contabilidade ou folhas de pagamento.
- Entrada por áudio e integração Google Sheets ainda não estão nesta etapa.

## Ícone na tela inicial e notificações com a tela bloqueada

- O ícone usa a marca oficial `goodspotless-logo-small.webp`, convertida para PNG
  de 180, 192 e 512 px. A rota `/admin` fornece o manifesto
  `goodspotless-admin.webmanifest`, com início direto no painel; o site também
  fornece `apple-touch-icon` e favicon GOODSPOTLESS.
- No iPhone (iOS 16.4 ou superior), abra **/admin no Safari**, toque em
  **Compartilhar → Adicionar à Tela de Início** e abra o painel por esse ícone.
  Se existia um atalho anterior com o símbolo genérico, remova-o e adicione
  novamente depois da publicação do GitHub.
- Faça login com uma conta cujo `user_roles.role` seja `admin` e abra
  **Visão geral → Ativar notificações push**. Toque em **Permitir** na solicitação
  do iPhone e depois em **Testar aviso real**. Esse teste é enviado pelo servidor,
  e não apenas uma reprodução local.
- Em **Ajustes → Notificações → GOODSPOTLESS**, permita notificações, sons e
  exibição na tela bloqueada. Modo silencioso, Foco e intensidade da vibração
  são controlados pelo iOS; o site não pode forçar volume alto ou dois pulsos.
- Novas solicitações do formulário ativam push apenas para inscrições de
  administradores salvas em `admin_push_subscriptions`. Nenhum dado privado do
  cliente é exposto na notificação; toque nela para abrir `/admin` autenticado.
- O código de envio é `supabase/functions/goodspotless-push/index.ts`. A chave
  pública VAPID está no GitHub e a **chave privada fica criptografada no
  Supabase Vault**, acessível somente ao papel de backend `service_role`.
  O banco e a função já foram instalados no Supabase GOODSPOTLESS; o ícone e
  os botões só aparecem no site após publicar o código via GitHub.
- O aviso de novo cliente é **best effort**: falhas no serviço de push não
  desfazem o pedido salvo nem impedem o cliente de concluir o formulário.
