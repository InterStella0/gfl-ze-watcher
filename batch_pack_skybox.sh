#!/bin/bash

# Batch Skybox Packing Script
# Packs GLTF skybox files (with PNG textures) into single GLB files

set -e

DONE_DIR="/run/media/sarah/uwu 2/skyboxs-done"
INPUT_DIR="/home/sarah/Documents/skyboxs"
OUTPUT_DIR="/home/sarah/Documents/compressed-skyboxs"
SCRIPT_DIR="$(dirname "$0")"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Batch Skybox Packing${NC}"
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

# Check dependency
if ! command -v gltf-pipeline &> /dev/null; then
    echo -e "${RED}✗${NC} gltf-pipeline not found. Install with: npm install -g gltf-pipeline"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Find all GLTF files
mapfile -t gltf_files < <(find "$INPUT_DIR" -type f -name "*.gltf")

if [ ${#gltf_files[@]} -eq 0 ]; then
    echo -e "${RED}✗${NC} No GLTF files found in $INPUT_DIR"
    exit 0
fi

echo -e "${BLUE}ℹ${NC} Found ${#gltf_files[@]} skybox(es) to process"
echo ""

processed=0
failed=0

for gltf in "${gltf_files[@]}"; do
    map_name=$(basename "$(dirname "$gltf")")
    gltf_filename=$(basename "$gltf")

    # Skip if already processed
    if [ -d "$DONE_DIR/$map_name" ]; then
        echo -e "${BLUE}↷ Skipping ${map_name} (already in skybox-done)${NC}"
        echo ""
        continue
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}Packing: $map_name${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    output_glb="$OUTPUT_DIR/${map_name}.glb"

    if gltf-pipeline -i "$gltf" -o "$output_glb" -b; then
        output_size=$(stat -c%s "$output_glb" 2>/dev/null || echo "0")
        output_kb=$(( output_size / 1024 ))
        processed=$((processed + 1))
        echo -e "${GREEN}✓${NC} ${map_name}.glb (${output_kb} KB)"
    else
        failed=$((failed + 1))
        echo -e "${RED}✗${NC} Failed to pack $map_name"
    fi

    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Batch Packing Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Successfully packed: $processed skybox(es)"
if [ $failed -gt 0 ]; then
    echo -e "${RED}Failed: $failed skybox(es)${NC}"
fi
echo "Output directory: $OUTPUT_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"