import axios from 'axios'

interface WhatsAppConfig {
  phoneNumberId: string
  accessToken: string
}

export interface PaymentMessageParams {
  to: string // Formato: 5585999999999
  customerName: string
  productName: string
  amount: number
  imageUrl: string
  pixReferenceId: string
  pixQrCode: string
  pixKey: string
  pixKeyType: string
  merchantName: string
  mercadoPagoLink?: string
}

export class WhatsAppService {
  private baseUrl = 'https://graph.facebook.com/v18.0'
  
  constructor(private config: WhatsAppConfig) {}

  async sendPaymentMessage(params: PaymentMessageParams) {
    const {
      to,
      customerName,
      productName,
      amount,
      imageUrl,
      pixReferenceId,
      pixQrCode,
      pixKey,
      pixKeyType,
      merchantName,
      mercadoPagoLink
    } = params

    // Converter valor para centavos
    const amountInCents = Math.round(amount * 100)

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: 'paymentswa',
        language: { 
          policy: 'deterministic', 
          code: 'pt_BR' 
        },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: { link: imageUrl }
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: customerName },
              { type: 'text', text: productName }
            ]
          },
          {
            type: 'button',
            sub_type: 'order_details',
            index: 0,
            parameters: [
              {
                type: 'action',
                action: {
                  order_details: {
                    reference_id: pixReferenceId,
                    type: 'digital-goods',
                    payment_type: 'br',
                    payment_settings: this.buildPaymentSettings(
                      pixQrCode,
                      pixKey,
                      pixKeyType,
                      merchantName,
                      mercadoPagoLink
                    ),
                    currency: 'BRL',
                    total_amount: { 
                      value: amountInCents, 
                      offset: 100 
                    },
                    order: {
                      status: 'pending',
                      items: [
                        {
                          retailer_id: '1234567',
                          name: productName,
                          amount: { 
                            value: amountInCents, 
                            offset: 100 
                          },
                          quantity: 1
                        }
                      ],
                      subtotal: { 
                        value: amountInCents, 
                        offset: 100 
                      }
                    }
                  }
                }
              }
            ]
          }
        ]
      }
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data || error.message
      }
    }
  }

  private buildPaymentSettings(
    pixQrCode: string,
    pixKey: string,
    pixKeyType: string,
    merchantName: string,
    mercadoPagoLink?: string
  ) {
    const settings: any[] = [
      {
        type: 'pix_dynamic_code',
        pix_dynamic_code: {
          code: pixQrCode,
          merchant_name: merchantName,
          key: pixKey,
          key_type: pixKeyType
        }
      }
    ]

    if (mercadoPagoLink) {
      settings.push({
        type: 'payment_link',
        payment_link: {
          uri: mercadoPagoLink
        }
      })
    }

    return settings
  }

  async testConnection() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.config.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`
          }
        }
      )
      return { success: true, data: response.data }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data || error.message 
      }
    }
  }
}

