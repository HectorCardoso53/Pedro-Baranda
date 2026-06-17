import { Router } from 'express'
import authRoutes from './auth.routes'
import usuariosRoutes from './usuarios.routes'
import proprietariosRoutes from './proprietarios.routes'
import regioesRoutes from './regioes.routes'
import projetosRoutes from './projetos.routes'
import areasRoutes from './areas.routes'
import quadrasRoutes from './quadras.routes'
import lotesRoutes from './lotes.routes'
import clientesRoutes from './clientes.routes'
import vendasRoutes from './vendas.routes'
import parcelasRoutes from './parcelas.routes'
import pagamentosRoutes from './pagamentos.routes'
import promissoriasRoutes from './promissorias.routes'
import contratosRoutes from './contratos.routes'
import financeiroRoutes from './financeiro.routes'
import inadimplenciaRoutes from './inadimplencia.routes'
import dashboardRoutes from './dashboard.routes'
import relatoriosRoutes from './relatorios.routes'
import painelProprietarioRoutes from './painelProprietario.routes'
import demarcacaoRoutes from './demarcacao.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/usuarios', usuariosRoutes)
router.use('/proprietarios', proprietariosRoutes)
router.use('/regioes', regioesRoutes)
router.use('/projetos', projetosRoutes)
router.use('/areas', areasRoutes)
router.use('/quadras', quadrasRoutes)
router.use('/lotes', lotesRoutes)
router.use('/clientes', clientesRoutes)
router.use('/vendas', vendasRoutes)
router.use('/parcelas', parcelasRoutes)
router.use('/pagamentos', pagamentosRoutes)
router.use('/promissorias', promissoriasRoutes)
router.use('/contratos', contratosRoutes)
router.use('/financeiro', financeiroRoutes)
router.use('/inadimplencia', inadimplenciaRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/relatorios', relatoriosRoutes)
router.use('/painel-proprietario', painelProprietarioRoutes)
router.use('/demarcacao', demarcacaoRoutes)

export default router
