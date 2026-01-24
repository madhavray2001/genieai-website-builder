import express from "express";
import { PrismaClient } from "../generated/prisma";
const router = express.Router();
const prisma = new PrismaClient();

router.post('/project', async (req, res) => {
    const title = 'test project';
    const userId = 'd79d608e-0c3a-42f1-8bdd-b69fb1334d15';
    const { initialPrompt } = req.body;
    const id = req.query.id;
    // console.log("this is the id in query", id);
    // console.log("prompt:", initialPrompt)

    try {
        if (!initialPrompt) {
            return res.status(404).json({
                msg: "Invalid input"
            })
        }
        const project = await prisma.project.create({
            data: {
                id,
                title,
                initialPrompt,
                userId
            }
        })

        return res.status(200).json({
            msg:"Project created successfully",
            project
        })

    } catch (error) {
        console.error("Internal server error", error);
    }
})

router.get('/project/:id', async (req, res)=>{
    try {
        const {id} = req.params;
        const prompt = await prisma.project.findFirst({
            where:{
                id
            }
        })
        // console.log("prompt from the route", prompt);
        return res.status(200).json({data:prompt})
    } catch (error) {
        console.error("Internal server error", error);
        return res.status(500).json({msg:"Internal server error"})
    }
})

export default router;