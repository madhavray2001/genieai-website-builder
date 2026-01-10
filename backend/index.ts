import 'dotenv/config'
import { Sandbox } from '@e2b/code-interpreter'

const viteScript = `
npm create vite@latest my-app -- --template react
cd my-app
npm install
npm run build
npm install -g serve
npx serve -s dist -l 3000
`
const sandbox = await Sandbox.create({timeoutMs:60_000})

const host = sandbox.getHost(3000)
console.log(`https://${host}`)

await sandbox.commands.run(viteScript);


