import puppeteer from 'puppeteer-core'
import Handlebars from 'handlebars'
import { storage } from '../firebase/admin'
import logger from './logger'
import path from 'path'
import fs from 'fs'

const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'

async function renderTemplate(templateName: string, data: Record<string, unknown>): Promise<string> {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`)
  const templateSource = fs.readFileSync(templatePath, 'utf-8')
  const template = Handlebars.compile(templateSource)
  return template(data)
}

export async function gerarPDF(
  templateName: string,
  data: Record<string, unknown>,
  nomeArquivo: string
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
        '--no-zygote',
        '--single-process',
      ],
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    })

    const bucket = storage.bucket()
    const file = bucket.file(`documentos/${nomeArquivo}`)

    await file.save(Buffer.from(pdfBuffer), {
      metadata: { contentType: 'application/pdf' },
    })

    await file.makePublic()
    const url = `https://storage.googleapis.com/${bucket.name}/documentos/${nomeArquivo}`

    logger.info(`PDF gerado: ${nomeArquivo}`)
    return url
  } catch (error) {
    logger.error('Erro ao gerar PDF:', error)
    throw error
  } finally {
    if (browser) await browser.close()
  }
}
