// Testes HTTP reais com fixtures locais em banco novo e exclusivo. Nunca usa dev.db.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const output = path.resolve(__dirname, '../../../../docs/correcoes-2026-11-05');
fs.mkdirSync(path.join(output, '.data'), { recursive: true });
const target = path.join(output, '.data', `regressao-${Date.now()}.db`);
const sql = new DatabaseSync(target);
for (const dir of fs.readdirSync(path.resolve(__dirname, '../prisma/migrations')).sort()) {
  const file = path.resolve(__dirname, '../prisma/migrations', dir, 'migration.sql');
  if (fs.existsSync(file)) sql.exec(fs.readFileSync(file, 'utf8'));
}
sql.close();
process.env.DATABASE_URL = `file:${target.replaceAll('\\', '/')}`;
process.env.JWT_SECRET = 'regression-only-not-production';
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { AppModule } = require('../dist/src/app.module');
const { PrismaService } = require('../dist/src/database/prisma.service');
const results = [];
(async () => {
 const app = await NestFactory.create(AppModule, { logger: false });
 app.setGlobalPrefix('api');
 app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
 await app.init();
 const api = request(app.getHttpServer()), db = app.get(PrismaService);
 async function check(name, action) { await action(); results.push({ name, passed: true }); console.log('PASS', name); }
 try {
  const register = async (name, password='Senha-teste-123') => (await api.post('/api/auth/register').send({name,email:`${name}@example.test`,password}).expect(201)).body;
  const a=await register('Alpha'), b=await register('Beta');
  const auth={Authorization:`Bearer ${a.access_token}`}, other={Authorization:`Bearer ${b.access_token}`};
  await check('Cadastro/login rejeitam senhas truncáveis e multibyte', async()=>{
   for(const password of ['a'.repeat(72)+'X','a'.repeat(72)+'Y','é'.repeat(37)]) {
    await api.post('/api/auth/register').send({name:'Long',email:'long@example.test',password}).expect(400);
    await api.post('/api/auth/login').send({email:a.user.email,password}).expect(400);
    await api.post('/api/users').set(auth).send({name:'Long',email:'long@example.test',passwordHash:password}).expect(400);
    await api.post('/api/auth/reset-password').send({token:'a'.repeat(64),password}).expect(400);
   }
   const exact=await register('Boundary','é'.repeat(36));
   await api.post('/api/auth/login').send({email:exact.user.email,password:'é'.repeat(36)}).expect(201);
  });
  await check('Hash legado autentica; senha errada e excesso de bytes são recusados',async()=>{
   const legacy=await db.user.create({data:{name:'Legacy',email:'legacy@example.test',passwordHash:await bcrypt.hash('Legacy-password-123',10)}});
   await api.post('/api/auth/login').send({email:legacy.email,password:'Legacy-password-123'}).expect(201);
   await api.post('/api/auth/login').send({email:legacy.email,password:'errada'}).expect(401);
   await db.user.update({where:{id:legacy.id},data:{passwordHash:await bcrypt.hash('a'.repeat(72)+'X',10)}});
   for(const suffix of ['X','Y']) await api.post('/api/auth/login').send({email:legacy.email,password:'a'.repeat(72)+suffix}).expect(400);
  });
  const created=(await api.post('/api/users').set(auth).send({name:'Created',email:'created@example.test',passwordHash:'Senha-teste-123'}).expect(201)).body;
  await check('Conta criada aparece após nova consulta, sem vazar para outro treinador',async()=>{
   const list=(await api.get('/api/users').set(auth).expect(200)).body;
   assert.deepEqual(new Set(list.map(u=>u.id)),new Set([a.user.sub,created.id]));
   assert.ok(list.every(u=>!('passwordHash' in u)&&!('createdById' in u)));
   const isolated=(await api.get('/api/users').set(other).expect(200)).body;
   assert.deepEqual(isolated.map(u=>u.id),[b.user.sub]);
   await api.put(`/api/users/${created.id}`).set(auth).send({name:'Forbidden'}).expect(403);
   await api.delete(`/api/users/${created.id}`).set(auth).expect(403);
   await api.post('/api/users').set(auth).send({name:'Spoof',email:'spoof@example.test',passwordHash:'Senha-teste-123',createdById:b.user.sub}).expect(400);
  });
  await check('Duplicidade de email é 409 na criação e edição; atualização é atômica',async()=>{
   await api.post('/api/users').set(auth).send({name:'Duplicate',email:b.user.email,passwordHash:'Senha-teste-123'}).expect(409);
   await api.put(`/api/users/${a.user.sub}`).set(auth).send({name:'Nao deve salvar',email:b.user.email}).expect(409);
   assert.equal((await db.user.findUnique({where:{id:a.user.sub}})).name,'Alpha');
  });
  await check('Nome consistente em users, profiles e ranking',async()=>{
   await api.put(`/api/users/${a.user.sub}`).set(auth).send({name:' Nome Consistente '}).expect(200);
   let me=(await api.get('/api/profiles/me').set(auth).expect(200)).body;
   assert.equal(me.name,'Nome Consistente'); assert.equal(me.profile.trainerName,me.name); assert.equal(me.profile.fullName,me.name);
   await api.put(`/api/profiles/${me.profile.id}`).set(auth).send({fullName:'Nome Perfil',birthDate:'2000-02-29'}).expect(200);
   me=(await api.get('/api/profiles/me').set(auth)).body;
   assert.equal(me.name,'Nome Perfil');assert.equal(me.profile.trainerName,'Nome Perfil');
   const ranking=(await api.get('/api/leaderboard').expect(200)).body;
   assert.equal(ranking.find(t=>t.userId===a.user.sub).trainerName,'Nome Perfil');
  });
  const pokemon=await db.pokemon.create({data:{name:'fixture-audit-only',pokedexNumber:999999,type:'normal'}});
  const captures=[];
  await check('Capturas persistem com data curta e timestamp; datas impossíveis retornam 400',async()=>{
   for(let i=0;i<7;i++) captures.push((await api.post('/api/captured-pokemon').set(auth).send({pokemonId:pokemon.id,level:5,captureDate:'2026-11-05'}).expect(201)).body.id);
   await api.patch(`/api/captured-pokemon/${captures[0]}`).set(auth).send({captureDate:'2026-11-06',nickname:'Editado',level:20}).expect(200);
   let capture=(await api.get(`/api/captured-pokemon/${captures[0]}`).set(auth).expect(200)).body;
   assert.equal(capture.captureDate,'2026-11-06T12:00:00.000Z');assert.equal(capture.nickname,'Editado');
   await api.patch(`/api/captured-pokemon/${captures[0]}`).set(auth).send({captureDate:'2026-11-07T18:00:00Z'}).expect(200);
   for(const value of ['2026-02-30','2025-02-29',null,'invalida']) {
    await api.patch(`/api/captured-pokemon/${captures[0]}`).set(auth).send({captureDate:value}).expect(400);
    await api.post('/api/captured-pokemon').set(auth).send({pokemonId:pokemon.id,captureDate:value}).expect(400);
   }
   for(const field of ['level','isFavorite']) await api.patch(`/api/captured-pokemon/${captures[0]}`).set(auth).send({[field]:null}).expect(400);
   await api.get(`/api/captured-pokemon/${captures[0]}`).set(other).expect(404);
   await api.patch(`/api/captured-pokemon/${captures[0]}`).set(other).send({nickname:'Forbidden'}).expect(404);
   await api.delete(`/api/captured-pokemon/${captures[0]}`).set(other).expect(404);
  });
  let team;
  await check('Equipes validam nome, booleanos, duplicatas, propriedade e seis integrantes',async()=>{
   for(const name of ['','   ']) await api.post('/api/teams').set(auth).send({name}).expect(400);
   for(const isActive of [null,'true',1]) await api.post('/api/teams').set(auth).send({name:'Equipe',isActive}).expect(400);
   team=(await api.post('/api/teams').set(auth).send({name:'  Equipe A  ',isActive:true,capturedPokemonIds:captures.slice(0,6)}).expect(201)).body;
   assert.equal(team.name,'Equipe A');
   for(const isActive of [null,'false',0]) await api.patch(`/api/teams/${team.id}`).set(auth).send({name:'Equipe A',isActive}).expect(400);
   for(const ids of [captures,[captures[0],captures[0]]]) await api.patch(`/api/teams/${team.id}`).set(auth).send({name:'Equipe A',capturedPokemonIds:ids}).expect(400);
   await api.post(`/api/teams/${team.id}/pokemon`).set(auth).send({capturedPokemonId:captures[6],position:6}).expect(400);
   await api.post('/api/teams').set(other).send({name:'Foreign',capturedPokemonIds:[captures[0]]}).expect(404);
   await api.get(`/api/teams/${team.id}`).set(other).expect(404);
   await api.patch(`/api/teams/${team.id}`).set(other).send({name:'Foreign'}).expect(404);
   await api.delete(`/api/teams/${team.id}`).set(other).expect(404);
   const second=(await api.post('/api/teams').set(auth).send({name:'Equipe B',isActive:true}).expect(201)).body;
   assert.equal(await db.team.count({where:{userId:a.user.sub,isActive:true}}),1);
   await api.patch(`/api/teams/${team.id}`).set(auth).send({name:'Equipe atualizada',isActive:true,capturedPokemonIds:[captures[0],captures[6]]}).expect(200);
   const persisted=(await api.get(`/api/teams/${team.id}`).set(auth).expect(200)).body;
   assert.equal(persisted.teamPokemon.length,2);assert.equal(persisted.isActive,true);
   await api.delete(`/api/teams/${second.id}`).set(auth).expect(200);
  });
  await check('Exclusão em cascade, progressão e revogação de conta excluída',async()=>{
   await api.delete(`/api/captured-pokemon/${captures[0]}`).set(auth).expect(200);
   assert.equal(await db.teamPokemon.count({where:{teamId:team.id}}),1);
   await api.get(`/api/captured-pokemon/${captures[0]}`).set(auth).expect(404);
   await api.delete(`/api/teams/${team.id}`).set(auth).expect(200);
   await api.get(`/api/teams/${team.id}`).set(auth).expect(404);
   const progress=(await api.get('/api/progression/me').set(auth).expect(200)).body;
   assert.equal(progress.pokemonCaptured,6);assert.equal(progress.experience,110);
   await api.delete(`/api/users/${a.user.sub}`).set(auth).expect(200);
   assert.equal(await db.profile.count({where:{userId:a.user.sub}}),0);
   assert.equal((await db.user.findUnique({where:{id:created.id}})).createdById,null);
   await api.get('/api/users').set(auth).expect(401);
  });
  if(process.argv.includes('--live')) {
   await check('PokéAPI real: catálogo, detalhes, evoluções e sincronização',async()=>{
    const catalog=(await api.get('/api/pokemon?source=pokeapi&search=25&type=electric').expect(200)).body;
    assert.equal(catalog.results[0].name,'pikachu');
    const details=(await api.get('/api/pokemon/25').expect(200)).body;
    assert.equal(details.stats.length,6);assert.ok(details.evolutions.some(p=>p.name==='raichu'));
    assert.equal(details.evolutions.find(p=>p.name==='raichu').evolvesFrom,'pikachu');
    const branched=(await api.get('/api/pokemon/eevee').expect(200)).body;
    for(const name of ['vaporeon','jolteon','flareon']) assert.equal(branched.evolutions.find(p=>p.name===name).evolvesFrom,'eevee');
    const synced=(await api.post('/api/pokemon/sync/25').set(other).expect(201)).body;
    assert.equal(synced.pokedexNumber,25);
   });
  }
 } finally {
  await app.close();
  fs.writeFileSync(path.join(output,'regressoes-http.json'),JSON.stringify({results,liveRequested:process.argv.includes('--live'),database:target},null,2));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
