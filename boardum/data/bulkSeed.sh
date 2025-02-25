#!/bin/sh

# Wait for Elasticsearch to be available
echo "Waiting for Elasticsearch..."
until curl -s http://elasticsearch:9200 > /dev/null; do
  sleep 5
done

echo "Elasticsearch is up, seeding data..."

# Delete the old index if it exists
curl -X DELETE "http://elasticsearch:9200/boardgames"

# Bulk import the seed data
curl -X POST "http://elasticsearch:9200/_bulk" \
     -H "Content-Type: application/x-ndjson" \
     --data-binary "@/data/combined.ndjson"

echo "Data seeding complete!"
