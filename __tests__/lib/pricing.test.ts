import { calculatePrice } from '@/lib/pricing'
import type { Boat } from '@/types/database'

const mockBoat: Boat = {
  id: 'test',
  org_id: 'org',
  name: 'Test Boat',
  make: null,
  model: null,
  year: null,
  length_ft: null,
  status: 'available',
  hourly_rate: 7500,
  half_day_rate: 22000,
  full_day_rate: 38000,
  fuel_capacity: null,
  fuel_type: null,
  capacity_persons: null,
  cover_image_url: null,
  created_at: new Date().toISOString(),
}

describe('calculatePrice', () => {
  it('uses hourly rate for short rentals', () => {
    const start = new Date('2026-05-15T09:00:00')
    const end = new Date('2026-05-15T11:00:00')
    const result = calculatePrice(mockBoat, start, end)
    expect(result.priceType).toBe('hourly')
    expect(result.basePrice).toBe(15000)
    expect(result.depositAmount).toBe(3750)
  })

  it('uses half-day rate for 4+ hour rentals', () => {
    const start = new Date('2026-05-15T09:00:00')
    const end = new Date('2026-05-15T13:00:00')
    const result = calculatePrice(mockBoat, start, end)
    expect(result.priceType).toBe('half_day')
    expect(result.basePrice).toBe(22000)
  })

  it('uses full-day rate for 8+ hour rentals', () => {
    const start = new Date('2026-05-15T08:00:00')
    const end = new Date('2026-05-15T16:00:00')
    const result = calculatePrice(mockBoat, start, end)
    expect(result.priceType).toBe('full_day')
    expect(result.basePrice).toBe(38000)
  })

  it('falls back to hourly when half-day rate is null', () => {
    const boatNoHalfDay = { ...mockBoat, half_day_rate: null }
    const start = new Date('2026-05-15T09:00:00')
    const end = new Date('2026-05-15T13:00:00')
    const result = calculatePrice(boatNoHalfDay, start, end)
    expect(result.priceType).toBe('hourly')
  })
})
