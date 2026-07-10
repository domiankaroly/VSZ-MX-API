import { auth } from '@/lib/auth'
import { apiError } from '@/lib/utils'

// Mx ERP végpontok autentikációja:
// 1. Ha MX_API_KEY be van állítva → Authorization: Bearer <key> fejléc
// 2. Ha nincs MX_API_KEY → NextAuth session (böngészős hozzáféréshez)
// 3. Ha sem session, sem helyes API key → 401

export async function mxAuth(request: Request): Promise<Response | null> {
  const apiKey = process.env.MX_API_KEY

  if (apiKey) {
    // API key mód — a Mx ERP ezt használja
    const authHeader = request.headers.get('authorization')
    if (authHeader === `Bearer ${apiKey}`) return null // OK
    // Helytelen vagy hiányzó key → 401
    return apiError('Érvénytelen API kulcs', 401)
  }

  // Nincs MX_API_KEY konfigurálva → session alapú auth (fejlesztéshez)
  const session = await auth()
  if (session) return null // OK
  return apiError('Nincs jogosultság', 401)
}
