-- Enable required extensions for dateChain.
-- postgis: geo-based discovery (ST_DWithin on geography).
-- uuid-ossp / pgcrypto: UUID primary keys and hashing helpers.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
