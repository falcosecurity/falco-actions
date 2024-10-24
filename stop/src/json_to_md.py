import json
import os
import sys
import click

# Transform generic JSON objects to Markdown tables
@click.command()
@click.argument('file_input', type=click.Path(exists=True))
def main(file_input):

    with open(file_input, 'r') as f:
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