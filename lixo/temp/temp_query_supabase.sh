#!/bin/bash
# Script para fazer queries no Supabase via API

SUPABASE_URL="https://yrvorowhddgmwcxrovkg.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlydm9yb3doZGRnbXdjeHJvdmtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MTY5NCwiZXhwIjoyMDg4NzI3Njk0fQ.0rrEB9SvEtSi5p2-iLK1jGXWAM6kRgtKkghvf2U3MPI"

# Query para buscar pacientes específicos
curl -X POST "$SUPABASE_URL/rest/v1/rpc/search_patients_queue" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"search_term": "Natali Simoes"}'

echo ""
