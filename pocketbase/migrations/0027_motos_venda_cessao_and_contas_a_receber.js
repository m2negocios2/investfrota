migrate(
  (app) => {
    // 1. Atualizar campo status em motos para incluir 'vendida' e 'cedida',
    // e adicionar campos de metadados da operação final para auditoria e reversão
    const motosCol = app.findCollectionByNameOrId('motos')
    const statusField = motosCol.fields.getByName('status')
    if (statusField) {
      statusField.values = [
        'disponivel',
        'locada',
        'manutencao',
        'em_loja_detran',
        'vendida',
        'cedida',
      ]
      statusField.maxSelect = 1
    }

    if (!motosCol.fields.getByName('data_saida')) {
      motosCol.fields.add(new DateField({ name: 'data_saida', required: false }))
    }
    if (!motosCol.fields.getByName('tipo_operacao_saida')) {
      motosCol.fields.add(
        new SelectField({
          name: 'tipo_operacao_saida',
          required: false,
          values: ['venda', 'cessao'],
          maxSelect: 1,
        }),
      )
    }
    if (!motosCol.fields.getByName('valor_venda')) {
      motosCol.fields.add(new NumberField({ name: 'valor_venda', required: false }))
    }
    if (!motosCol.fields.getByName('destinatario_saida')) {
      motosCol.fields.add(new TextField({ name: 'destinatario_saida', required: false }))
    }
    if (!motosCol.fields.getByName('forma_recebimento_venda')) {
      motosCol.fields.add(
        new SelectField({
          name: 'forma_recebimento_venda',
          required: false,
          values: ['pago_agora', 'aguardando_recebimento'],
          maxSelect: 1,
        }),
      )
    }
    if (!motosCol.fields.getByName('caixa_lancamento_saida')) {
      motosCol.fields.add(new TextField({ name: 'caixa_lancamento_saida', required: false }))
    }
    if (!motosCol.fields.getByName('conta_a_receber_saida')) {
      motosCol.fields.add(new TextField({ name: 'conta_a_receber_saida', required: false }))
    }
    app.save(motosCol)

    // 2. Criar coleção contas_a_receber
    const caixaCol = app.findCollectionByNameOrId('caixa_lancamentos')
    const contasAReceberCol = new Collection({
      name: 'contas_a_receber',
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
          required: false,
          collectionId: motosCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text', required: true },
        { name: 'devedor', type: 'text', required: true },
        { name: 'valor', type: 'number', required: true },
        { name: 'data_vencimento', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['em_aberto', 'recebida', 'cancelada'],
          maxSelect: 1,
        },
        { name: 'data_recebimento', type: 'date', required: false },
        {
          name: 'caixa_lancamento',
          type: 'relation',
          required: false,
          collectionId: caixaCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'origem', type: 'text', required: false },
        { name: 'observacao', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contas_rec_moto ON contas_a_receber (moto)',
        'CREATE INDEX idx_contas_rec_status ON contas_a_receber (status)',
        'CREATE INDEX idx_contas_rec_venc ON contas_a_receber (data_vencimento)',
      ],
    })
    app.save(contasAReceberCol)
  },
  (app) => {
    try {
      const contasAReceberCol = app.findCollectionByNameOrId('contas_a_receber')
      app.delete(contasAReceberCol)
    } catch (_) {}

    try {
      const motosCol = app.findCollectionByNameOrId('motos')
      const statusField = motosCol.fields.getByName('status')
      if (statusField) {
        statusField.values = ['disponivel', 'locada', 'manutencao', 'em_loja_detran']
      }
      app.save(motosCol)
    } catch (_) {}
  },
)
