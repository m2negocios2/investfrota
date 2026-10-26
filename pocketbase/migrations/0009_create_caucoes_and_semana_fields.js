migrate(
  (app) => {
    // 1. Create 'caucoes' collection
    let caucoesCol
    try {
      caucoesCol = app.findCollectionByNameOrId('caucoes')
    } catch (_) {
      const motosCol = app.findCollectionByNameOrId('motos')
      caucoesCol = new Collection({
        name: 'caucoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'moto',
            type: 'relation',
            required: true,
            collectionId: motosCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'valor', type: 'number', required: false, min: 0 },
          { name: 'data', type: 'date', required: true },
          {
            name: 'posse',
            type: 'select',
            required: true,
            values: ['proprietario', 'adm'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: false,
            values: ['retida', 'devolvida'],
            maxSelect: 1,
          },
          { name: 'data_devolucao', type: 'date', required: false },
          { name: 'observacao', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_caucoes_moto ON caucoes (moto)',
          'CREATE INDEX idx_caucoes_posse ON caucoes (posse)',
        ],
      })
      app.save(caucoesCol)
    }

    // 2. Add dia_pagamento_semana to contratos collection if not exists
    const contratosCol = app.findCollectionByNameOrId('contratos')
    if (!contratosCol.fields.getByName('dia_pagamento_semana')) {
      contratosCol.fields.add(
        new SelectField({
          name: 'dia_pagamento_semana',
          required: false,
          values: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
          maxSelect: 1,
        }),
      )
      app.save(contratosCol)
    }

    // Also populate default dia_pagamento_semana for existing active contracts if empty
    try {
      const activeContracts = app.findRecordsByFilter('contratos', 'status = "ativo"', '', 100, 0)
      for (const c of activeContracts) {
        if (!c.getString('dia_pagamento_semana')) {
          const dInicio = c.getString('data_inicio')
          if (dInicio) {
            const dt = new Date(dInicio)
            const daysMap = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
            const dayCode = daysMap[dt.getUTCDay()] || 'SEG'
            c.set('dia_pagamento_semana', dayCode)
            app.save(c)
          } else {
            c.set('dia_pagamento_semana', 'SEG')
            app.save(c)
          }
        }
      }
    } catch (_) {}

    // 3. Add semana_ano to recebimentos collection (e.g. "2026-W43" or "W43") if not exists
    const recebimentosCol = app.findCollectionByNameOrId('recebimentos')
    if (!recebimentosCol.fields.getByName('semana_ano')) {
      recebimentosCol.fields.add(
        new TextField({
          name: 'semana_ano',
          type: 'text',
          required: false,
        }),
      )
      app.save(recebimentosCol)
    }

    // 4. Seed sample Caução records if empty
    try {
      const count = app.countRecords('caucoes')
      if (count === 0) {
        const allMotos = app.findRecordsByFilter('motos', '', '', 5, 0)
        if (allMotos.length > 0) {
          const c1 = new Record(caucoesCol)
          c1.set('moto', allMotos[0].id)
          c1.set('valor', 600)
          c1.set('data', '2026-09-26 00:00:00.000Z')
          c1.set('posse', 'proprietario')
          c1.set('status', 'retida')
          c1.set('observacao', 'Caução inicial recebida via PIX na retirada.')
          app.save(c1)

          if (allMotos.length > 1) {
            const c2 = new Record(caucoesCol)
            c2.set('moto', allMotos[1].id)
            c2.set('valor', 500)
            c2.set('data', '2026-09-26 00:00:00.000Z')
            c2.set('posse', 'adm')
            c2.set('status', 'retida')
            c2.set('observacao', 'Comprovante físico arquivado pelo ADM.')
            app.save(c2)
          }
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const caucoesCol = app.findCollectionByNameOrId('caucoes')
      app.delete(caucoesCol)
    } catch (_) {}
  },
)
