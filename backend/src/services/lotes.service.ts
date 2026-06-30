import prisma from '../lib/prisma'
import { BaseService } from './base.service'

export class LotesService extends BaseService {
  constructor() { super('lotes') }

  async listarDisponiveis(projetoId?: string, quadraId?: string) {
    const where: any = { status: 'disponivel' }
    if (projetoId) where.projetoId = projetoId
    if (quadraId) where.quadraId = quadraId
    return prisma.lote.findMany({ where, orderBy: [{ quadraId: 'asc' }, { numero: 'asc' }] })
  }

  async criar(data: Record<string, unknown>) {
    return super.criar({ ...data, status: 'disponivel', vendaId: null })
  }

  async criarEmLote(lotes: Array<{
    quadraId: string; projetoId: string; proprietarioId: string
    numero: string; area: number; valorBase: number
    dimensao?: string; localizacao?: string
  }>) {
    const criados = await prisma.$transaction(
      lotes.map((lote) =>
        prisma.lote.create({
          data: {
            ...lote,
            status: 'disponivel',
            observacoes: null,
            vendaId: null,
          },
        })
      )
    )
    return criados
  }

  async alterarStatus(id: string, status: string, motivo?: string) {
    const lote = await prisma.lote.findUnique({ where: { id } })
    if (!lote) throw Object.assign(new Error('Lote não encontrado'), { statusCode: 404 })

    if (lote.status === 'vendido' && status !== 'disponivel') {
      throw Object.assign(new Error('Lote vendido só pode ser liberado via cancelamento/distrato'), { statusCode: 409 })
    }

    await prisma.lote.update({
      where: { id },
      data: { status: status as any, motivoBloqueio: motivo || null },
    })

    return { id, status }
  }
}
