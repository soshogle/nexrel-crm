
// Twilio SMS & Voice Helper

interface TwilioConfig {
  account_sid: string
  auth_token: string
  phone_number: string
}

// Load Twilio credentials from environment variables
function getTwilioConfig(): TwilioConfig {
  return {
    account_sid: process.env.TWILIO_ACCOUNT_SID || '',
    auth_token: process.env.TWILIO_AUTH_TOKEN || '',
    phone_number: process.env.TWILIO_PHONE_NUMBER || '',
  }
}

export async function sendSMS(to: string, message: string) {
  const config = getTwilioConfig()

  if (!config.account_sid || !config.auth_token || !config.phone_number) {
    throw new Error('Twilio credentials not configured. Please configure Twilio in Settings.')
  }

  // Format phone number (remove any non-digit characters except +)
  const formattedTo = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`

  try {
    // Call Twilio API
    const auth = Buffer.from(`${config.account_sid}:${config.auth_token}`).toString('base64')
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.account_sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: config.phone_number,
          Body: message,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send SMS')
    }

    const data = await response.json()
    
    return {
      sid: data.sid,
      status: data.status,
      to: data.to,
      from: data.from,
    }
  } catch (error: any) {
    console.error('Twilio SMS error:', error)
    throw new Error(error.message || 'Failed to send SMS via Twilio')
  }
}

/**
 * Initiate an outbound call using Twilio and connect to ElevenLabs agent
 * This creates a call that will use ElevenLabs for the conversation
 */
export async function initiateOutboundCall(params: {
  to: string;
  from: string;
  elevenLabsAgentId: string;
}) {
  const config = getTwilioConfig()

  if (!config.account_sid || !config.auth_token) {
    throw new Error('Twilio credentials not configured')
  }

  const { to, from, elevenLabsAgentId } = params

  // Format phone numbers
  const formattedTo = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`
  const formattedFrom = from.startsWith('+') ? from : `+1${from.replace(/\D/g, '')}`

  try {
    const auth = Buffer.from(`${config.account_sid}:${config.auth_token}`).toString('base64')
    
    // Create TwiML to connect to ElevenLabs WebSocket
    const baseUrl = process.env.NEXTAUTH_URL || 'https://go-high-or-show-goog-8dv76n.abacusai.app'
    const twilioCallbackUrl = `${baseUrl}/api/twilio/voice-callback?agentId=${elevenLabsAgentId}`
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.account_sid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: formattedFrom,
          Url: twilioCallbackUrl,
          Method: 'POST',
          StatusCallback: `${baseUrl}/api/twilio/call-status`,
          StatusCallbackEvent: 'initiated,ringing,answered,completed',
          StatusCallbackMethod: 'POST',
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Twilio API error:', error)
      throw new Error(error.message || 'Failed to initiate call via Twilio')
    }

    const data = await response.json()
    
    return {
      call_id: data.sid,
      status: data.status,
      to: data.to,
      from: data.from,
      direction: data.direction,
    }
  } catch (error: any) {
    console.error('Twilio call error:', error)
    throw new Error(error.message || 'Failed to initiate call via Twilio')
  }
}

export function isTwilioConfigured(): boolean {
  const config = getTwilioConfig()
  return !!(config.account_sid && config.auth_token && config.phone_number)
}
