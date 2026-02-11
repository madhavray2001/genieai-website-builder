export function secureFilePath(path:string){
    if(path.includes("..")){
        throw new Error("Directory traveresal is not allowed")
    }

    const BLOCKED = ["node_modules", ".env", "package-lock.json"];
    if(BLOCKED.some(b=>path.includes(b))){
        throw new Error (`Modification of ${path} is blocked.`)
    }
}

export function secureCommand(cmd:string){
    const BLOCKED_COMMANDS = [
    "rm","-rf", "mv", "curl", "wget", "chmod", "chown", ":(){"
    ];

    if(BLOCKED_COMMANDS.some(c=>cmd.startsWith(c))){
        throw new Error(`${cmd} command is blocked!`)
    }
}

export function scanLLM(message:string){
    const BAD = ["rm -rf", "shutdown", "format", "drop database"];

    if(BAD.some(b=> message.toLowerCase().includes(b))){
        throw new Error("LLM tried to do something unsafe")
    }
}