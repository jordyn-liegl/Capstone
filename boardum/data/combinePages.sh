#!/bin/bash

# Output file
output_file="all_data.json"

# Start the JSON array
echo "[" > "$output_file"

# Find and process all page_#.json files
first=true
for file in page_*.json; do
    if [ -f "$file" ]; then
        # Add a comma if it's not the first file
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$output_file"
        fi
        # Append the file content without trailing newlines
        cat "$file" >> "$output_file"
    fi
done

# End the JSON array
echo "]" >> "$output_file"

echo "Combined JSON saved to $output_file"
