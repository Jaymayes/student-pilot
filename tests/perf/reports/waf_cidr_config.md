# WAF CIDR Configuration
**RUN_ID**: CEOSPRINT-20260120-EXEC-ZT3G-GATE2-STABILIZE-033

## Trusted Ingress CIDRs
| CIDR | Purpose |
|------|---------|
| 35.184.0.0/13 | GCP us-central1 (primary) - **NEW** |
| 35.192.0.0/12 | GCP us-central1 |
| 35.224.0.0/12 | GCP us-central1 |
| 34.0.0.0/8 | GCP global |
| 136.0.0.0/8 | Additional cloud infra |
| 10.0.0.0/8 | Private RFC1918 (internal) |
| 172.16.0.0/12 | Private RFC1918 (internal) |
| 192.168.0.0/16 | Private RFC1918 (internal) |

## Trusted Internals
| CIDR | Purpose |
|------|---------|
| 127.0.0.1/32 | IPv4 localhost |
| ::1/128 | IPv6 localhost |

## Trust-by-Secret Telemetry Paths
- /api/telemetry/ingest
- /telemetry/ingest
- /events
- /api/events

## Verification
All S2S requests from ecosystem apps (A1-A8) should originate from trusted CIDRs and include valid shared secret header.
