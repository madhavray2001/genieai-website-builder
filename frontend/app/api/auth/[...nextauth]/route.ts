import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  
  callbacks: {
    async jwt({ token, account, user }) {
      //oAuth tokens like accessToken & refresh token are used to do google api calls if needed on users behslf
      if (account) {  
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
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
      console.log("from the session callbacks",JSON.stringify (session))
      session.user.id = token.userId as string;
      session.accessToken = token.accessToken
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