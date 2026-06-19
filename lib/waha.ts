export async function sendWahaMessage({
  apiKey,
  phone,
  text,
  mediaUrl,
}: {
  apiKey: string
  phone: string
  text: string
  mediaUrl?: string
}) {
  const base = process.env.WAHA_BASE_URL
  
  if (mediaUrl) {
    return fetch(`${base}/api/sendImage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body: JSON.stringify({
        chatId: `${phone}@c.us`,
        file: { url: mediaUrl },
        caption: text,
        session: 'default',
      }),
    })
  }

  return fetch(`${base}/api/sendText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
    body: JSON.stringify({
      chatId: `${phone}@c.us`,
      text,
      session: 'default',
    }),
  })
}