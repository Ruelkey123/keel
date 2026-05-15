import type { Boat } from '@/types/database'

export interface PriceBreakdown {
  basePrice: number
  depositAmount: number
  totalPrice: number
  durationHours: number
  priceType: 'hourly' | 'half_day' | 'full_day'
}

const HALF_DAY_HOURS = 4
const FULL_DAY_HOURS = 8
const DEPOSIT_RATE = 0.25

export function calculatePrice(
  boat: Boat,
  startTime: Date,
  endTime: Date
): PriceBreakdown {
  const durationMs = endTime.getTime() - startTime.getTime()
  const durationHours = durationMs / (1000 * 60 * 60)

  let basePrice: number
  let priceType: PriceBreakdown['priceType']

  if (durationHours >= FULL_DAY_HOURS && boat.full_day_rate) {
    basePrice = boat.full_day_rate
    priceType = 'full_day'
  } else if (durationHours >= HALF_DAY_HOURS && boat.half_day_rate) {
    basePrice = boat.half_day_rate
    priceType = 'half_day'
  } else {
    const hourlyRate = boat.hourly_rate ?? 0
    basePrice = Math.ceil(durationHours) * hourlyRate
    priceType = 'hourly'
  }

  const depositAmount = Math.round(basePrice * DEPOSIT_RATE)

  return {
    basePrice,
    depositAmount,
    totalPrice: basePrice,
    durationHours,
    priceType,
  }
}
