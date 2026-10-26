migrate(
  (app) => {
    // Ordem de remoção respeitando integridade referencial:
    // 1. Filhos que referenciam motos, contratos ou pagamentos
    //    - recebimentos
    //    - pagamentos
    //    - caixa_lancamentos
    //    - caucoes
    //    - infracoes
    //    - pendencias
    // 2. Contratos (referenciam motos)
    // 3. Motos
    // PRESERVADOS:
    // - _pb_users_auth_ (usuária proprietária e admin)
    // - categorias_gastos (categorias padrão de despesas)

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
    // Migration de limpeza não tem rollback direto pois dados removidos eram testes/seed
  },
)
