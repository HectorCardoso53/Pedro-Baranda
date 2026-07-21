export type UserRole = 'admin' | 'financeiro' | 'atendimento' | 'gerencia' | 'proprietario'
export type LoteStatus = 'disponivel' | 'reservado' | 'vendido' | 'bloqueado'
export type VendaStatus = 'ativa' | 'quitada' | 'distratada' | 'cancelada'
export type ParcelaStatus = 'pendente' | 'paga' | 'vencida' | 'cancelada'
export type PromissoriaStatus = 'ativa' | 'quitada' | 'vencida' | 'cancelada'

export interface Endereco {
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
}

export interface Usuario {
  id: string
  nome: string
  email: string
  role: UserRole
  ativo: boolean
  proprietarioId?: string
  criadoEm: string
}

export interface Proprietario {
  id: string
  nome: string
  cpfCnpj: string
  email: string
  telefone: string
  endereco: Endereco
  pixChave: string
  pixTipo: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'
  ativo: boolean
  criadoEm: string
}

export interface Regiao {
  id: string
  nome: string
  estado: string
  cidade: string
  descricao?: string
  criadoEm: string
}

export interface Projeto {
  id: string
  regiaoId: string
  proprietarioId: string
  nome: string
  descricao?: string
  status: 'ativo' | 'suspenso' | 'concluido'
  criadoEm: string
}

export interface Area {
  id: string
  projetoId: string
  nome: string
  descricao?: string
  ativo: boolean
  criadoEm: string
}

export interface Quadra {
  id: string
  areaId: string
  projetoId: string
  nome: string
  descricao?: string
  localizacao?: string
  areaM2?: number
  valorEstimado?: number
  valorEntrada?: number
  quantidadeLotesPrev?: number
  ativo: boolean
  criadoEm: string
}

export interface Lote {
  id: string
  quadraId: string
  areaId: string
  projetoId: string
  proprietarioId: string
  numero: string
  area: number
  dimensao?: string
  localizacao?: string
  valorBase: number
  status: LoteStatus
  observacoes?: string
  criadoEm: string
}

export interface Cliente {
  id: string
  nome: string
  cpfCnpj: string
  rg?: string
  email: string
  telefone: string
  celular: string
  estadoCivil: string
  profissao: string
  endereco: Endereco
  ativo: boolean
  criadoEm: string
}

export interface Venda {
  id: string
  loteId: string
  clienteId: string
  proprietarioId: string
  projetoId: string
  vendedorId: string
  valor: number
  entrada: number
  saldo: number
  numeroParcelas: number
  valorParcela: number
  diaVencimento: number
  dataVenda: string
  primeiroVencimento: string
  status: VendaStatus
  contratoUrl?: string
  observacoes?: string
  criadoEm: string
}

export interface Parcela {
  id: string
  vendaId: string
  numero: number
  valor: number
  valorPago?: number
  vencimento: string
  pagamento?: string
  status: ParcelaStatus
  juros: number
  multa: number
  desconto: number
  promissoriaUrl?: string
  criadoEm: string
}

export interface Pagamento {
  id: string
  parcelaId: string
  vendaId: string
  valor: number
  valorPrincipal: number
  juros: number
  multa: number
  diasAtraso: number
  dataPagamento: string
  formaPagamento: string
  comprovante?: string
  observacoes?: string
  registradoPor: string
  criadoEm: string
}

export interface Promissoria {
  id: string
  parcelaId: string
  vendaId: string
  clienteId: string
  numero: number
  valor: number
  vencimento: string
  status: PromissoriaStatus
  pdfUrl?: string
  pixQrCode?: string
  pixCopiaECola?: string
  criadoEm: string
}

export interface MovimentacaoFinanceira {
  id: string
  tipo: 'entrada' | 'saida' | 'repasse'
  categoria: string
  descricao: string
  valor: number
  data: string
  proprietarioId?: string
  vendaId?: string
  parcelaId?: string
  criadoEm: string
}

export interface Repasse {
  id: string
  proprietarioId: string
  projetoId: string
  periodo: string
  totalRecebido: number
  totalRepasse: number
  percentualRepasse: number
  status: 'pendente' | 'pago'
  pagamento?: string
  criadoEm: string
}

export interface DashboardStats {
  totalLotes: number
  lotesDisponiveis: number
  lotesVendidos: number
  lotesReservados: number
  lotesBloqueados: number
  totalVendas: number
  vendasAtivas: number
  vendasQuitadas: number
  vendasMes: number
  receitaMes: number
  inadimplentes: number
  repassesPendentes: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
