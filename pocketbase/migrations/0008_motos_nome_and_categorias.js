migrate(
  (app) => {
    // 1. Add "nome" field to motos collection if it doesn't exist
    const motosCol = app.findCollectionByNameOrId('motos')
    if (!motosCol.fields.getByName('nome')) {
      motosCol.fields.add(
        new TextField({
          name: 'nome',
          type: 'text',
          required: false,
        }),
      )
      app.save(motosCol)
    }

    // Backfill names for existing seeded motos if empty
    try {
      const allMotos = app.findRecordsByFilter('motos', '', '', 100, 0)
      for (const m of allMotos) {
        if (!m.getString('nome')) {
          const modelo = m.getString('modelo')
          const placa = m.getString('placa')
          if (placa === 'BRA2E19') m.set('nome', 'CG 160 Vermelha')
          else if (placa === 'SPX4B88') m.set('nome', 'Factor 150 Preta')
          else if (placa === 'RTO9K21') m.set('nome', 'Bros Azul')
          else if (placa === 'MTO7J50') m.set('nome', 'Pop Branca')
          else m.set('nome', modelo.split(' ')[0] || 'Moto')
          app.save(m)
        }
      }
    } catch (_) {}

    // 2. Create "categorias_gastos" collection
    let catCol
    try {
      catCol = app.findCollectionByNameOrId('categorias_gastos')
    } catch (_) {
      catCol = new Collection({
        name: 'categorias_gastos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'descricao', type: 'text', required: false },
          { name: 'cor', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_categorias_nome ON categorias_gastos (nome)'],
      })
      app.save(catCol)
    }

    // 3. Seed default expense categories if collection is empty
    const defaultCats = [
      {
        nome: 'Manutenção',
        descricao: 'Peças, oficina mecânica, trocas de óleo, pastilhas e pneus',
      },
      { nome: 'Combustível', descricao: 'Gasolina e abastecimentos operacionais' },
      { nome: 'Documentação', descricao: 'IPVA, licenciamento, emplacamento e taxas DETRAN' },
      { nome: 'Seguro', descricao: 'Seguro contra terceiros, furto e roubo' },
      { nome: 'Rastreador GPS', descricao: 'Mensalidade de monitoramento e telemetria' },
      { nome: 'Peças & Acessórios', descricao: 'Capacetes, baús, suportes de celular e travas' },
      { nome: 'Outros', descricao: 'Despesas diversas e imprevistos' },
    ]

    for (const cat of defaultCats) {
      try {
        app.findFirstRecordByData('categorias_gastos', 'nome', cat.nome)
      } catch (_) {
        const rec = new Record(catCol)
        rec.set('nome', cat.nome)
        rec.set('descricao', cat.descricao)
        app.save(rec)
      }
    }

    // 4. Update pagamentos collection: allow any text category (or relax select constraint)
    // To support dynamic categories chosen by the user, we ensure pagamentos has category as text or compatible
    const pagamentosCol = app.findCollectionByNameOrId('pagamentos')
    // Check if categoria_nome field exists, if not add it so dynamic categories can be stored cleanly
    if (!pagamentosCol.fields.getByName('categoria_nome')) {
      pagamentosCol.fields.add(
        new TextField({
          name: 'categoria_nome',
          type: 'text',
          required: false,
        }),
      )
      app.save(pagamentosCol)
    }
  },
  (app) => {
    try {
      const catCol = app.findCollectionByNameOrId('categorias_gastos')
      app.delete(catCol)
    } catch (_) {}
  },
)
