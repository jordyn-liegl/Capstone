#!/bin/bash

output_file="combined.ndjson"

# Clear the output file if it already exists
> "$output_file"

# Loop through all JSON files matching "page_#.json" in sorted order
for file in $(ls page_*.json | sort -V); do
        # Process each JSON object individually
    jq -c '.[]' "$file" | while read -r line; do
        # Extract the "id" field from the JSON object
        game_id=$(echo "$line" | jq -r '.id')
        
        # Write the Elasticsearch index line
        echo "{\"index\":{\"_index\":\"boardgames\",\"_id\":\"$game_id\"}}" >> "$output_file"
        
        # Write the actual JSON object
        echo "$line" >> "$output_file"
    done
done

echo "Combined JSON files into $output_file"
