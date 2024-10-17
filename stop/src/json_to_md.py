import argparse
import json
import os
import sys

# Transform generic JSON objects to Markdown tables

def main():
    parser = argparse.ArgumentParser(description="Convert JSON objects to a Markdown table.")
    parser.add_argument('file', type=str, help='Path to the file containing the JSON objects, one per line')
    args = parser.parse_args()

    # Check if the file exists and its size is greater than 0
    if not os.path.isfile(args.file):
        print(f"File '{args.file}' does not exist. Nothing to do.", file=sys.stderr)
        print("Exiting ...", file=sys.stderr)
        exit(0)
    
    if os.path.getsize(args.file) == 0:
        print(f"File '{args.file}' is empty. Nothing to do.", file=sys.stderr)
        print("Exiting ...", file=sys.stderr)
        exit(0)

    with open(args.file, 'r') as f:
        lines = f.readlines()

    # Parse the first line to get the headers of the table (keys)
    try:
        first_json = json.loads(lines[0].strip())
        headers = list(first_json.keys())
    except Exception as e:
        print(f"Error parsing JSON header: {e}", file=sys.stderr)
        print("Exiting ...", file=sys.stderr)
        exit(1)

    # Create the markdown table header
    output = []
    output.append("| " + " | ".join(headers) + " |")
    output.append("| " + " | ".join(["---"] * len(headers)) + " |")

    # Iterate through all the lines and add the values to the table
    for line in lines:
        try:
            json_obj = json.loads(line.strip())
            row = "| " + " | ".join(str(json_obj[key]) for key in headers) + " |"
            output.append(row)
        except Exception as e:
            print(f"Error parsing JSON: {e}", file=sys.stderr)
            print("Exiting ...", file=sys.stderr)
            exit(1)

    for line in output:
        print(line)

if __name__ == "__main__":
    main()