import { Message } from "@/app/project/[id]/ClientPage";

export interface FileNode{
    name:string,
    path:string,
    type:'file'|'folder',
    content?:string,
    children?:FileNode[]
}

export interface Files{
    path:string,
    content:string
}

export function extractFilesFromMessages(messages:Message[]):FileNode[]{
    const filesMap = new Map<string, string>();
    
    console.log("Extracting files from messages. Total messages:", messages.length);
    
    for(const msg of messages){
        if(msg.type==='tool_call' && msg.toolCall){
            console.log("Found tool_call:", msg.toolCall);
            
            if(msg.toolCall.name==='create_file' && msg.toolCall.args){
                const {filePath, content} = msg.toolCall.args;
                
                console.log("Extracting file:", filePath);
                
                if (!filePath) {
                    console.error("Missing filePath in tool call:", msg.toolCall);
                    continue;
                }
                
                // Normalize path
                const normalizedPath = filePath.startsWith('/home/user/') 
                    ? filePath 
                    : `/home/user/${filePath.replace(/^\//, '')}`;
                
                filesMap.set(normalizedPath, content || '');
            }
        }
    }
    
    console.log("Total files extracted:", filesMap.size);
    console.log("File paths:", Array.from(filesMap.keys()));
    
    const files: Array<Files> = Array.from(filesMap.entries()).map(([path, content]) => ({
        path,
        content
    }));
    
    const tree = buildFileTree(files);
    console.log("Built file tree:", tree);
    
    return tree;
}

export function buildFileTree(files:Array<Files>):FileNode[]{
    const root: FileNode = {
        name:'root',
        path:'/',
        type:'folder',
        children:[]
    }
    
    for(const file of files){
        const relativePath = file.path.replace('/home/user','');
        const parts = relativePath.split('/').filter(p=>p);
        
        let currentLevel = root;
        for(let i=0; i< parts.length; i++){
            const part = parts[i];
            const isLastPart = i === parts.length - 1;

            let existingNode = currentLevel.children?.find(child=>child.name === part)
            
            if(!existingNode){
                const newNode :FileNode={
                    name:part,
                    path:file.path.substring(0, file.path.indexOf(part) + part.length),
                    type:isLastPart?'file':'folder',
                    children:isLastPart?undefined:[]
                }
                
                if(isLastPart){
                    newNode.content = file.content;
                }
                
                currentLevel.children!.push(newNode)
                existingNode = newNode;
            } else if(isLastPart) {
                // UPDATE: If file already exists, update its content
                existingNode.content = file.content;
            }
            
            currentLevel = existingNode
        }   
    }
    return root.children || [];
}
