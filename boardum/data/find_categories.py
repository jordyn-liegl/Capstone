import json
from collections import defaultdict

# Load the JSON data
with open("all_data.json", "r") as file:
    data = json.load(file)

# Dictionary to count occurrences of each mechanism
mechanism_count = defaultdict(int)
category_count = defaultdict(int)

for sublist in data:  # Assuming the outer list contains sublists
    for entry in sublist:  # Iterate through each entry in the sublist
        if isinstance(entry, dict):  # Ensure entry is a dictionary
            game_id = entry.get("id")  # Get the game ID
            categories = entry.get("categories", [])
            mechanics = entry.get("mechanics", [])
            
            for category in categories:
                category_count[category] += 1
            
            for mechanism in mechanics:
                mechanism_count[mechanism] += 1
                
# Convert sets to lists for better readability
# Create the category summary with labels
category_summary = [{"category": k, "count": v} for k, v in category_count.items()]

# Sort the category summary by count in descending order and get the top 10
sorted_category_summary = sorted(category_summary, key=lambda x: x["count"], reverse=True)[:10]

# Create the mechanism summary with labels
mechanism_summary = [{"mechanism": k, "count": v} for k, v in mechanism_count.items()]

# Sort the mechanism summary by count in descending order and get the top 10
sorted_mechanism_summary = sorted(mechanism_summary, key=lambda x: x["count"], reverse=True)[:10]

# Print the results
print("Top 10 Categories:")
print(json.dumps(sorted_category_summary, indent=2))
print("\nTop 10 Mechanics:")
print(json.dumps(sorted_mechanism_summary, indent=2))