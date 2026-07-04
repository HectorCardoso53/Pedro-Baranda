import api from '@/lib/api'
import type {
  Proprietario, Regiao, Projeto, Area, Quadra, Lote, Cliente,
  Venda, Parcela, Pagamento,
  DashboardStats, ApiResponse
} from '@/types'

function extract<T>(res: { data: ApiResponse<T> }): T {
  return res.data.data as T
}

// Auth
export const authService = {
  login: (idToken: string) => api.post('/auth/login', { idToken }),
  me: () => api.get('/auth/me'),
  criarUsuario: (data: object) => api.post('/auth/criar-usuario', data),
}

// Dashboard
export const dashboardService = {
  geral: () => api.get<ApiResponse<DashboardStats>>('/dashboard').then(extract),
  vendasMes: () => api.get('/dashboard/vendas-mes').then((r) => r.data.data),
  receitaMes: () => api.get('/dashboard/receita-mes').then((r) => r.data.data),
  lotesStatus: () => api.get('/dashboard/lotes-status').then((r) => r.data.data),
}

// Proprietários
export const proprietariosService = {
  listar: () => api.get<ApiResponse<Proprietario[]>>('/proprietarios').then(extract),
  buscar: (id: string) => api.get<ApiResponse<Proprietario>>(`/proprietarios/${id}`).then(extract),
  criar: (data: Partial<Proprietario>) => api.post<ApiResponse<Proprietario>>('/proprietarios', data).then(extract),
  atualizar: (id: string, data: Partial<Proprietario>) => api.put<ApiResponse<Proprietario>>(`/proprietarios/${id}`, data).then(extract),
  toggleAtivo: (id: string) => api.patch(`/proprietarios/${id}/toggle-ativo`),
  deletar: (id: string) => api.delete(`/proprietarios/${id}`),
}

// Regiões
export const regioesService = {
  listar: () => api.get<ApiResponse<Regiao[]>>('/regioes').then(extract),
  criar: (data: Partial<Regiao>) => api.post<ApiResponse<Regiao>>('/regioes', data).then(extract),
  atualizar: (id: string, data: Partial<Regiao>) => api.put(`/regioes/${id}`, data).then((r) => r.data.data),
  deletar: (id: string) => api.delete(`/regioes/${id}`),
}

// Projetos
export const projetosService = {
  listar: (params?: object) => api.get<ApiResponse<Projeto[]>>('/projetos', { params }).then(extract),
  buscar: (id: string) => api.get<ApiResponse<Projeto>>(`/projetos/${id}`).then(extract),
  resumo: (id: string) => api.get(`/projetos/${id}/resumo`).then((r) => r.data.data),
  criar: (data: Partial<Projeto>) => api.post<ApiResponse<Projeto>>('/projetos', data).then(extract),
  atualizar: (id: string, data: Partial<Projeto>) => api.put(`/projetos/${id}`, data).then((r) => r.data.data),
  deletar: (id: string) => api.delete(`/projetos/${id}`),
}

// Áreas
export const areasService = {
  listar: (params?: object) => api.get<ApiResponse<Area[]>>('/areas', { params }).then(extract),
  criar: (data: Partial<Area>) => api.post<ApiResponse<Area>>('/areas', data).then(extract),
  atualizar: (id: string, data: Partial<Area>) => api.put(`/areas/${id}`, data).then((r) => r.data.data),
  deletar: (id: string) => api.delete(`/areas/${id}`),
}

// Quadras
export const quadrasService = {
  listar: (params?: object) => api.get<ApiResponse<Quadra[]>>('/quadras', { params }).then(extract),
  criar: (data: Partial<Quadra>) => api.post<ApiResponse<Quadra>>('/quadras', data).then(extract),
  atualizar: (id: string, data: Partial<Quadra>) => api.put(`/quadras/${id}`, data).then((r) => r.data.data),
  deletar: (id: string) => api.delete(`/quadras/${id}`),
}

