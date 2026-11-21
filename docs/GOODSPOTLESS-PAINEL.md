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
- Áudio, notificações push fora do navegador e integração Google Sheets ainda
  não estão nesta etapa; podem ser adicionados sobre essa base com testes separados.
