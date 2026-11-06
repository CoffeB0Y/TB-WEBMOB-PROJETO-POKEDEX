// Reutiliza a suíte SMTP TLS existente, com banco novo e evidências separadas.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const {DatabaseSync}=require('node:sqlite');
const backend=path.resolve(__dirname,'../../app/app-backend/projeto pokedex');
const target=path.join(__dirname,'.data',`recovery-${Date.now()}.db`);
fs.mkdirSync(path.dirname(target),{recursive:true});
const db=new DatabaseSync(target);
for(const dir of fs.readdirSync(path.join(backend,'prisma/migrations')).sort()){
 const file=path.join(backend,'prisma/migrations',dir,'migration.sql');
 if(fs.existsSync(file))db.exec(fs.readFileSync(file,'utf8'));
}
db.close();process.env.DATABASE_URL=`file:${target.replaceAll('\\','/')}`;process.env.JWT_SECRET='recovery-local-only-not-production';
const filename=path.join(backend,'scripts/verify-recovery.cjs');
let source=fs.readFileSync(filename,'utf8');
const guard="process.env.DATABASE_URL !== 'file:./.verification/test.db'";
if(!source.includes(guard))throw new Error('Revisar guarda da suíte SMTP');
source=source.replace(guard,`process.env.DATABASE_URL !== ${JSON.stringify(process.env.DATABASE_URL)}`)
 .replace("'../../../../docs/recuperacao'",JSON.stringify(path.join(__dirname,'recuperacao')));
const test=new Module(filename,module);test.filename=filename;test.paths=Module._nodeModulePaths(path.dirname(filename));test._compile(source,filename);
