import { hasOverlap } from '@/lib/availability'

describe('hasOverlap', () => {
  const base = {
    start: new Date('2026-05-15T10:00'),
    end: new Date('2026-05-15T14:00'),
  }

  it('detects overlap when new booking starts during existing', () => {
    expect(
      hasOverlap(base.start, base.end, new Date('2026-05-15T12:00'), new Date('2026-05-15T16:00'))
    ).toBe(true)
  })

  it('detects overlap when new booking contains existing', () => {
    expect(
      hasOverlap(base.start, base.end, new Date('2026-05-15T09:00'), new Date('2026-05-15T16:00'))
    ).toBe(true)
  })

  it('no overlap when adjacent (end = new start)', () => {
    expect(
      hasOverlap(base.start, base.end, new Date('2026-05-15T14:00'), new Date('2026-05-15T18:00'))
    ).toBe(false)
  })

  it('no overlap when completely before', () => {
    expect(
      hasOverlap(base.start, base.end, new Date('2026-05-15T07:00'), new Date('2026-05-15T09:00'))
    ).toBe(false)
  })

  it('no overlap when completely after', () => {
    expect(
      hasOverlap(base.start, base.end, new Date('2026-05-15T15:00'), new Date('2026-05-15T18:00'))
    ).toBe(false)
  })
})
