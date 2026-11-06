const assert=require('node:assert/strict');
const {tmpdir}=require('node:os');const {realpathSync}=require('node:fs');const {sep}=require('node:path');
const {resolve}=require('node:path');
if (!process.env.DATABASE_URL?.startsWith('file:') || resolve(process.env.DATABASE_URL.slice(5)).toLowerCase()!==resolve(__dirname,'../.verification/test.db').toLowerCase()) throw new Error('Use exclusivamente .verification/test.db para verificacao.');
const {PokeApiService}=require('../dist/src/pokemon/pokeapi.service');
const {PokemonService}=require('../dist/src/pokemon/pokemon.service');
const {PrismaService}=require('../dist/src/database/prisma.service');
(async()=>{const db=new PrismaService();try {
 const external=new PokeApiService(), service=new PokemonService(external,db);
 const catalog=await external.getCatalog('pikachu','electric','number',1);assert.equal(catalog.results[0].pokedexNumber,25);
 const descending=await external.getCatalog('','','number-desc',1);assert.equal(descending.results[0].pokedexNumber,151);
 const alphabetical=await external.getCatalog('','','name',1);assert.equal(alphabetical.results[0].name,'abra');
 const secondPage=await external.getCatalog('','','number',2);assert.equal(secondPage.results[0].pokedexNumber,13);
 const details=await external.getDetails('25');assert.equal(details.name,'pikachu');assert.equal(details.stats.length,6);assert.ok(details.description);assert.ok(details.evolutions.some(item=>item.name==='raichu'));assert.ok(details.spriteUrl);
 const local=await service.syncPokemon('25');assert.equal(local.pokedexNumber,25);
 const combined=await service.findOne('pikachu');assert.equal(combined.id,local.id);assert.equal(combined.pokedexNumber,25);
 console.log('PASS PokeAPI REAL: catalogo, tipo eletrico, detalhes, seis stats, descricao, evolucoes, imagem e correspondencia do ID local.');
}finally{await db.$disconnect();}})().catch(error=>{console.error(error.message);process.exitCode=1;});
