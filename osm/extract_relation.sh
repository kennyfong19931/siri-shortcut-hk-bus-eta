#!/usr/bin/env bash

# Check if input file parameter is provided
if [ $# -lt 1 ]; then
    echo "Usage: $0 <input_file.osm.pbf> [osm_config.json]"
    echo "Example: $0 input.osm.pbf config.json"
    exit 1
fi

INPUT_FILE="$1"
CONFIG_FILE="${2:-osm_config.json}"

# Ensure input file exists
if [ ! -f "${INPUT_FILE}" ]; then
    echo "Error: Input file '${INPUT_FILE}' not found."
    exit 1
fi
# Ensure config file exists
if [ ! -f "${CONFIG_FILE}" ]; then
    echo "Error: Config file '${CONFIG_FILE}' not found."
    exit 1
fi

# Create a temporary file for intermediate data
TMP_REL="$(mktemp --suffix=.osm.pbf)"
trap 'rm -f "${TMP_REL}"' EXIT

# Extract all relation IDs dynamically across all top-level keys
# .[] iterates over all top-level array values, .[].relationId[] unwraps all ID arrays
RELATION_IDS=$(jq -r '.[] | .[].relationId[]' "${CONFIG_FILE}")

for RELATION_ID in ${RELATION_IDS}; do
    CLEAN_ID=$(echo "${RELATION_ID}" | tr -cd '0-9')
    
    if [ -z "${CLEAN_ID}" ]; then
        continue
    fi

    OUTPUT_FILE="${CLEAN_ID}.geojson"
    echo "----------------------------------------"
    echo "Processing Relation ID: r${CLEAN_ID}"

    # Extract relation and referenced members
    osmium getid -r "${INPUT_FILE}" "r${CLEAN_ID}" -o "${TMP_REL}" --overwrite

    # Export to GeoJSON (linestring / ways only)
    osmium export "${TMP_REL}" --geometry-types=linestring -a id -o "${OUTPUT_FILE}" --overwrite

    echo "Saved to '${OUTPUT_FILE}'"
done

echo "----------------------------------------"
echo "All relations extracted successfully."
