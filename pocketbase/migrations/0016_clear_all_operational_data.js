migrate(
  (app) => {
    // Limpeza completa solicitada pela usuária após testes do importador
    // Coleções zeradas respeitando integridade referencial:
    // 1. Filhos que referenciam motos, contratos ou pagamentos
    // 2. Contratos (referenciam motos)
    // 3. Motos
    // PRESERVADOS:
    // - _pb_users_auth_ (contas de usuário: proprietária e administrador)
    // - categorias_gastos (categorias de despesas)

    const collectionsToClear = [
      'recebimentos',
      'pagamentos',
      'caixa_lancamentos',
      'caucoes',
      'infracoes',
      'pendencias',
      'contratos',
      'motos',
    ]

    for (const name of collectionsToClear) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.truncateCollection(col)
      } catch (e) {
        console.log(`Erro ao limpar colecao ${name}:`, e)
      }
    }
  },
  (app) => {
    // Sem rollback para limpeza pontual de dados de teste
  },
)
