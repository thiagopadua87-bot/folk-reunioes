ALTER TABLE clientes_perdidos
  ADD COLUMN winner_competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL;
