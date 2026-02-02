#!/bin/bash

# Batch Map Compression Script
# Uses compress_map_model.sh to process all maps in a directory

set -e

INPUT_DIR="/home/sarah/Documents/maps-compressed"
OUTPUT_DIR="/home/sarah/Documents/compressed-maps"
SCRIPT_DIR="$(dirname "$0")"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Batch Map Compression${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Input:  $INPUT_DIR"
echo "Output: $OUTPUT_DIR"
echo ""

# Validate input directory
if [ ! -d "$INPUT_DIR" ]; then
    echo -e "${RED}✗${NC} Input directory not found: $INPUT_DIR"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Find all GLTF files (exclude physics files)
mapfile -t gltf_files < <(find "$INPUT_DIR" -type f -name "*.gltf" ! -name "*_physics.gltf")

if [ ${#gltf_files[@]} -eq 0 ]; then
    echo -e "${RED}✗${NC} No GLTF files found in $INPUT_DIR"
    exit 0
fi

echo -e "${BLUE}ℹ${NC} Found ${#gltf_files[@]} map(s) to process"
echo ""

processed=0
failed=0

for gltf in "${gltf_files[@]}"; do
    map_name=$(basename "$(dirname "$gltf")")
    gltf_filename=$(basename "$gltf")

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}Processing: $map_name${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Create output directory for this map
    map_output_dir="$OUTPUT_DIR/$map_name"
    mkdir -p "$map_output_dir"

    # LOW QUALITY
    echo -e "${BLUE}Creating LOW quality version...${NC}"
    output_low="$map_output_dir/${map_name}_low.glb"
    if DRACO_LEVEL=10 QUANTIZE_POSITION=10 QUANTIZE_TEXCOORD=8 "$SCRIPT_DIR/compress_map_model.sh" "$gltf" 60 "$output_low" <<< "N"; then
        echo -e "${GREEN}✓${NC} Low quality completed"
    else
        failed=$((failed + 1))
        echo -e "${RED}✗${NC} Low quality failed"
    fi

    echo ""

    # HIGH QUALITY
    echo -e "${BLUE}Creating HIGH quality version...${NC}"
    output_high="$map_output_dir/${map_name}_high.glb"
    if DRACO_LEVEL=3 QUANTIZE_POSITION=14 QUANTIZE_TEXCOORD=12 "$SCRIPT_DIR/compress_map_model.sh" "$gltf" 85 "$output_high" <<< "N"; then
        processed=$((processed + 1))
        echo -e "${GREEN}✓${NC} High quality completed"
    else
        failed=$((failed + 1))
        echo -e "${RED}✗${NC} High quality failed"
    fi

    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Batch Processing Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Successfully processed: $processed maps"
if [ $failed -gt 0 ]; then
    echo -e "${RED}Failed: $failed maps${NC}"
fi
echo "Output directory: $OUTPUT_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
