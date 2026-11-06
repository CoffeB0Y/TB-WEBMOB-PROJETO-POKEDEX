// Reutiliza as suites existentes somente no banco dedicado desta auditoria.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const backend = path.resolve(__dirname, '../../app/app-backend/projeto pokedex');
const target = path.join(__dirname, 'regressao.db');
process.env.DATABASE_URL = `file:${target.replaceAll('\\', '/')}`;
process.env.JWT_SECRET = 'auditoria-local-exclusiva-nao-producao';
const suite = process.argv[2] === 'pokeapi' ? 'verify-pokeapi.cjs' : 'verify-integration.cjs';
const filename = path.join(backend, 'scripts', suite);
const original = fs.readFileSync(filename, 'utf8');
const guard = "resolve(__dirname,'../.verification/test.db')";
if (!original.includes(guard)) throw new Error('Guard de isolamento mudou; revisar antes de executar');
const source = original.replace(guard, `resolve(${JSON.stringify(target)})`);
const instance = new Module(filename, module);
instance.filename = filename;
instance.paths = Module._nodeModulePaths(path.dirname(filename));
instance._compile(source, filename);
