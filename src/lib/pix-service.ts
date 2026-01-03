import crypto from 'crypto'

interface PixParams {
  pixKey: string
  merchantName: string
  amount: number
  referenceId: string
}

export class PixService {
  /**
   * Gera um PIX QR Code dinâmico
   * Nota: Em produção, você deve usar a API do seu banco/gateway
   * Este é um exemplo simplificado para demonstração
   */
  static generatePixQrCode(params: PixParams): string {
    const { pixKey, merchantName, amount, referenceId } = params
    
    // Formato simplificado do payload PIX (EMV)
    // Em produção, use uma biblioteca específica ou API do banco
    // Exemplo: usar biblioteca como 'pix-payload' ou integração com API do banco
    const payload = [
      '00020126', // Payload Format Indicator
      '0014br.gov.bcb.pix', // Merchant Account Information
      `2529${pixKey}`, // PIX Key
      '52040000', // Merchant Category Code
      '5303986', // Transaction Currency (986 = BRL)
      `54${String(Math.round(amount * 100)).padStart(2, '0')}`, // Transaction Amount (em centavos)
      '5802BR', // Country Code
      `59${String(merchantName.length).padStart(2, '0')}${merchantName}`, // Merchant Name
      `62${String(referenceId.length).padStart(2, '0')}${referenceId}`, // Additional Data Field
      '6304' // CRC16 (simplificado - em produção calcular corretamente)
    ].join('')

    return payload
  }

  static generateReferenceId(): string {
    return `PIX${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`
  }
}

