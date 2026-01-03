export enum ScheduleType {
  IMMEDIATE = 'IMMEDIATE',
  SCHEDULED_ONCE = 'SCHEDULED_ONCE',
  MONTHLY_RECURRING = 'MONTHLY_RECURRING',
}

export enum ChargeStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface ChargeFormData {
  customerName: string
  customerPhone: string
  customerEmail?: string
  amount: number
  description: string
  productName?: string
  imageUrl?: string
  dueDate?: Date
  scheduleType: ScheduleType
  scheduleDay?: number
  scheduledDate?: Date
}

