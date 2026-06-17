import { db } from '../firebase/admin'
import { v4 as uuid } from 'uuid'
import { BaseService } from './base.service'

export class LotesService extends BaseService {
  constructor() { super('lotes') }

  async listarDisponiveis(projetoId?: string) {
    let query: FirebaseFirestore.Query = this.ref().where('status', '==', 'disponivel')
    if (projetoId) query = query.where('projetoId', '==', projetoId)
    const snap = await query.orderBy('criadoEm', 'desc').get()
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  async criar(data: Record<string, unknown>) {
    const agora = new Date().toISOString()
    return super.criar({
      ...data,
      status: 'disponivel',
      vendaId: null,
      criadoEm: agora,
      atualizadoEm: agora,
    })
  }

  async criarEmLote(lotes: Array<{
    quadraId: string; projetoId: string; proprietarioId: string
    numero: string; area: number; valorBase: number
  }>) {
    const agora = new Date().toISOString()
    const batch = db.batch()
    const criados = []

    for (const lote of lotes) {
      const id = uuid()
      const data = {
        ...lote,
        status: 'disponivel',
        observacoes: null,
        vendaId: null,
        criadoEm: agora,
        atualizadoEm: agora,
      }
      batch.set(this.ref().doc(id), data)
      criados.push({ id, ...data })
    }

    await batch.commit()
    return criados
  }

  async alterarStatus(id: string, status: string, motivo?: string) {
    const doc = await this.ref().doc(id).get()
    if (!doc.exists) throw Object.assign(new Error('Lote não encontrado'), { statusCode: 404 })

    const lote = doc.data()!
    if (lote.status === 'vendido' && status !== 'disponivel') {
      throw Object.assign(new Error('Lote vendido só pode ser liberado via cancelamento/distrato'), { statusCode: 409 })
    }

    await this.ref().doc(id).update({
      status,
      motivoBloqueio: motivo || null,
      atualizadoEm: new Date().toISOString(),
    })

    return { id, status }
  }
}
