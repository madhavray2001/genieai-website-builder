import express from "express";
import { PrismaClient } from "../generated/prisma";
import { runAgent } from "../runAgent";
import { users } from "..";
const router = express.Router();
const prisma = new PrismaClient();

router.post('/project', async (req : express.Request, res: express.Response) => {
    const title = 'test project';
    const userId = '9cabe184-e4b9-4351-9b71-5737107d552b';
    const { initialPrompt } = req.body;
    const id = req.query.id as string;
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

// router.post('/prompt', async(req: express.Request, res:express.Response)=>{
//     // const title = 'test project';
//     const userId = '9cabe184-e4b9-4351-9b71-5737107d552b';
//     const { prompt } = req.body;
//     const projectId = req.query.id as string;

//     try {
//         if(!prompt){
//             return res.status(404).json({
//                 msg:"Invalid input"
//             })
//         }

//         const conversation = await prisma.conversationHistory.create({
//             data:{
//                 projectId,
//                 type:"TEXT_MESSAGE",
//                 from: "USER",
//                 contents:prompt
//             }
//         })
//         const convo = conversation.contents;
//         // runAgent(userId, projectId, convo, )
//         return res.status(200).json({
//             msg:"Prompt given successfully",
//             conversation
//         })
//     } catch (error) {
//         console.error("Internal server error", error);
//     }
// })

router.get('/project/:id', async (req: express.Request, res: express.Response)=>{
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
