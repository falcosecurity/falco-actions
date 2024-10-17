import click
from openairequests import OpenAIRequest


def propose_update_for_rule(report_file_content, model, comment):
    try:
        summary = OpenAIRequest(report_file_content, model, comment).generate_description()
        return summary
    except Exception as e:
        raise RuntimeError(f"Error generating summary: {e}")

@click.command()
@click.argument('report_file', type=click.Path(exists=True))
@click.option('--model', type=click.STRING, required=False)
@click.option('--user_input', type=click.STRING, required=False)
def main(report_file, model, user_input):
    try:
        # Read the entire content of the rule file
        with open(report_file, 'r') as file:
            report_file_content = file.read()

        if not report_file_content.strip():
            raise ValueError("The report file is empty. Please provide a valid report file with content.")

    except FileNotFoundError:
        raise click.ClickException(f"The file '{report_file}' was not found.")
    except IOError as e:
        raise click.ClickException(f"Error reading file '{report_file}': {e}")
    except ValueError as ve:
        raise click.ClickException(str(ve))

    try:
        summary = propose_update_for_rule(report_file_content, model, user_input)
        print(summary)
    except RuntimeError as re:
        raise click.ClickException(str(re))



if __name__ == '__main__':
    try:
        main()
    except click.ClickException as ce:
        click.echo(f"Error: {ce}")
        exit(1)

