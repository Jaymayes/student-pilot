#!/bin/bash
# Cleanup script for simulated_audit namespace data
# TTL: 14 days from 2026-01-05
# Run after 2026-01-19 to remove audit data

echo "Cleanup of simulated_audit namespace"
echo "This script would remove all events with namespace=simulated_audit"
echo "NOTE: Actual cleanup requires A8 database access"
