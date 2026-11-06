-- Vínculo opcional: registros anteriores continuam sem criador atribuído.
ALTER TABLE "User" ADD COLUMN "createdById" INTEGER REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "User_createdById_idx" ON "User"("createdById");
