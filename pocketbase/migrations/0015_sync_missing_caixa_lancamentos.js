migrate(
  (app) => {
    // 1. Localizar recebimentos pagos que não possuem correspondente no caixa_lancamentos
    try {
      const recs = app.findRecordsByFilter('recebimentos', "status = 'pago'", '-created', 500, 0)
      const caixaCol = app.findCollectionByNameOrId('caixa_lancamentos')

      for (const rec of recs) {
        const motoId = rec.getString('moto')
        const valor = rec.getFloat('valor')
        const locatarioNome = rec.getString('locatario_nome') || 'Locatário'
        const formaPgto = rec.getString('forma_pagamento') || 'pix'
        let dataPgto = rec.getString('data_pagamento')
        if (!dataPgto) {
          dataPgto = rec.getString('created') || new Date().toISOString()
        }

        // Verifica se já existe lançamento de entrada deste valor para a mesma moto
        const filter = `moto = "${motoId}" && tipo = "entrada" && valor >= ${valor - 0.01} && valor <= ${valor + 0.01}`
        const existing = app.findRecordsByFilter('caixa_lancamentos', filter, '', 1, 0)

        if (existing.length === 0) {
          console.log(
            `Restaurando lançamento de caixa para recebimento ${rec.id} (locatario: ${locatarioNome}, valor: ${valor})`,
          )
          const entry = new Record(caixaCol)
          entry.set('moto', motoId)
          entry.set('tipo', 'entrada')
          entry.set('descricao', `Recebimento de aluguel - ${locatarioNome}`)
          entry.set('categoria', 'aluguel')
          entry.set('valor', valor)
          entry.set('data', dataPgto)
          entry.set('forma_pagamento', formaPgto)
          app.save(entry)
        }
      }
    } catch (err) {
      console.log('Erro ao sincronizar recebimentos com caixa na migracao 0015:', err)
    }
  },
  (app) => {
    // Reversão não necessária pois os lançamentos restaurados pertencem a recebimentos reais pagos
  },
)
