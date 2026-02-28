import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    async function middleware(req){     
        const token = req.nextauth.token
        const userId = token?.userId

        const path = req.nextUrl.pathname
        const projectId = path.split('/')[2]

        if(projectId){
            try {
                const response = await fetch(`http://localhost:5000/api/project/verify/${projectId}?userId=${userId}`);
                const data = await response.json();

                if(response.status == 404){
                    console.log("User doesnt own this project")
                    return NextResponse.redirect(new URL('/', req.url))
                }
                  if (response.status !== 200) {
                    console.log("Access denied")
                    return NextResponse.redirect(new URL('/', req.url))
                }
                console.log("Access granted")
            } catch (error) {
                console.error("Error verifying project access", error)
                return NextResponse.redirect(new URL('/', req.url))
            }
        }
    return NextResponse.next()
    },
    {
        callbacks:{
            authorized:({token})=>{
                //if token exists user is authenticated
                return !!token
            }
        },
        pages:{
            signIn:'/', //redirct to home page if not authenticated
        }
    }
)

export const config = {
    matcher:[
        '/project/:path*'
    ]
}
