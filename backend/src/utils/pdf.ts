import puppeteer from 'puppeteer-core'
import Handlebars from 'handlebars'
import { PDFDocument } from 'pdf-lib'
import logger from './logger'
import path from 'path'
import fs from 'fs'

const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'documentos')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

// ── Helpers de formatação ────────────────────────────────────────────────────

function _grupo(n: number): string {
  const uns = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
  const dez = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
  const cen = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
    'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
  if (n === 0) return ''
  if (n === 100) return 'cem'
  if (n < 20) return uns[n]
  if (n < 100) return dez[Math.floor(n / 10)] + (n % 10 ? ' e ' + uns[n % 10] : '')
  return cen[Math.floor(n / 100)] + (n % 100 ? ' e ' + _grupo(n % 100) : '')
}

function numeroPorExtenso(n: number): string {
  if (n === 0) return 'zero'
  if (n < 1000) return _grupo(n)
  const mil = Math.floor(n / 1000)
  const resto = n % 1000
  const milStr = mil === 1 ? 'mil' : _grupo(mil) + ' mil'
  if (resto === 0) return milStr
  return milStr + (resto < 100 ? ' e ' : ', ') + _grupo(resto)
}

export function extensoReais(valor: number): string {
  const inteiro = Math.floor(Math.abs(valor))
  const centavos = Math.round((Math.abs(valor) - inteiro) * 100)
  let result = numeroPorExtenso(inteiro) + (inteiro === 1 ? ' real' : ' reais')
  if (centavos > 0) result += ' e ' + numeroPorExtenso(centavos) + (centavos === 1 ? ' centavo' : ' centavos')
  return result
}

export function formatarMoedaBR(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function formatarDataBR(dateStr: string): string {
  if (!dateStr) return ''
  const d = dateStr.split('T')[0].split('-')
  return `${d[2]}/${d[1]}/${d[0]}`
}

// Registra helpers no Handlebars (idempotente)
Handlebars.registerHelper('extenso', (v: number) => extensoReais(v))
Handlebars.registerHelper('formatMoeda', (v: number) => formatarMoedaBR(v))
Handlebars.registerHelper('formatData', (v: string) => formatarDataBR(v))

// ── Renderização e geração ───────────────────────────────────────────────────

function getLogoBase64(): string {
  try {
    const logoPath = path.join(__dirname, '..', '..', 'assets', 'pedro_baranda.png')
    if (fs.existsSync(logoPath)) {
      const buf = fs.readFileSync(logoPath)
      return `data:image/png;base64,${buf.toString('base64')}`
    }
  } catch {}
  return ''
}

async function renderTemplate(templateName: string, data: Record<string, unknown>): Promise<string> {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`)
  const templateSource = fs.readFileSync(templatePath, 'utf-8')
  const template = Handlebars.compile(templateSource)
  return template({ logoBase64: getLogoBase64(), ...data })
}

export async function gerarPDF(
  templateName: string,
  data: Record<string, unknown>,
  nomeArquivo: string,
  options?: { margin?: { top: string; right: string; bottom: string; left: string } }
): Promise<string> {
  let browser = null
  try {
    const html = await renderTemplate(templateName, data)

    browser = await puppeteer.launch({
      executablePath: CHROMIUM_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--mute-audio',
      ],
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: options?.margin ?? { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    })

    const filePath = path.join(UPLOADS_DIR, nomeArquivo)
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer))

    const url = `/uploads/documentos/${nomeArquivo}`
    logger.info(`PDF gerado: ${nomeArquivo}`)
    return url
  } catch (error) {
    logger.error('Erro ao gerar PDF:', error)
    throw error
  } finally {
    if (browser) await browser.close()
  }
}

export async function mergePDFs(inputPaths: string[], outputPath: string): Promise<void> {
  const merged = await PDFDocument.create()
  for (const p of inputPaths) {
    const bytes = fs.readFileSync(p)
    const doc = await PDFDocument.load(bytes)
    const pages = await merged.copyPages(doc, doc.getPageIndices())
    pages.forEach(pg => merged.addPage(pg))
  }
  const out = await merged.save()
  fs.writeFileSync(outputPath, Buffer.from(out))
}
