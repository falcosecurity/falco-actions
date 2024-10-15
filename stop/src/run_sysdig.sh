#!/bin/bash

#
# This script runs sysdig as a docker container.
# The sysdig binary will be used to read a scap file and apply a filter or run chisels.
#
# The first argument is mandatory and must be either "filter" or "chisel".
#
# If "filter" is passed, the script expects the following arguments:
#     1. scap_file_name: The name of the scap file to read.
#     2. filter: The filter to apply.
#     3. output_fields: The fields to output.
#     4. output_file: The name of the file to save the output.
# The output file will be JSON formatted.
#
# If "chisel" is passed, the script expects the following arguments:
#     1. scap_file_name: The name of the scap file to read.
#     2. chisels_file_name: The name of the chisels file to run.
#     3. output_file: The name of the file to save the output.
#
# Everything regarding input and output files must be an absolute path to the /tmp directory of the host.

filter_or_chisel="$1"

if [ -z "$filter_or_chisel" ]; then
      echo "Error: No input provided. Please pass 'filter' or 'chisel'."
      echo "Sysdig is run as a docker container and all the outputs will be saved in the /tmp directory of the host."
      exit 1
fi

if [ "$filter_or_chisel" != "filter" ] && [ "$filter_or_chisel" != "chisel" ]; then
      echo "Error: Invalid first argument \"$filter_or_chisel\""
      echo "Must be either \"filter\" or \"chisel\""
      exit 1
fi

if [ "$filter_or_chisel" == "filter" ]; then
      # Ensure all the required arguments are provided
      scap_file_name="$2"
      filter="$3"
      output_fields="$4"
      output_file="$5"
      if [ -z "$scap_file_name" ] || [ -z "$filter" ] || [ -z "$output_fields" ] || [ -z "$output_file" ]; then
            echo "Error: Missing required arguments"
            echo "Usage: $0 filter <scap_file_name> <filter> <output_fields> <output_file>"
            exit 1
      fi

      # Ensure input and output files are in the /tmp directory
      if [[ "$scap_file_name" != /tmp/* ]] || [[ "$output_file" != /tmp/* ]]; then
            echo "Error: Input and output files must be in the /tmp directory"
            echo "One or both of the following files are not in the /tmp directory:"
            echo "  - $scap_file_name"
            echo "  - $output_file"
            exit 1
      fi

      # Run sysdig container reading the scap file and applying the filter
      docker run --rm \
            -v /tmp:/tmp \
            --entrypoint /bin/bash \
            sysdig/sysdig:latest -c "sysdig -r \"$scap_file_name\" -j -p \"$output_fields\" \"$filter\" > $output_file" 

      # Ensure the output file exists, is not empty and that anybody can read it
      # Do not fail if the filter does not produce any output, as it may be valid.
      if [ ! -s "$output_file" ]; then
            echo "Warning: Output file is non-existent or empty. The filter may not have produced any output."
            exit 0
      fi
      sudo chmod 666 "$output_file"
      sort -u -o "$output_file" "$output_file"
      echo "Output file saved at $output_file"

      if [ "$VERBOSE" == "true" ]; then
            echo "Output file content:"
            cat "$output_file"
      fi

elif [ "$filter_or_chisel" == "chisel" ]; then
      # Ensure all the required arguments are provided
      scap_file_name="$2"
      chisel_file_name="$3"
      output_file="$4"
      if [ -z "$scap_file_name" ] || [ -z "$chisel_file_name" ] || [ -z "$output_file" ]; then
            echo "Error: Missing required arguments"
            echo "Usage: $0 chisel <scap_file_name> <chisel_file_name> <output_file>"
            exit 1
      fi

      # Ensure input and output files are in the /tmp directory
      if [[ "$scap_file_name" != /tmp/* ]] || [[ "$output_file" != /tmp/* ]]; then
            echo "Error: Input and output files must be in the /tmp directory"
            echo "One or both of the following files are not in the /tmp directory:"
            echo "  - $scap_file_name"
            echo "  - $output_file"
            exit 1
      fi

      # Run sysdig container reading the scap file and running the chisels
      docker run --rm \
            -v /tmp:/tmp \
            --entrypoint /bin/bash \
            sysdig/sysdig:latest -c "sysdig -r \"$scap_file_name\" -c \"$chisel_file_name\" > $output_file" 
      
      # Ensure the output file exists, is not empty and that anybody can read it
      # Do not exit with error if the file is empty, as some chisels may not produce any output,
      # depending on the input scap file.
      if [ ! -s "$output_file" ]; then
            echo "Warning: Output file is non-existent or empty. The chisel may not have produced any output."
            exit 0
      fi
      sudo chmod 666 "$output_file"
fi
