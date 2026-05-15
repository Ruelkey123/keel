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
    const { booking_id } = body

    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
    }

    // Fetch booking with customer
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, customer:customers(*)')
      .eq('id', booking_id)
      .eq('org_id', profile.org_id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const customer = booking.customer as {
      id: string
      full_name: string
      email: string
      stripe_customer_id: string | null
    }

    // Remaining balance
    const remaining = booking.total_price - booking.deposit_amount

    if (remaining <= 0) {
      return NextResponse.json({ error: 'No remaining balance to capture' }, { status: 400 })
    }

    // Get or create Stripe customer
    let stripeCustomerId = customer.stripe_customer_id

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        name: customer.full_name,
        email: customer.email,
        metadata: { supabase_customer_id: customer.id },
      })
      stripeCustomerId = stripeCustomer.id

      await supabase
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', customer.id)
    }

    // Create PaymentIntent for remaining balance
    const paymentIntent = await stripe.paymentIntents.create({
      amount: remaining,
      currency: 'usd',
      customer: stripeCustomerId,
      capture_method: 'automatic',
      metadata: {
        booking_id: booking_id,
        org_id: profile.org_id,
        type: 'rental',
      },
    })

    // Insert payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: booking_id,
        stripe_payment_intent_id: paymentIntent.id,
        type: 'rental',
        amount: remaining,
        status: 'pending',
      })
      .select()
      .single()

    if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 })

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
