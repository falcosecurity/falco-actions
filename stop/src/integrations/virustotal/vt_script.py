import json
import requests
import click
import os
import sys

# Set up API keys. If it stops working, free credits are probably finished for my account.
vt_api_key = os.environ['VT_API_KEY']
vt_api_url = 'https://www.virustotal.com/api/v3/'
##### END OF SET UP #####

#### INITIALIZE API FUNCTIONS #####
ip_reputation_data = {}


def get_vt_ip_info(ip_address, vt_api_key, mode):
    if mode == "ips":
        url = f"{vt_api_url}ip_addresses/{ip_address}"
    elif mode == "hashes":
        url = f"{vt_api_url}files/{ip_address}"
    else:
        print("Mode not specified", file=sys.stderr)
        exit(0)
    headers = {'x-apikey': vt_api_key}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        json_response = response.json()
        return json_response
    except requests.exceptions.HTTPError as http_err:
        if response.status_code == 401:
            print(f'Authentication error: {http_err}', file=sys.stderr)
        elif response.status_code == 404:
            print(f'IoC not found: {http_err}', file=sys.stderr)
        return ""
    except Exception as err:
        print(f'Virustotal error: {err}', file=sys.stderr)
        return ""


def find_reputation(ioc,mode):
    if ioc:
        if ioc not in ip_reputation_data:
            vt_info = get_vt_ip_info(ioc, vt_api_key, mode)
            if vt_info:
                malicious=vt_info.get('data', {}).get('attributes', {}).get('last_analysis_stats', {}).get('malicious', 'Unknown')
                suspicious=vt_info.get('data', {}).get('attributes', {}).get('last_analysis_stats', {}).get('suspicious', 'Unknown')
                if malicious < 3 and suspicious < 3:
                    ip_reputation_data[ioc]="Clean"
                    return "Clean"
                else:
                    ip_reputation_data[ioc]="Suspicious"
                    return "Suspicious"
            else:
                ip_reputation_data[ioc]="Unknown"
                return "Unknown"
        else:
            return ip_reputation_data[ioc]
    else:
        print("No IoC found", file=sys.stderr)
        exit(0)

@click.command()
@click.argument('input_file', type=click.Path(exists=True))
@click.option('--mode', type=click.STRING, required=False)
def main(input_file, mode):

    with open(input_file, 'r') as file:
    # Loop through each line in the file
        for line in file:
        # Parse the line as a JSON object
            data = json.loads(line)
            # Extract the fd.sip field (IP address)
            if mode == "ips":
                ioc = data.get("fd.sip")
            elif mode == "hashes":
                ioc = data.get("sha256")
            else:
                print("Mode not specified, exiting", file=sys.stderr)
                exit(0)          
            data['reputation'] = find_reputation(ioc, mode)
            print(json.dumps(data))

if __name__ == "__main__":
    main()
