-- Move EUDR reference from TransportTicket level to TimberSale level
ALTER TABLE "TimberSale" ADD COLUMN IF NOT EXISTS "eudrReference" TEXT;
