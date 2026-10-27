migrate(
  (app) => {
    // Sincronizar comissões e receitas faltantes para recebimentos com status 'pago'
    try {
      const caixaCol = app.findCollectionByNameOrId('caixa_lancamentos')
      const recs = app.findRecordsByFilter('recebimentos', "status = 'pago'", '-created', 500, 0)

      for (const rec of recs) {
        const recId = rec.id
        const motoId = rec.getString('moto')
        const contratoId = rec.getString('contrato')
        const valorRec = rec.getFloat('valor')
        const locatario = rec.getString('locatario_nome') || 'Locatário'
        const formaPgto = rec.getString('forma_pagamento') || 'pix'
        let dataPgto = rec.getString('data_pagamento')
        if (!dataPgto) {
          dataPgto = rec.getString('created') || new Date().toISOString()
        }

        // 1. Garantir que a receita exista com o campo 'recebimento' preenchido
        let existingEntradas = app.findRecordsByFilter(
          'caixa_lancamentos',
          `recebimento = "${recId}" && tipo = "entrada"`,
          '',
          1,
          0,
        )

        if (existingEntradas.length === 0) {
          // Se não encontrou por recebimento id, verificar se há lançamento correspondente sem recebimento vinculado
          const cleanDate = (dataPgto || '').split('T')[0].split(' ')[0]
          const approxFilter = [
            `moto = "${motoId}"`,
            `tipo = "entrada"`,
            `categoria = "Aluguel" || categoria = "aluguel"`,
            cleanDate ? `data ~ "${cleanDate}"` : '',
            `valor >= ${valorRec - 0.05} && valor <= ${valorRec + 0.05}`,
            `recebimento = ""`,
          ]
            .filter(Boolean)
            .join(' && ')

          const existingApprox = app.findRecordsByFilter(
            'caixa_lancamentos',
            approxFilter,
            '',
            1,
            0,
          )

          if (existingApprox.length > 0) {
            // Vincula o recebimento existente
            const entry = existingApprox[0]
            entry.set('recebimento', recId)
            app.save(entry)
          } else {
            // Cria a entrada de receita vinculada ao recebimento
            const newEntry = new Record(caixaCol)
            newEntry.set('moto', motoId)
            newEntry.set('tipo', 'entrada')
            newEntry.set('descricao', `Recebimento de aluguel - ${locatario}`)
            newEntry.set('categoria', 'Aluguel')
            newEntry.set('valor', valorRec)
            newEntry.set('data', dataPgto)
            newEntry.set('forma_pagamento', formaPgto)
            newEntry.set('recebimento', recId)
            app.save(newEntry)
          }
        }

        // 2. Se o contrato tiver comissão configurada (> 0), garantir que a despesa de comissão exista
        if (contratoId) {
          try {
            const contrato = app.findRecordById('contratos', contratoId)
            const pct =
              contrato.getFloat('comissao_percentual') ||
              contrato.getFloat('percentual_comissao') ||
              0

            if (pct > 0 && valorRec > 0) {
              const valorComissao = Number(((valorRec * pct) / 100).toFixed(2))

              // Checar se já existe despesa de comissão para este recebimento
              const existingComissao = app.findRecordsByFilter(
                'caixa_lancamentos',
                `recebimento = "${recId}" && tipo = "saida" && categoria = "Comissão"`,
                '',
                1,
                0,
              )

              if (existingComissao.length === 0) {
                // Descobrir nome/identificação da moto
                let motoIdentificacao = 'Moto'
                try {
                  const motoRec = app.findRecordById('motos', motoId)
                  motoIdentificacao =
                    motoRec.getString('nome') ||
                    motoRec.getString('modelo') ||
                    motoRec.getString('placa') ||
                    'Moto'
                } catch (_) {}

                const descricaoComissao = `Comissão — ${locatario} (${motoIdentificacao})`

                const comissaoEntry = new Record(caixaCol)
                comissaoEntry.set('moto', motoId)
                comissaoEntry.set('tipo', 'saida')
                comissaoEntry.set('descricao', descricaoComissao)
                comissaoEntry.set('categoria', 'Comissão')
                comissaoEntry.set('valor', valorComissao)
                comissaoEntry.set('data', dataPgto)
                comissaoEntry.set('forma_pagamento', formaPgto)
                comissaoEntry.set('comissao_de', contratoId)
                comissaoEntry.set('recebimento', recId)
                comissaoEntry.set(
                  'observacoes',
                  `Comissão automática de ${pct}% sobre receita de R$ ${valorRec.toFixed(2)}`,
                )
                app.save(comissaoEntry)
              }
            }
          } catch (errContrato) {
            console.log('Aviso ao sincronizar comissão do contrato:', errContrato)
          }
        }
      }
    } catch (err) {
      console.log('Erro ao executar sincronização na migracao 0019:', err)
    }
  },
  (app) => {
    // Reversão no-op
  },
)
