import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBookingConfirmation(opts: {
  to: string
  customerName: string
  boatName: string
  startTime: string
  endTime: string
  totalPrice: number
  bookingId: string
}) {
  const { to, customerName, boatName, startTime, endTime, totalPrice, bookingId } = opts
  return resend.emails.send({
    from: 'Keel Marina <bookings@keel.app>',
    to,
    subject: `Booking confirmed — ${boatName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0f172a;">Your booking is confirmed</h1>
        <p>Hi ${customerName},</p>
        <p>Your rental has been confirmed. Here are the details:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #64748b;">Boat</td><td><strong>${boatName}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Start</td><td>${new Date(startTime).toLocaleString()}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">End</td><td>${new Date(endTime).toLocaleString()}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Total</td><td><strong>$${(totalPrice / 100).toFixed(2)}</strong></td></tr>
        </table>
        <p style="margin-top: 24px; color: #64748b; font-size: 14px;">Booking ID: ${bookingId}</p>
        <p style="color: #64748b; font-size: 14px;">See you on the water!</p>
      </div>
    `,
  })
}

export async function sendBookingReminder(opts: {
  to: string
  customerName: string
  boatName: string
  startTime: string
  bookingId: string
}) {
  const { to, customerName, boatName, startTime, bookingId } = opts
  return resend.emails.send({
    from: 'Keel Marina <bookings@keel.app>',
    to,
    subject: `Reminder: your rental tomorrow — ${boatName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0f172a;">Your rental is tomorrow</h1>
        <p>Hi ${customerName},</p>
        <p>Just a reminder that your boat rental is coming up:</p>
        <p><strong>${boatName}</strong> — ${new Date(startTime).toLocaleString()}</p>
        <p style="color: #64748b; font-size: 14px;">Booking ID: ${bookingId}</p>
      </div>
    `,
  })
}

export async function sendBookingCancellation(opts: {
  to: string
  customerName: string
  boatName: string
  bookingId: string
}) {
  const { to, customerName, boatName, bookingId } = opts
  return resend.emails.send({
    from: 'Keel Marina <bookings@keel.app>',
    to,
    subject: `Booking canceled — ${boatName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0f172a;">Booking canceled</h1>
        <p>Hi ${customerName},</p>
        <p>Your booking for <strong>${boatName}</strong> has been canceled.</p>
        <p>If you have questions, please contact the marina directly.</p>
        <p style="color: #64748b; font-size: 14px;">Booking ID: ${bookingId}</p>
      </div>
    `,
  })
}
