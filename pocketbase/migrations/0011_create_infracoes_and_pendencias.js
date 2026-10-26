migrate(
  (app) => {
    // 1. Campos km_atual, km_atualizado_em e km_ultimo_oleo na coleção motos
    const motosCol = app.findCollectionByNameOrId('motos')
    if (!motosCol.fields.getByName('km_atual')) {
      motosCol.fields.add(
        new NumberField({
          name: 'km_atual',
          min: 0,
        }),
      )
    }
    if (!motosCol.fields.getByName('km_atualizado_em')) {
      motosCol.fields.add(
        new DateField({
          name: 'km_atualizado_em',
        }),
      )
    }
    if (!motosCol.fields.getByName('km_ultimo_oleo')) {
      motosCol.fields.add(
        new NumberField({
          name: 'km_ultimo_oleo',
          min: 0,
        }),
      )
    }
    app.save(motosCol)

    // 2. Garantir categoria padrão "Multas" na coleção categorias_gastos
    try {
      const catCol = app.findCollectionByNameOrId('categorias_gastos')
      try {
        app.findFirstRecordByData('categorias_gastos', 'nome', 'Multas')
      } catch (_) {
        const multasCat = new Record(catCol)
        multasCat.set('nome', 'Multas')
        multasCat.set('descricao', 'Multas de trânsito e infrações vinculadas às motos')
        multasCat.set('cor', '#ef4444')
        app.save(multasCat)
      }
    } catch (_) {}

    // 3. Criar coleção 'infracoes'
    try {
      app.findCollectionByNameOrId('infracoes')
    } catch (_) {
      const infracoesCol = new Collection({
        name: 'infracoes',
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
          { name: 'numero', type: 'number', required: false, min: 1, onlyInt: true },
          { name: 'data', type: 'date', required: false },
          { name: 'codigo_multa', type: 'text', required: false },
          { name: 'valor', type: 'number', required: false, min: 0 },
          { name: 'cliente', type: 'text', required: false },
          {
            name: 'status_pagamento',
            type: 'select',
            required: true,
            values: ['pendente', 'paga'],
            maxSelect: 1,
          },
          { name: 'data_pagamento', type: 'date', required: false },
          { name: 'deu_entrada_detran', type: 'bool', required: false },
          { name: 'data_entrada_detran', type: 'date', required: false },
          { name: 'prazo', type: 'date', required: false },
          { name: 'observacao', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_infracoes_moto ON infracoes (moto)',
          'CREATE INDEX idx_infracoes_status ON infracoes (status_pagamento)',
        ],
      })
      app.save(infracoesCol)
    }

    // 4. Criar coleção 'pendencias'
    try {
      app.findCollectionByNameOrId('pendencias')
    } catch (_) {
      const pendenciasCol = new Collection({
        name: 'pendencias',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'titulo', type: 'text', required: true },
          { name: 'data', type: 'date', required: false },
          { name: 'feito', type: 'bool', required: false },
          { name: 'observacao', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_pendencias_feito ON pendencias (feito)'],
      })
      app.save(pendenciasCol)
    }
  },
  (app) => {
    try {
      const infracoesCol = app.findCollectionByNameOrId('infracoes')
      app.delete(infracoesCol)
    } catch (_) {}

    try {
      const pendenciasCol = app.findCollectionByNameOrId('pendencias')
      app.delete(pendenciasCol)
    } catch (_) {}
  },
)
