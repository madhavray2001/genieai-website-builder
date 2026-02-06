import express from "express";
const router = express.Router();
import { PrismaClient } from "../generated/prisma";
const prisma = new PrismaClient();

router.post("/createUser", async(req:express.Request, res:express.Response)=>{
    const {email, name, image} = req.body;
    try {
        if(!email){
            return res.status(400).json({msg:"Email is required"})
        }
    
        let user = await prisma.user.findUnique({
            where:{email}
        })
        if(!user){
           user = await prisma.user.create({
                data:{
                    email,
                    name: name ||" ",
                    image:image || ""
                }
            })
            console.log("New user created", user.id)
        }else{
            console.log("Existing user found", user.id)
        }
        return res.status(200).json(user)
    } catch (error) {
        console.error("Error in createUser", error);
        return res.status(500).json({msg:"Internal server error"})
    }
})

export default router;