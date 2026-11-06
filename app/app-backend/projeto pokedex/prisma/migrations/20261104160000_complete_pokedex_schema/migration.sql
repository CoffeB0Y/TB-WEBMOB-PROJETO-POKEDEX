-- Expansao aditiva: preserva User, Profile e seus registros.
CREATE TABLE "Pokemon" (
 "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
 "name" TEXT NOT NULL, "pokedexNumber" INTEGER NOT NULL,
 "type" TEXT NOT NULL, "type2" TEXT, "height" REAL, "weight" REAL,
 "ability" TEXT, "description" TEXT, "evolution" TEXT,
 "legendary" BOOLEAN NOT NULL DEFAULT false, "spriteUrl" TEXT, "cryUrl" TEXT
);
CREATE UNIQUE INDEX "Pokemon_name_key" ON "Pokemon"("name");
CREATE UNIQUE INDEX "Pokemon_pokedexNumber_key" ON "Pokemon"("pokedexNumber");
ALTER TABLE "Profile" ADD COLUMN "trainerName" TEXT;
ALTER TABLE "Profile" ADD COLUMN "region" TEXT;
ALTER TABLE "Profile" ADD COLUMN "trainerLevel" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Profile" ADD COLUMN "favoritePokemonId" INTEGER REFERENCES "Pokemon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "CapturedPokemon" (
 "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
 "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "pokemonId" INTEGER NOT NULL REFERENCES "Pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "nickname" TEXT, "level" INTEGER NOT NULL DEFAULT 1,
 "captureDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "captureLocation" TEXT, "isFavorite" BOOLEAN NOT NULL DEFAULT false,
 "hp" INTEGER, "attack" INTEGER, "defense" INTEGER, "specialAttack" INTEGER,
 "specialDefense" INTEGER, "speed" INTEGER,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "Team" (
 "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
 "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "name" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "TeamPokemon" (
 "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
 "teamId" INTEGER NOT NULL REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "capturedPokemonId" INTEGER NOT NULL REFERENCES "CapturedPokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "position" INTEGER NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "TeamPokemon_teamId_position_key" ON "TeamPokemon"("teamId", "position");
CREATE UNIQUE INDEX "TeamPokemon_teamId_capturedPokemonId_key" ON "TeamPokemon"("teamId", "capturedPokemonId");
CREATE TABLE "Badge" (
 "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
 "name" TEXT NOT NULL, "region" TEXT NOT NULL, "description" TEXT, "badgeNumber" INTEGER NOT NULL
);
CREATE UNIQUE INDEX "Badge_region_badgeNumber_key" ON "Badge"("region", "badgeNumber");
CREATE TABLE "TrainerBadge" (
 "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
 "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "badgeId" INTEGER NOT NULL REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "obtainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "TrainerBadge_userId_badgeId_key" ON "TrainerBadge"("userId", "badgeId");

ALTER TABLE "Profile" ADD COLUMN "username" TEXT;
ALTER TABLE "Profile" ADD COLUMN "bio" TEXT;
CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");
ALTER TABLE "CapturedPokemon" ADD COLUMN "notes" TEXT;
ALTER TABLE "Team" ADD COLUMN "description" TEXT;
