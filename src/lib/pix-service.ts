import crypto from 'crypto'

interface PixParams {
  pixKey: string
  merchantName: string
  amount: number
  referenceId: string
}

export class PixService {
  /**
   * Gera um PIX QR Code dinâmico (BR Code)
   * Referência: Manual de Padrões para Iniciação do Pix (BR Code)
   */
  static generatePixQrCode(params: PixParams): string {
    const { pixKey, merchantName, amount, referenceId } = params
    
    // Normalizar dados
    const name = merchantName.substring(0, 25).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const key = pixKey.substring(0, 77) // Limite de 77 chars para chave
    const ref = referenceId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) // TXID deve ser alfanumérico
    const formattedAmount = amount.toFixed(2)

    // Montar Payload
    const payloadElements = [
      PixService.formatField('00', '01'), // Payload Format Indicator
      PixService.formatField('26', [ // Merchant Account Information
        PixService.formatField('00', 'BR.GOV.BCB.PIX'), // GUI
        PixService.formatField('01', key) // Chave Pix
      ].join('')),
      PixService.formatField('52', '0000'), // Merchant Category Code
      PixService.formatField('53', '986'), // Transaction Currency (BRL)
      PixService.formatField('54', formattedAmount), // Transaction Amount
      PixService.formatField('58', 'BR'), // Country Code
      PixService.formatField('59', name), // Merchant Name
      PixService.formatField('60', 'CE'), // Merchant City (Default: CE - Ceará or Generic) -> Ideally should be a param, defaulting to generic
      PixService.formatField('62', [ // Additional Data Field Template
        PixService.formatField('05', ref) // Reference Label (TXID)
      ].join(''))
    ]

    const payloadWithoutCrc = payloadElements.join('') + '6304' // Adicionar ID do CRC (63) e tamanho (04)
    const crc = PixService.calculateCRC16(payloadWithoutCrc)
    
    return payloadWithoutCrc + crc
  }

  static generateReferenceId(): string {
    return `PIX${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`.substring(0, 25)
  }

  private static formatField(id: string, value: string): string {
    const len = value.length.toString().padStart(2, '0')
    return `${id}${len}${value}`
  }

  private static calculateCRC16(payload: string): string {
    let crc = 0xFFFF
    const polynomial = 0x1021

    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ polynomial) & 0xFFFF
        } else {
          crc = (crc << 1) & 0xFFFF
        }
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0')
  }
}
