import axios from 'axios'

interface MercadoPagoConfig {
  accessToken: string
}

interface CreatePreferenceParams {
  title: string
  description: string
  amount: number
  externalReference: string
  payerEmail?: string
  payerName?: string
  backUrl?: string
  notificationUrl?: string
}

interface PreferenceResponse {
  id: string
  init_point: string
  sandbox_init_point: string
  client_id: string
  collector_id: number
  operation_type: string
  items: Array<{
    id: string
    title: string
    description: string
    quantity: number
    unit_price: number
    currency_id: string
  }>
}

export class MercadoPagoService {
  private baseUrl = 'https://api.mercadopago.com'
  
  constructor(private config: MercadoPagoConfig) {}

  /**
   * Cria uma preferência de pagamento no Mercado Pago
   * Retorna o link de pagamento (checkout)
   */
  async createPreference(params: CreatePreferenceParams): Promise<{
    success: boolean
    preferenceId?: string
    paymentLink?: string
    error?: any
  }> {
    const {
      title,
      description,
      amount,
      externalReference,
      payerEmail,
      payerName,
      backUrl,
      notificationUrl,
    } = params

    const payload: any = {
      items: [
        {
          title,
          description,
          quantity: 1,
          unit_price: amount,
          currency_id: 'BRL',
        },
      ],
      external_reference: externalReference,
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12, // Máximo de 12 parcelas
      },
      back_urls: backUrl
        ? {
            success: `${backUrl}?status=success&id=${externalReference}`,
            failure: `${backUrl}?status=failure&id=${externalReference}`,
            pending: `${backUrl}?status=pending&id=${externalReference}`,
          }
        : undefined,
      auto_return: 'approved',
      notification_url: notificationUrl,
      statement_descriptor: title.substring(0, 22), // Máximo 22 caracteres
    }

    // Adicionar payer se fornecido
    if (payerEmail || payerName) {
      payload.payer = {
        email: payerEmail,
        name: payerName,
      } as any
    }

    try {
      const response = await axios.post<PreferenceResponse>(
        `${this.baseUrl}/checkout/preferences`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      // Retornar o init_point (link de pagamento)
      // Em produção, use init_point; em sandbox, use sandbox_init_point
      const paymentLink = response.data.init_point || response.data.sandbox_init_point

      return {
        success: true,
        preferenceId: response.data.id,
        paymentLink,
      }
    } catch (error: any) {
      console.error('Erro ao criar preferência Mercado Pago:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data || error.message,
      }
    }
  }

  /**
   * Busca informações de um pagamento específico
   */
  async getPayment(paymentId: string): Promise<{
    success: boolean
    payment?: any
    error?: any
  }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
          },
        }
      )

      return {
        success: true,
        payment: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data || error.message,
      }
    }
  }

  /**
   * Busca pagamento por external_reference (ID da cobrança)
   */
  async getPaymentByReference(externalReference: string): Promise<{
    success: boolean
    payments?: any[]
    error?: any
  }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/payments/search`,
        {
          params: {
            external_reference: externalReference,
          },
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
          },
        }
      )

      return {
        success: true,
        payments: response.data.results || [],
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data || error.message,
      }
    }
  }

  /**
   * Testa a conexão com a API do Mercado Pago
   */
  async testConnection(): Promise<{
    success: boolean
    data?: any
    error?: any
  }> {
    try {
      // Tenta buscar informações do usuário/contador
      const response = await axios.get(
        `${this.baseUrl}/users/me`,
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
          },
        }
      )

      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data || error.message,
      }
    }
  }
}

