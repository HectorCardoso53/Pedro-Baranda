import QRCode from 'qrcode'

interface PixPayload {
  chave: string
  nome: string
  cidade: string
  valor: number
  txid?: string
  descricao?: string
}

function calcularCRC16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0')
}

function formatarCampo(id: string, valor: string): string {
  return `${id}${valor.length.toString().padStart(2, '0')}${valor}`
}

export function gerarPixCopiaECola(params: PixPayload): string {
  const { chave, nome, cidade, valor, txid = '***', descricao = '' } = params

  const valorStr = valor.toFixed(2)
  const nomeFormatado = nome.substring(0, 25).normalize('NFD').replace(/[̀-ͯ]/g, '')
  const cidadeFormatada = cidade.substring(0, 15).normalize('NFD').replace(/[̀-ͯ]/g, '')
  const txidFormatado = txid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) || '***'

  const merchantAccountInfo = formatarCampo('00', 'BR.GOV.BCB.PIX') +
    formatarCampo('01', chave) +
    (descricao ? formatarCampo('02', descricao.substring(0, 40)) : '')

  let payload =
    formatarCampo('00', '01') +
    formatarCampo('26', merchantAccountInfo) +
    formatarCampo('52', '0000') +
    formatarCampo('53', '986') +
    formatarCampo('54', valorStr) +
    formatarCampo('58', 'BR') +
    formatarCampo('59', nomeFormatado) +
    formatarCampo('60', cidadeFormatada) +
    formatarCampo('62', formatarCampo('05', txidFormatado)) +
    '6304'

  const crc = calcularCRC16(payload)
  return payload + crc
}

export async function gerarQRCodeBase64(pixString: string): Promise<string> {
  return QRCode.toDataURL(pixString, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
  })
}
