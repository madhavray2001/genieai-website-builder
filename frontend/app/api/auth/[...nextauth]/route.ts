import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  
  // Explicit secret so the JWT encoder and the edge middleware's getToken()
  // always use the same key.
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, user }) {
      // NOTE: we deliberately do NOT persist Google's access_token/refresh_token
      // in the JWT. They were unused, and storing them bloated the session JWT
      // past ~4KB, so NextAuth split it into chunked cookies
      // (__Secure-next-auth.session-token.0/.1). getToken() in the edge
      // middleware then failed to reassemble them and returned null — which made
      // withAuth treat authenticated users as logged-out and bounce them to
      // "/?callbackUrl=/project/...". Keeping the token small avoids chunking.
      if(user){
         try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL!}/api/createUser`,{
            method:'POST',
            headers:{
              'Content-Type':'application/json'
            },
            body:JSON.stringify({
              email: user.email,
              name: user.name || "",
              image: user.image || "",
            })
          })
          const dbUser = await res.json()
          token.userId = dbUser.id;
         } catch (error) {
          console.error("Error creating/fetching user from db", error)
         }
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.userId as string;
      return session
    }
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }