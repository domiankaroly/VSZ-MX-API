import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'VSZ Login',
      credentials: {
        username: { label: 'Felhasználónév', type: 'text' },
        password: { label: 'Jelszó', type: 'password' },
      },
      async authorize(credentials: Partial<Record<'username' | 'password', unknown>>) {
        const u = credentials?.username as string | undefined
        const p = credentials?.password as string | undefined
        if (!u || !p) return null

        // Demo mód: admin/admin DB nélkül
        if (process.env.NODE_ENV === 'development' && u === 'admin' && p === 'admin') {
          return { id: '1', name: 'Admin (Demo)', email: 'admin@vsz.local', admin: true, uzem: 1, telephely: 1 }
        }

        // Éles DB autentikáció
        try {
          const { query } = await import('@/lib/db')
          const users = await query<{
            f_id: number; f_neve: string; f_jelszo: string
            f_admin: number; f_uzem: number; f_telephely: number
          }>(
            'SELECT f_id, f_neve, f_jelszo, f_admin, f_uzem, f_telephely FROM felhasznalok WHERE f_neve = ? AND f_aktiv = 1 LIMIT 1',
            [u]
          )
          const user = users[0]
          if (!user) return null
          if (user.f_jelszo !== p) return null  // TODO: hash ellenőrzés

          return {
            id: String(user.f_id),
            name: user.f_neve,
            email: '',
            admin: user.f_admin === 1,
            uzem: user.f_uzem,
            telephely: user.f_telephely,
          }
        } catch (err) {
          console.error('Auth DB hiba:', err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as Record<string, unknown>
        token.admin = u.admin
        token.uzem = u.uzem
        token.telephely = u.telephely
      }
      return token
    },
    async session({ session, token }) {
      const u = session.user as unknown as Record<string, unknown>
      u.admin = token.admin
      u.uzem = token.uzem
      u.telephely = token.telephely
      return session
    },
  },
})
