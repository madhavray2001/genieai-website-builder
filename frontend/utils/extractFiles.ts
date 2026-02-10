import { Message } from "@/app/project/[id]/page";

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

// export function extractFilesFromMessages(messages:Message[]):FileNode[]{
//     const files:Array<Files> = []
    
//     for(const msg of messages){
//         //checking the msg type if its a tool call
//         if(msg.type==='tool_call' && msg.toolCall){
//             if(msg.toolCall.name==='create_file' && msg.toolCall.args){
//                 const {filePath, content} = msg.toolCall.args;
//                 files.push({
//                     path:filePath,
//                     content:content
//                 })
//             }
//         }
//     }
//     return buildFileTree(files)
// }
// ...existing code...
// ...existing code...
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
// ...existing code...
// ...existing code...
function buildFileTree(files:Array<Files>):FileNode[]{
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
// ...existing code...

// function buildFileTree(files:Array<Files>):FileNode[]{
//     const root: FileNode = {
//         name:'root',
//         path:'/',
//         type:'folder',
//         children:[]
//     }
    
//     for(const file of files){
//         const relativePath = file.path.replace('/home/user','');
//         const parts = relativePath.split('/').filter(p=>p); //p=>p filter keeps only the truthy values, removes 0, null, undefined, empty string
        
//         let currentLevel = root;
//         // parts = ['src','app','page.tsx']
//         for(let i=0; i< parts.length; i++){
//             const part = parts[i];
//             const isLastPart = i === parts.length - 1;

//             //check if the part already exist? what if there are duplcates?
//             let existingNode = currentLevel.children?.find(child=>child.name === part)
            
//             if(!existingNode){
//                 const newNode :FileNode={
//                     name:part,
//                     path:file.path.substring(0, file.path.indexOf(part) + part.length),
//                     type:isLastPart?'file':'folder',
//                     children:isLastPart?undefined:[]
//                 }
                
//                 //adding content to the file
//                 if(isLastPart){
//                     newNode.content = file.content;
//                 }
                
//                 currentLevel.children!.push(newNode)

//                 existingNode = newNode;
//             }
//             currentLevel = existingNode
//         }   
//     }
//     return root.children || [];
// }



// -------------------------------------------------------------------------
// import { Message } from "@/app/project/[id]/page";

// // Define the file structure
// export interface FileNode {
//   name: string;                    // "App.jsx"
//   path: string;                    // "/home/user/src/App.jsx"
//   type: 'file' | 'folder';
//   content?: string;                // The actual code (only for files)
//   children?: FileNode[];           // Sub-items (only for folders)
// }

// export function extractFilesFromMessages(messages: Message[]): FileNode[] {
//   const files: Array<{path: string, content: string}> = [];
  
//   console.log(" Extracting from messages:", messages);
  
//   for (const msg of messages) {
//     if (msg.type === 'tool_call' && msg.toolCall) {
//       console.log(" Tool call found:", msg.toolCall); 
      
//       // Check if it's a create_file tool
//       if (msg.toolCall.name === 'create_file' && msg.toolCall.args) {
//         const { filePath, content } = msg.toolCall.args;
        
//         console.log("File extracted:", filePath); 
        
//         files.push({
//           path: filePath,
//           content: content
//         });
//       }
//     }
//   }
  
//   console.log("Total files extracted:", files.length);
  
//   return buildFileTree(files);
// }

// export function buildFileTree(files:Array<{path:string, content:string}>):FileNode[]{
// const root: FileNode = {
//     name:'root',   
//     path:'/',
//     type:'folder',
//     children:[]
// };

// for (const file of files){
//      // Split path: "/home/user/src/App.jsx" to ["home", "user", "src", "App.jsx"]
//      const relativePath = file.path.replace('/home/user','');
//      const parts = relativePath.split('/').filter(p=>p); //filter returns a new array, it doesn't modify the original one.

//      let currentLevel = root;

//     //  building nested structure 
//     for (let i = 0; i < parts.length; i++) {
//       const part = parts[i];
//       const isLastPart = i === parts.length - 1;
      
//       // Check if this part already exists
//       let existingNode = currentLevel.children?.find(child => child.name === part);
      
//       if (!existingNode) {
//         // Create new node
//         const newNode: FileNode = {
//           name: part,
//           path: file.path.substring(0, file.path.indexOf(part) + part.length),
//           type: isLastPart ? 'file' : 'folder',
//           children: isLastPart ? undefined : []
//         };
        
//         if (isLastPart) {
//           newNode.content = file.content; // Store file content
//         }
        
//         currentLevel.children!.push(newNode);
//         existingNode = newNode;
//       }
      
//       currentLevel = existingNode;
//     }
// }
// return root.children || [];
// }