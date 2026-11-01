migrate(
  (app) => {
    // Remover o registro DUPLICADO de recebimento gerado por duplo clique:
    // Moto G71 (k030hx948t3p2yh), data_vencimento '2026-10-24 12:00:00.000Z', valor 450, criado em 27/10 17:24:12 (id 'n3typustnwk1x6e').
    // O mais antigo (17:24:11, id '8a09ly44meymswz') é mantido intacto.
    // A migração é estritamente idempotente e segura para banco vazio ou já deduplicado.

    try {
      const dup = app.findRecordById('recebimentos', 'n3typustnwk1x6e')
      if (dup) {
        // Verificações extras de segurança antes de excluir
        const motoId = dup.getString('moto')
        const valor = dup.getFloat('valor')
        const vencimento = dup.getString('data_vencimento')
        if (motoId === 'k030hx948t3p2yh' && valor === 450 && vencimento.startsWith('2026-10-24')) {
          app.delete(dup)
        }
      }
    } catch (_) {
      // Registro já não existe ou banco vazio — no-op
    }
  },
  (app) => {
    // Revert / down: no-op (registro era uma duplicação indesejada gerada por duplo clique)
  },
)
