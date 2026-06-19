import WhatsAppSetupClient from './WhatsAppSetupClient'

const gowaBaseUrl = process.env.GOWA_BASE_URL || process.env.NEXT_PUBLIC_GOWA_BASE_URL || ''
const isConfigured = Boolean(gowaBaseUrl?.trim())

export default function WhatsAppSetupPage() {
  return <WhatsAppSetupClient gowaBaseUrl={isConfigured ? gowaBaseUrl : null} />
}