// Lotes
export const lotesService = {
  listar: (params?: object) => api.get<ApiResponse<Lote[]>>('/lotes', { params }).then(extract),
  listarDisponiveis: (projetoId?: string, quadraId?: string) => api.get<ApiResponse<Lote[]>>('/lotes/disponiveis', { params: { projetoId, quadraId } }).then(extract),
  buscar: (id: string) => api.get<ApiResponse<Lote>>(`/lotes/${id}`).then(extract),
  criar: (data: Partial<Lote>) => api.post<ApiResponse<Lote>>('/lotes', data).then(extract),
  criarEmLote: (lotes: object[]) => api.post('/lotes/bulk', { lotes }).then((r) => r.data.data),
  atualizar: (id: string, data: Partial<Lote>) => api.put(`/lotes/${id}`, data).then((r) => r.data.data),
  alterarStatus: (id: string, status: string, motivo?: string) => api.patch(`/lotes/${id}/status`, { status, motivo }),
  deletar: (id: string) => api.delete(`/lotes/${id}`),
}

// Clientes
export const clientesService = {
  listar: (params?: object) => api.get<ApiResponse<Cliente[]>>('/clientes', { params }).then(extract),
  buscar: (id: string) => api.get<ApiResponse<Cliente>>(`/clientes/${id}`).then(extract),
  criar: (data: Partial<Cliente>) => api.post<ApiResponse<Cliente>>('/clientes', data).then(extract),
  atualizar: (id: string, data: Partial<Cliente>) => api.put(`/clientes/${id}`, data).then((r) => r.data.data),
  vendas: (id: string) => api.get(`/clientes/${id}/vendas`).then((r) => r.data.data),
  deletar: (id: string) => api.delete(`/clientes/${id}`),
}

// Vendas
export const vendasService = {
  listar: (params?: object) => api.get<ApiResponse<Venda[]>>('/vendas', { params }).then(extract),
  buscar: (id: string) => api.get<ApiResponse<Venda>>(`/vendas/${id}`).then(extract),
  parcelas: (id: string) => api.get<ApiResponse<Parcela[]>>(`/vendas/${id}/parcelas`).then(extract),
  criar: (data: object) => api.post<ApiResponse<Venda>>('/vendas', data).then(extract),
  atualizar: (id: string, data: object) => api.put(`/vendas/${id}`, data).then((r) => r.data.data),
  cancelar: (id: string, motivo: string) => api.patch(`/vendas/${id}/cancelar`, { motivo }),
  distratar: (id: string, motivo: string) => api.patch(`/vendas/${id}/distratar`, { motivo }),
  gerarReciboVenda: (id: string) => api.post(`/vendas/${id}/gerar-recibo-venda`, {}, { timeout: 120000 }).then((r) => r.data.data),
  gerarContrato: (id: string) => api.post(`/vendas/${id}/gerar-contrato`, {}, { timeout: 120000 }).then((r) => r.data.data),
  gerarPromissorias: (id: string) => api.post(`/vendas/${id}/gerar-promissorias`, {}, { timeout: 120000 }).then((r) => r.data.data),
  gerarCarne: (id: string) => api.post(`/vendas/${id}/gerar-carne`, {}, { timeout: 120000 }).then((r) => r.data.data),
  gerarPromissoriaDigital: (vendaId: string, parcelaId: string) => api.post(`/vendas/${vendaId}/parcelas/${parcelaId}/promissoria-digital`, {}, { timeout: 120000 }).then((r) => r.data.data),
  deletar: (id: string) => api.delete(`/vendas/${id}`),
}

// Parcelas
export const parcelasService = {
  listar: (params?: object) => api.get<ApiResponse<Parcela[]>>('/parcelas', { params }).then(extract),
  vencidas: () => api.get<ApiResponse<Parcela[]>>('/parcelas/vencidas').then(extract),
  gerarPromissoria: (id: string) => api.post(`/parcelas/${id}/gerar-promissoria`).then((r) => r.data.data),
}

