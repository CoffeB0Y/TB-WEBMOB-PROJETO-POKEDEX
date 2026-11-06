import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PokemonModule } from './pokemon/pokemon.module';
import { CapturedPokemonModule } from './captured-pokemon/captured-pokemon.module';
import { DatabaseModule } from './database/database.module';
import { TeamsModule } from './teams/teams.module';
import { BadgesModule } from './badges/badges.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
@Module({
  imports: [
    //adicionado aqui global o configModule
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    ProfilesModule,
    PokemonModule,
    CapturedPokemonModule,
    DatabaseModule,
    TeamsModule,
    BadgesModule,
    LeaderboardModule,
    AuthModule,
  ], //conectar sub modulos
  controllers: [],
  providers: [],
})
export class AppModule {}
