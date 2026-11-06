// Executar somente com banco descartavel em TEMP.
const assert = require('node:assert/strict');
const {tmpdir} = require('node:os');
const {realpathSync}=require('node:fs'); const {sep}=require('node:path');
const {resolve}=require('node:path');
if (!process.env.DATABASE_URL?.startsWith('file:') || resolve(process.env.DATABASE_URL.slice(5)).toLowerCase()!==resolve(__dirname,'../.verification/test.db').toLowerCase()) throw new Error('Use exclusivamente .verification/test.db para verificacao.');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const request = require('supertest');
const { AppModule } = require('../dist/src/app.module');
const { BadgesService } = require('../dist/src/badges/badges.service');
const { PrismaService } = require('../dist/src/database/prisma.service');
(async () => {
 const app = await NestFactory.create(AppModule, { logger: false });
 app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ whitelist:true, forbidNonWhitelisted:true, transform:true }));
 await app.init(); const api=request(app.getHttpServer()); const db=app.get(PrismaService);
 try {
  const suffix=Date.now(); const auth = token => ({Authorization:`Bearer ${token}`});
  async function register(name) { const r=await api.post('/api/auth/register').send({name,email:`${name}${suffix}@example.com`,password:'test-password-123'}).expect(201); assert.ok(r.body.access_token); assert.equal(JSON.stringify(r.body).includes('passwordHash'),false); return {token:r.body.access_token,id:r.body.user.sub}; }
  const a=await register('TrainerA'), b=await register('TrainerB');
  const session=await api.post('/api/auth/login').set('Origin','http://localhost:3001').send({email:`TrainerA${suffix}@example.com`,password:'test-password-123',rememberMe:true}).expect(201);
  const cookie=session.headers['set-cookie'][0]; assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Max-Age=86400/);
  const cookiePair=cookie.split(';')[0];
  await api.get('/api/auth/session').set('Cookie',cookiePair).expect(200).then(r=>assert.equal(r.body.user.id,a.id));
  await api.put('/api/profiles/me').set('Cookie',cookiePair).set('Origin','https://attacker.invalid').send({bio:'CSRF'}).expect(403);
  await api.post('/api/auth/logout').set('Cookie',cookiePair).set('Origin','http://localhost:3001').expect(201).then(r=>assert.match(r.headers['set-cookie'][0],/Expires=Thu, 01 Jan 1970/));
  await api.get('/api/auth/session').expect(401);
  await api.put('/api/profiles/me').set(auth(a.token)).send({trainerName:'TrainerA',email:`TrainerA${suffix}@example.com`,bio:'Persisted bio',username:`trainer${suffix}`}).expect(200);
  await api.get('/api/profiles/me').set(auth(a.token)).expect(200).then(r=>assert.equal(r.body.profile.bio,'Persisted bio'));
  await api.patch('/api/teams/0').set(auth(a.token)).send({name:'Must not create'}).expect(404);
  await api.get('/api/teams/invalid').set(auth(a.token)).expect(400);
  assert.equal(await db.team.count({where:{userId:a.id}}),0);
  await api.get('/api/users?next=/auth/login').expect(401);
  await api.get('/api/users').set(auth(a.token)).expect(200).then(r=>assert.deepEqual(r.body.map(u=>u.id),[a.id]));
  await api.put(`/api/users/${b.id}`).set(auth(a.token)).send({name:'Other trainer'}).expect(403);
  await api.put('/api/profiles/me').set(auth(b.token)).send({trainerName:'TrainerB',email:`TrainerB${suffix}@example.com`,username:`trainer${suffix}`}).expect(409);
  const profile=await db.profile.findUnique({where:{userId:b.id}}); assert.ok(profile);
  await api.get(`/api/profiles/${profile.id}`).set(auth(a.token)).expect(404);
  await api.put(`/api/profiles/${profile.id}`).set(auth(a.token)).send({fullName:'Unauthorized'}).expect(404);
  await api.post('/api/auth/login').send({email:`TrainerA${suffix}@example.com`,password:'wrong'}).expect(401);
  await api.post('/api/auth/login').send({email:`TrainerA${suffix}@example.com`,password:'test-password-123'}).expect(201);
  await api.post('/api/auth/register').send({name:'Bad',email:'invalid',password:'1'}).expect(400);
  // Fixture exclusiva de teste, nunca utilizada pelo frontend ou sincronizacao.
  const pokemon=await db.pokemon.create({data:{name:`integration-${suffix}`,pokedexNumber:1000000+Number(String(suffix).slice(-8)),type:'normal'}});
  await api.get('/api/pokemon').expect(200);
  await api.post('/api/captured-pokemon').set(auth(a.token)).send({pokemonId:pokemon.id,level:101}).expect(400);
  const captures=[];
  for(let i=0;i<7;i++) captures.push((await api.post('/api/captured-pokemon').set(auth(a.token)).send({pokemonId:pokemon.id,level:5}).expect(201)).body.id);
  await api.get('/api/captured-pokemon').set(auth(b.token)).expect(200).then(r=>assert.equal(r.body.length,0));
  await api.get(`/api/captured-pokemon/${captures[0]}`).set(auth(b.token)).expect(404);
  await api.patch(`/api/captured-pokemon/${captures[0]}`).set(auth(a.token)).send({userId:b.id}).expect(400);
  await api.patch(`/api/captured-pokemon/${captures[0]}`).set(auth(a.token)).send({nickname:'Updated capture',level:20,notes:'Persisted notes'}).expect(200);
  await api.get(`/api/captured-pokemon/${captures[0]}`).set(auth(a.token)).expect(200).then(r=>{assert.equal(r.body.nickname,'Updated capture');assert.equal(r.body.level,20);});
  await api.patch(`/api/captured-pokemon/${captures[0]}`).set(auth(b.token)).send({nickname:'Unauthorized'}).expect(404);
  await api.delete(`/api/captured-pokemon/${captures[0]}`).set(auth(b.token)).expect(404);
  const team=(await api.post('/api/teams').set(auth(a.token)).send({name:'Test team'}).expect(201)).body;
  for(let i=0;i<6;i++) await api.post(`/api/teams/${team.id}/pokemon`).set(auth(a.token)).send({capturedPokemonId:captures[i],position:i+1}).expect(201);
  await api.post(`/api/teams/${team.id}/pokemon`).set(auth(a.token)).send({capturedPokemonId:captures[6],position:6}).expect(400);
  await api.get(`/api/teams/${team.id}`).set(auth(b.token)).expect(404);
  await api.patch(`/api/teams/${team.id}`).set(auth(a.token)).send({name:'Too many',capturedPokemonIds:captures}).expect(400);
  await api.patch(`/api/teams/${team.id}`).set(auth(b.token)).send({name:'Unauthorized'}).expect(404);
  const otherTeam=(await api.post('/api/teams').set(auth(b.token)).send({name:'Other team'}).expect(201)).body;
  await api.post(`/api/teams/${otherTeam.id}/pokemon`).set(auth(b.token)).send({capturedPokemonId:captures[0],position:1}).expect(404);
  await api.get('/api/progression/me').set(auth(a.token)).expect(200).then(r=>assert.equal(r.body.experience,120));
  await api.delete(`/api/captured-pokemon/${captures[0]}`).set(auth(a.token)).expect(200);
  await api.get('/api/progression/me').set(auth(a.token)).expect(200).then(r=>assert.equal(r.body.experience,110));
  await api.patch(`/api/teams/${team.id}`).set(auth(a.token)).send({name:'Updated team',capturedPokemonIds:[captures[6]],isActive:true}).expect(200);
  await api.get(`/api/teams/${team.id}`).set(auth(a.token)).expect(200).then(r=>{assert.equal(r.body.name,'Updated team');assert.equal(r.body.teamPokemon.length,1);assert.equal(r.body.teamPokemon[0].capturedPokemonId,captures[6]);});
  await api.delete(`/api/teams/${team.id}`).set(auth(b.token)).expect(404);
  await api.delete(`/api/teams/${team.id}/pokemon/${captures[6]}`).set(auth(a.token)).expect(200);
  await api.delete(`/api/teams/${team.id}`).set(auth(a.token)).expect(200);
  await api.get(`/api/teams/${team.id}`).set(auth(a.token)).expect(404);
  await api.get('/api/leaderboard').expect(200);
  // Limiares das oito regras existentes, com fixtures exclusivas de teste.
  const c=await register('BadgeTrainer'); const badgeService=app.get(BadgesService);
  const species=[];
  for(let number=1;number<=151;number++){
   const type=[1,2,3].includes(number)?'grass':[4,5,6].includes(number)?'fire':[7,8,9].includes(number)?'water':[25,26].includes(number)?'electric':'normal';
   species.push(await db.pokemon.upsert({where:{pokedexNumber:number},create:{name:`badge-fixture-${suffix}-${number}`,pokedexNumber:number,type},update:{}}));
  }
  const add=async ids=>db.capturedPokemon.createMany({data:ids.map(pokemonId=>({userId:c.id,pokemonId,level:5}))});
  await add([species[0].id,species[3].id,species[6].id,species[24].id]);await badgeService.evaluate(c.id);
  assert.equal(await db.trainerBadge.count({where:{userId:c.id}}),0);
  await add([species[0].id]);await badgeService.evaluate(c.id);assert.equal(await db.trainerBadge.count({where:{userId:c.id}}),1);
  // Duplicar uma espécie não conta como uma segunda espécie do tipo.
  await add([species[24].id]);await badgeService.evaluate(c.id);
  assert.equal((await badgeService.getProgress(c.id)).find(x=>x.badgeNumber===3).current,1);
  const already=new Set([1,4,7,25]);await add(species.filter(x=>!already.has(x.pokedexNumber)).map(x=>x.id));await badgeService.evaluate(c.id);
  assert.equal(await db.trainerBadge.count({where:{userId:c.id}}),7);
  const captureCount=await db.capturedPokemon.count({where:{userId:c.id}});await add(Array(254-captureCount).fill(species[0].id));await badgeService.evaluate(c.id);
  assert.equal((await badgeService.getProgress(c.id)).find(x=>x.badgeNumber===6).unlocked,false);
  await add([species[0].id]);await badgeService.evaluate(c.id);assert.equal(await db.trainerBadge.count({where:{userId:c.id}}),8);
  await api.get('/api/progression/me').set(auth(c.token)).expect(200).then(r=>{assert.equal(r.body.level,30);assert.equal(r.body.experience,2950);});
  await badgeService.evaluate(c.id);assert.equal(await db.trainerBadge.count({where:{userId:c.id}}),8);
  await db.capturedPokemon.deleteMany({where:{userId:c.id}});await badgeService.evaluate(c.id);assert.equal(await db.trainerBadge.count({where:{userId:c.id}}),8);
  console.log('PASS: oito regras de insígnias, espécies distintas, limiar de nível 30, idempotência e conquistas preservadas.');
  console.log('PASS: cadastro, login, perfil, isolamento, validacao, catalogo publico, capturas, equipes de seis e progressao.');
 } finally { await app.close(); }
})().catch(error=>{console.error(error.message);process.exitCode=1});
