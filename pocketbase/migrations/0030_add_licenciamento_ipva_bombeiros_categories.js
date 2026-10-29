migrate(
  (app) => {
    let catCol
    try {
      catCol = app.findCollectionByNameOrId('categorias_gastos')
    } catch (_) {
      // Se não existir a coleção (banco vazio ou ambiente novo sem 0008), encerra sem erro
      return
    }

    const novasCategorias = [
      {
        nome: 'LICENCIAMENTO',
        descricao: 'Taxa anual de licenciamento veicular (DETRAN)',
      },
      {
        nome: 'IPVA',
        descricao: 'Imposto sobre a Propriedade de Veículos Automotores',
      },
      {
        nome: 'BOMBEIROS',
        descricao: 'Taxa de Prevenção e Extinção de Incêndio / Corpo de Bombeiros',
      },
    ]

    for (const cat of novasCategorias) {
      try {
        // Busca se já existe pelo nome exato ou maiúsculo
        const existing = app.findRecordsByFilter(
          'categorias_gastos',
          `nome ~ "${cat.nome}"`,
          '',
          1,
          0,
        )
        if (existing && existing.length > 0) {
          continue
        }
      } catch (_) {}

      try {
        const rec = new Record(catCol)
        rec.set('nome', cat.nome)
        rec.set('descricao', cat.descricao)
        app.save(rec)
      } catch (_) {}
    }
  },
  (app) => {
    // Reversão opcional (não estritamente necessária)
    try {
      const nomes = ['LICENCIAMENTO', 'IPVA', 'BOMBEIROS']
      for (const n of nomes) {
        try {
          const recs = app.findRecordsByFilter('categorias_gastos', `nome = "${n}"`, '', 1, 0)
          if (recs && recs[0]) {
            app.delete(recs[0])
          }
        } catch (_) {}
      }
    } catch (_) {}
  },
)