// Pagamentos
export const pagamentosService = {
  listar: (params?: object) => api.get<ApiResponse<Pagamento[]>>('/pagamentos', { params }).then(extract),
  registrar: (data: object) => api.post<ApiResponse<Pagamento>>('/pagamentos', data).then(extract),
  atualizarData: (id: string, dataPagamento: string) => api.patch(`/pagamentos/${id}/data`, { dataPagamento }).then((r) => r.data.data),
  estornar: (id: string) => api.delete(`/pagamentos/${id}`),
  gerarRecibo: (id: string) => api.post(`/pagamentos/${id}/recibo`).then((r) => r.data.data),
}

// Financeiro
export const financeiroService = {
  movimentacoes: (params?: object) => api.get('/financeiro/movimentacoes', { params }).then((r) => r.data.data),
  resumo: () => api.get('/financeiro/resumo').then((r) => r.data.data),
  repasses: (params?: object) => api.get('/financeiro/repasses', { params }).then((r) => r.data.data),
  porCliente: () => api.get('/financeiro/por-cliente').then((r) => r.data.data),
  criarRepasse: (data: object) => api.post('/financeiro/repasses', data).then((r) => r.data.data),
  pagarRepasse: (id: string, data: object) => api.patch(`/financeiro/repasses/${id}/pagar`, data),
  deletarMovimentacao: (id: string) => api.delete(`/financeiro/movimentacoes/${id}`),
  deletarRepasse: (id: string) => api.delete(`/financeiro/repasses/${id}`),
}

// Inadimplência
export const inadimplenciaService = {
  listar: (params?: object) => api.get('/inadimplencia', { params }).then((r) => r.data.data),
  resumo: () => api.get('/inadimplencia/resumo').then((r) => r.data.data),
  processar: () => api.post('/inadimplencia/processar').then((r) => r.data.data),
}

// Relatórios
export const relatoriosService = {
  vendas: (params?: object) => api.get('/relatorios/vendas', { params }).then((r) => r.data.data),
  financeiro: (params?: object) => api.get('/relatorios/financeiro', { params }).then((r) => r.data.data),
  inadimplencia: () => api.get('/relatorios/inadimplencia').then((r) => r.data.data),
  lotes: () => api.get('/relatorios/lotes').then((r) => r.data.data),
  repasses: () => api.get('/relatorios/repasses').then((r) => r.data.data),
}

// Painel Proprietário
export const painelProprietarioService = {
  resumo: () => api.get('/painel-proprietario/resumo').then((r) => r.data.data),
  lotes: () => api.get('/painel-proprietario/lotes').then((r) => r.data.data),
  financeiro: () => api.get('/painel-proprietario/financeiro').then((r) => r.data.data),
  repasses: () => api.get('/painel-proprietario/repasses').then((r) => r.data.data),
  inadimplencia: () => api.get('/painel-proprietario/inadimplencia').then((r) => r.data.data),
}

// Promissórias
export const promissoriasService = {
  listar: (params?: object) => api.get('/promissorias', { params }).then((r) => r.data.data),
  deletar: (id: string) => api.delete(`/promissorias/${id}`),
}

// Demarcação IA
export const demarcacaoService = {
  analisarMapa: (imagemBase64: string) =>
    api.post<ApiResponse<{ quadras: { nome: string }[]; lotes: { numero: string; quadra: string; area: number | null }[]; outros: { tipo: string; nome: string }[] }>>('/demarcacao/analisar-mapa', { imagemBase64 }, { timeout: 120000 }).then(extract),
}

// Contratos
export const contratosService = {
  listar: (params?: object) => api.get('/contratos', { params }).then((r) => r.data.data),
  gerar: (vendaId: string) => api.post(`/contratos/gerar/${vendaId}`).then((r) => r.data.data),
  uploadAssinado: (id: string, file: File) => {
    const form = new FormData()
    form.append('arquivo', file)
    return api.post(`/contratos/${id}/upload-assinado`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data)
  },
  deletar: (id: string) => api.delete(`/contratos/${id}`),
}
