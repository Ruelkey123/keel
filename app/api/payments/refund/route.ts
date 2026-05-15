import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const { payment_id, amount } = body

    if (!payment_id) {
      return NextResponse.json({ error: 'payment_id is required' }, { status: 400 })
    }

    // Fetch the payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('*, booking:bookings(org_id)')
      .eq('id', payment_id)
      .single()

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    // Ensure the payment belongs to this org
    const booking = payment.booking as { org_id: string } | null
    if (!booking || booking.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (!payment.stripe_payment_intent_id) {
      return NextResponse.json({ error: 'No Stripe payment intent associated' }, { status: 400 })
    }

    // Create refund via Stripe
    const refundParams: { payment_intent: string; amount?: number } = {
      payment_intent: payment.stripe_payment_intent_id,
    }
    if (amount) refundParams.amount = amount

    const refund = await stripe.refunds.create(refundParams)

    // Insert refund payment record
    const { data: refundPayment, error: refundError } = await supabase
      .from('payments')
      .insert({
        booking_id: payment.booking_id,
        stripe_payment_intent_id: payment.stripe_payment_intent_id,
        type: 'refund',
        amount: refund.amount,
        status: 'succeeded',
      })
      .select()
      .single()

    if (refundError) return NextResponse.json({ error: refundError.message }, { status: 500 })

    return NextResponse.json({ refund_id: refund.id, payment: refundPayment })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
