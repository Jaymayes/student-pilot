# DataService Migrations

**Service**: scholar-dataservice  
**Version**: 2.0.0  
**Date**: 2026-01-21

## Schema Extensions

### 1. Providers Table

```sql
CREATE TABLE providers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  type provider_type NOT NULL,
  ein VARCHAR,
  contact_email VARCHAR,
  is_verified BOOLEAN DEFAULT false,
  is_ferpa_covered BOOLEAN DEFAULT false,
  do_not_sell BOOLEAN DEFAULT false,
  privacy_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TYPE provider_type AS ENUM ('school', 'foundation', 'corporate');
```

### 2. Events Table

```sql
CREATE TABLE events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR NOT NULL,
  entity_type VARCHAR NOT NULL,
  entity_id VARCHAR NOT NULL,
  actor_id VARCHAR,
  payload JSONB,
  trace_id VARCHAR,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_trace ON events(trace_id);
```

### 3. Audit Trail Table

```sql
CREATE TABLE audit_trail (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  action audit_action NOT NULL,
  entity_type VARCHAR NOT NULL,
  entity_id VARCHAR NOT NULL,
  actor_id VARCHAR NOT NULL,
  actor_type VARCHAR NOT NULL,
  actor_ip VARCHAR,
  changes JSONB,
  ferpa_access BOOLEAN DEFAULT false,
  request_id VARCHAR,
  correlation_id VARCHAR,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE');
CREATE INDEX idx_audit_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_ferpa ON audit_trail(ferpa_access);
```

### 4. User Privacy Fields

```sql
ALTER TABLE users ADD COLUMN do_not_sell BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN privacy_mode BOOLEAN DEFAULT false;
```

## Migration Status

| Table | Status | Rows |
|-------|--------|------|
| providers | ✅ Created | 0 |
| events | ✅ Created | 0 |
| audit_trail | ✅ Created | 0 |
| users (privacy fields) | ✅ Extended | - |

## Rollback Procedure

```sql
DROP TABLE IF EXISTS audit_trail;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS providers;
DROP TYPE IF EXISTS audit_action;
DROP TYPE IF EXISTS provider_type;
ALTER TABLE users DROP COLUMN IF EXISTS do_not_sell;
ALTER TABLE users DROP COLUMN IF EXISTS privacy_mode;
```
