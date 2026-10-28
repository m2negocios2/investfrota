migrate(
  (app) => {
    // 1. Coleção contas_a_pagar
    const contasCol = new Collection({
      name: 'contas_a_pagar',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'descricao', type: 'text', required: true },
        { name: 'credor', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['parcelamento', 'consorcio', 'financiamento', 'outro'],
          maxSelect: 1,
        },
        { name: 'valor_total', type: 'number', required: true },
        { name: 'quantidade_parcelas', type: 'number', required: true },
        { name: 'valor_parcela', type: 'number', required: true },
        { name: 'data_inicio', type: 'date', required: true },
        { name: 'dia_vencimento', type: 'number', required: false, min: 1, max: 31 },
        { name: 'observacao', type: 'text', required: false },
        { name: 'concluida', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contas_credor ON contas_a_pagar (credor)',
        'CREATE INDEX idx_contas_tipo ON contas_a_pagar (tipo)',
        'CREATE INDEX idx_contas_concluida ON contas_a_pagar (concluida)',
      ],
    })
    app.save(contasCol)

    // 2. Coleção contas_a_pagar_pagamentos
    const caixaCol = app.findCollectionByNameOrId('caixa_lancamentos')
    const pagamentosCol = new Collection({
      name: 'contas_a_pagar_pagamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'conta',
          type: 'relation',
          required: true,
          collectionId: contasCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'data', type: 'date', required: true },
        { name: 'valor', type: 'number', required: true },
        {
          name: 'numero_parcela',
          type: 'number',
          required: false,
        },
        {
          name: 'caixa_lancamento',
          type: 'relation',
          required: false,
          collectionId: caixaCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'observacao', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contas_pag_conta ON contas_a_pagar_pagamentos (conta)',
        'CREATE INDEX idx_contas_pag_data ON contas_a_pagar_pagamentos (data)',
        'CREATE INDEX idx_contas_pag_caixa ON contas_a_pagar_pagamentos (caixa_lancamento)',
      ],
    })
    app.save(pagamentosCol)
  },
  (app) => {
    try {
      const pagamentosCol = app.findCollectionByNameOrId('contas_a_pagar_pagamentos')
      app.delete(pagamentosCol)
    } catch (_) {}
    try {
      const contasCol = app.findCollectionByNameOrId('contas_a_pagar')
      app.delete(contasCol)
    } catch (_) {}
  },
)
