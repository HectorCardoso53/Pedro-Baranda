import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import prisma from '../lib/prisma'
import { successResponse } from '../utils/response'

export class FinanceiroController {
  async listarMovimentacoes(req: AuthRequest, res: Response) {
    const where: Record<string, any> = {}
    const { tipo, proprietarioId, projetoId } = req.query
    if (tipo) where.tipo = tipo
    if (proprietarioId) where.proprietarioId = proprietarioId
    if (projetoId) where.projetoId = projetoId
    const movs = await prisma.movimentacaoFinanceira.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      take: 200,
      include: {
        venda: {
          include: { cliente: { select: { nome: true } } },
        },
      },
    })
    return successResponse(res, movs)
  }

  async resumo(_req: AuthRequest, res: Response) {
    const movs = await prisma.movimentacaoFinanceira.findMany()
    const entradas = movs.filter((m) => m.tipo === 'entrada').reduce((a, m) => a + (m.valor || 0), 0)
    const saidas = movs.filter((m) => m.tipo === 'saida').reduce((a, m) => a + (m.valor || 0), 0)
    const repasses = movs.filter((m) => m.tipo === 'repasse').reduce((a, m) => a + (m.valor || 0), 0)
    return successResponse(res, { entradas, saidas, repasses, saldo: entradas - saidas - repasses })
  }

  async listarRepasses(req: AuthRequest, res: Response) {
    const where: Record<string, any> = {}
    if (req.query.proprietarioId) where.proprietarioId = req.query.proprietarioId
    if (req.query.status) where.status = req.query.status
    const repasses = await prisma.repasse.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      include: {
        proprietario: { select: { nome: true } },
        projeto: { select: { nome: true } },
      },
    })
    return successResponse(res, repasses)
  }

  async buscarRepasse(req: AuthRequest, res: Response) {
    const repasse = await prisma.repasse.findUnique({ where: { id: req.params.id } })
    if (!repasse) throw Object.assign(new Error('Repasse não encontrado'), { statusCode: 404 })
    return successResponse(res, repasse)
  }

  async criarRepasse(req: AuthRequest, res: Response) {
    const repasse = await prisma.repasse.create({
      data: { ...req.body, status: 'pendente' },
    })
    return successResponse(res, repasse, 'Repasse criado com sucesso', 201)
  }

  async pagarRepasse(req: AuthRequest, res: Response) {
    const repasse = await prisma.repasse.update({
      where: { id: req.params.id },
      data: {
        status: 'pago',
        pagamento: req.body.dataPagamento || new Date().toISOString(),
        comprovante: req.body.comprovante || null,
        datPagamento: new Date(),
      },
    })

    await prisma.movimentacaoFinanceira.create({
      data: {
        tipo: 'repasse',
        categoria: 'repasse_proprietario',
        descricao: `Repasse proprietário - ${repasse.periodo}`,
        valor: repasse.totalRepasse,
        data: req.body.dataPagamento || new Date().toISOString().split('T')[0],
        proprietarioId: repasse.proprietarioId,
        repasseId: req.params.id,
        registradoPor: req.user!.uid,
      },
    })

    return successResponse(res, null, 'Repasse registrado como pago')
  }

  async criarMovimentacao(req: AuthRequest, res: Response) {
    const mov = await prisma.movimentacaoFinanceira.create({
      data: { ...req.body, registradoPor: req.user!.uid },
    })
    return successResponse(res, mov, 'Movimentação registrada', 201)
  }

  async deletarMovimentacao(req: AuthRequest, res: Response) {
    const mov = await prisma.movimentacaoFinanceira.findUnique({ where: { id: req.params.id } })
    if (!mov) throw Object.assign(new Error('Movimentação não encontrada'), { statusCode: 404 })
    await prisma.movimentacaoFinanceira.delete({ where: { id: req.params.id } })
    return successResponse(res, null, 'Movimentação excluída com sucesso')
  }

  async deletarRepasse(req: AuthRequest, res: Response) {
    const repasse = await prisma.repasse.findUnique({ where: { id: req.params.id } })
    if (!repasse) throw Object.assign(new Error('Repasse não encontrado'), { statusCode: 404 })
    await prisma.repasse.delete({ where: { id: req.params.id } })
    return successResponse(res, null, 'Repasse excluído com sucesso')
  }

  async porCliente(_req: AuthRequest, res: Response) {
    const hoje = new Date().toISOString().split('T')[0]

    const clientes = await prisma.cliente.findMany({
      where: { vendas: { some: { status: { in: ['ativa', 'quitada'] } } } },
      select: {
        id: true,
        nome: true,
        cpfCnpj: true,
        celular: true,
        telefone: true,
        vendas: {
          where: { status: { in: ['ativa', 'quitada'] } },
          select: {
            id: true,
            valor: true,
            status: true,
            lote: { select: { numero: true } },
            projeto: { select: { nome: true } },
            parcelas: {
              select: { valor: true, status: true, vencimento: true },
            },
            pagamentos: {
              select: { valor: true },
            },
          },
        },
      },
      orderBy: { nome: 'asc' },
    })

    const resultado = clientes.map((c) => {
      const todasParcelas = c.vendas.flatMap((v) => v.parcelas)
      const todosPagamentos = c.vendas.flatMap((v) => v.pagamentos)

      const totalPago = todosPagamentos.reduce((a, p) => a + p.valor, 0)
      const valorTotalVendas = c.vendas.reduce((a, v) => a + v.valor, 0)

      const parcelasAtivas = todasParcelas.filter((p) => p.status !== 'cancelada' && p.status !== 'paga')
      const parcelasVencidas = parcelasAtivas.filter(
        (p) => p.status === 'vencida' || (p.status === 'pendente' && !!p.vencimento && p.vencimento < hoje)
      )
      const totalEmAberto = parcelasAtivas.reduce((a, p) => a + p.valor, 0)
      const totalVencido = parcelasVencidas.reduce((a, p) => a + p.valor, 0)

      return {
        id: c.id,
        nome: c.nome,
        cpfCnpj: c.cpfCnpj,
        celular: c.celular,
        telefone: c.telefone,
        totalVendas: c.vendas.length,
        valorTotalVendas,
        totalPago,
        totalEmAberto,
        totalVencido,
        parcelasVencidas: parcelasVencidas.length,
        parcelasPendentes: parcelasAtivas.length - parcelasVencidas.length,
        inadimplente: parcelasVencidas.length > 0,
        vendas: c.vendas.map((v) => ({
          id: v.id,
          lote: v.lote?.numero,
          projeto: v.projeto?.nome,
          valor: v.valor,
          status: v.status,
        })),
      }
    })

    return successResponse(res, resultado)
  }
}
