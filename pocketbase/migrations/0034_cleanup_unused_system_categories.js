migrate(
  (app) => {
    let catCol
    try {
      catCol = app.findCollectionByNameOrId('categorias_gastos')
    } catch (_) {
      // Se não houver a coleção categorias_gastos, nada a fazer
      return
    }

    // Categorias geradas automaticamente por migrações/código do sistema anteriores
    // que devem ser removidas caso NÃO estejam em uso por nenhum lançamento do caixa
    // nem da tabela pagamentos.
    // Categorias como 'SEGURANÇA' ou as cadastradas pela usuária que estiverem em uso JAMAIS serão excluídas.
    const categoriasParaVerificar = [
      'BATERIA',
      'SOCIAL',
      'IMPOSTOS',
      'IPVA',
      'BOMBEIROS',
      'LICENCIAMENTO',
    ]

    for (const nomeCat of categoriasParaVerificar) {
      try {
        // 1. Verificar se existe registro em categorias_gastos com este nome
        const catRecs = app.findRecordsByFilter(
          'categorias_gastos',
          `nome = "${nomeCat}" || nome = "${nomeCat.toLowerCase()}"`,
          '',
          1,
          0,
        )

        if (!catRecs || catRecs.length === 0) {
          continue
        }

        const catRec = catRecs[0]

        // 2. Verificar se há lançamentos no caixa_lancamentos usando esta categoria (case insensitive)
        const caixaMatches = app.findRecordsByFilter(
          'caixa_lancamentos',
          `categoria ~ "${nomeCat}"`,
          '',
          1,
          0,
        )

        const emUsoNoCaixa = caixaMatches && caixaMatches.length > 0

        // 3. Verificar também se há pagamentos usando este nome de categoria
        let emUsoEmPagamentos = false
        try {
          const pagCol = app.findCollectionByNameOrId('pagamentos')
          if (pagCol) {
            const pagMatches = app.findRecordsByFilter(
              'pagamentos',
              `categoria_nome ~ "${nomeCat}" || categoria ~ "${nomeCat}"`,
              '',
              1,
              0,
            )
            emUsoEmPagamentos = pagMatches && pagMatches.length > 0
          }
        } catch (_) {}

        // 4. Se NÃO estiver em uso em nenhum lançamento, excluir da lista de categorias
        if (!emUsoNoCaixa && !emUsoEmPagamentos) {
          app.delete(catRec)
        }
      } catch (_) {}
    }
  },
  (app) => {
    // Reversão no-op intencional para manter o princípio de que o sistema não injeta categorias
  },
)
