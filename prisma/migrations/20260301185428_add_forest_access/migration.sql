-- CreateTable
CREATE TABLE "_ForestAccess" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ForestAccess_AB_unique" ON "_ForestAccess"("A", "B");

-- CreateIndex
CREATE INDEX "_ForestAccess_B_index" ON "_ForestAccess"("B");

-- AddForeignKey
ALTER TABLE "_ForestAccess" ADD CONSTRAINT "_ForestAccess_A_fkey" FOREIGN KEY ("A") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ForestAccess" ADD CONSTRAINT "_ForestAccess_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
