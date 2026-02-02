#!/bin/bash

# Map Model Compression Script
# Converts textures to WebP and compresses GLTF to GLB with Draco

set -e

# Default settings (can be overridden with environment variables)
WEBP_QUALITY=${WEBP_QUALITY:-80}
DRACO_LEVEL=${DRACO_LEVEL:-3}
QUANTIZE_POSITION=${QUANTIZE_POSITION:-14}
QUANTIZE_TEXCOORD=${QUANTIZE_TEXCOORD:-12}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check dependencies
check_dependencies() {
    print_info "Checking dependencies..."

    local missing=0

    if ! command -v cwebp &> /dev/null; then
        print_error "cwebp not found. Install with: sudo pacman -S libwebp"
        missing=1
    fi

    if ! command -v gltf-pipeline &> /dev/null; then
        print_error "gltf-pipeline not found. Install with: npm install -g gltf-pipeline"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        exit 1
    fi

    print_success "All dependencies found"
}

get_size_mb() {
    local size=$(stat -c%s "$1" 2>/dev/null || echo "0")
    echo $(( size / 1024 / 1024 ))
}

# Function to convert textures to WebP
convert_textures() {
    local dir="$1"
    local quality="$2"

    print_info "Converting textures to WebP (quality: $quality)..." >&2

    local count=0
    local original_size=0
    local new_size=0

    # Convert PNGs
    for file in "$dir"/*.png; do
        [ -e "$file" ] || continue

        local output="${file%.png}.webp"

        # Check if file is readable
        if [ ! -r "$file" ]; then
            print_error "Cannot read $(basename "$file") - permission denied" >&2
            continue
        fi

        local before=$(stat -c%s "$file" 2>/dev/null || echo "0")
        if [ "$before" -eq 0 ]; then
            print_error "$(basename "$file") is empty or unreadable" >&2
            continue
        fi

        # Capture cwebp output for debugging
        local convert_output
        if convert_output=$(cwebp -q "$quality" "$file" -o "$output" 2>&1); then
            if [ -f "$output" ]; then
                local after=$(stat -c%s "$output")
                original_size=$((original_size + before))
                new_size=$((new_size + after))
                count=$((count + 1))

                local savings=$(( 100 - (after * 100 / before) ))
                print_success "$(basename "$file") → $(basename "$output") (${savings}% smaller)" >&2
            else
                print_error "Failed to convert $(basename "$file") - output file not created" >&2
            fi
        else
            print_error "Failed to convert $(basename "$file")" >&2
            # Uncomment for debugging: echo "  Error: $convert_output" >&2
        fi
    done

    for file in "$dir"/*.jpg "$dir"/*.jpeg; do
        [ -e "$file" ] || continue

        local output="${file%.*}.webp"

        # Check if file is readable
        if [ ! -r "$file" ]; then
            print_error "Cannot read $(basename "$file") - permission denied" >&2
            continue
        fi

        local before=$(stat -c%s "$file" 2>/dev/null || echo "0")
        if [ "$before" -eq 0 ]; then
            print_error "$(basename "$file") is empty or unreadable" >&2
            continue
        fi

        # Capture cwebp output for debugging
        local convert_output
        if convert_output=$(cwebp -q "$quality" "$file" -o "$output" 2>&1); then
            if [ -f "$output" ]; then
                local after=$(stat -c%s "$output")
                original_size=$((original_size + before))
                new_size=$((new_size + after))
                count=$((count + 1))

                local savings=$(( 100 - (after * 100 / before) ))
                print_success "$(basename "$file") → $(basename "$output") (${savings}% smaller)" >&2
            else
                print_error "Failed to convert $(basename "$file") - output file not created" >&2
            fi
        else
            print_error "Failed to convert $(basename "$file")" >&2
            # Uncomment for debugging: echo "  Error: $convert_output" >&2
        fi
    done

    if [ $count -gt 0 ]; then
        local total_savings=$(( 100 - (new_size * 100 / original_size) ))
        print_success "Converted $count textures (${total_savings}% total reduction)" >&2
    else
        print_warning "No textures found to convert" >&2
    fi

    echo "$count"
}

update_gltf_references() {
    local gltf="$1"

    print_info "Updating texture references in GLTF..."

    # Create backup
    cp "$gltf" "${gltf}.backup"
    print_success "Created backup: ${gltf}.backup"

    # Replace texture extensions
    sed -i 's/\.png/.webp/g' "$gltf"
    sed -i 's/\.jpg/.webp/g' "$gltf"
    sed -i 's/\.jpeg/.webp/g' "$gltf"

    print_success "Updated texture references"
}

compress_to_glb() {
    local input="$1"
    local output="$2"

    print_info "Compressing to GLB with Draco..."
    print_info "Settings: compressionLevel=$DRACO_LEVEL, position=$QUANTIZE_POSITION, texcoord=$QUANTIZE_TEXCOORD"

    if gltf-pipeline -i "$input" -o "$output" -b -d \
        --draco.compressionLevel="$DRACO_LEVEL" \
        --draco.quantizePositionBits="$QUANTIZE_POSITION" \
        --draco.quantizeTexcoordBits="$QUANTIZE_TEXCOORD" \
        --draco.unifiedQuantization; then

        print_success "Created compressed GLB: $output"
        return 0
    else
        print_error "Failed to create GLB"
        return 1
    fi
}

show_statistics() {
    local original="$1"
    local compressed="$2"

    local original_size=$(get_size_mb "$original")
    local compressed_size=$(get_size_mb "$compressed")
    local savings=$(( 100 - (compressed_size * 100 / original_size) ))

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}Compression Complete!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Original:   ${original_size} MB"
    echo "Compressed: ${compressed_size} MB"
    echo -e "Savings:    ${GREEN}${savings}%${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

main() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}Map Model Compression Tool${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Check for input file
    if [ $# -eq 0 ]; then
        print_error "Usage: $0 <input.gltf> [webp_quality] [output.glb]"
        echo ""
        echo "Examples:"
        echo "  $0 ze_map.gltf"
        echo "  $0 ze_map.gltf 75"
        echo "  $0 ze_map.gltf 80 ze_map_compressed.glb"
        echo ""
        echo "Quality range: 0-100 (default: 80)"
        exit 1
    fi

    local input_gltf="$1"
    local quality="${2:-$WEBP_QUALITY}"
    local output_glb="${3:-${input_gltf%.gltf}.glb}"

    # Validate input
    if [ ! -f "$input_gltf" ]; then
        print_error "File not found: $input_gltf"
        exit 1
    fi

    if [[ ! "$input_gltf" =~ \.gltf$ ]]; then
        print_error "Input must be a .gltf file"
        exit 1
    fi

    local gltf_dir=$(dirname "$input_gltf")

    print_info "Input:  $input_gltf"
    print_info "Output: $output_glb"
    print_info "WebP Quality: $quality"
    echo ""

    check_dependencies
    echo ""

    local texture_count=$(convert_textures "$gltf_dir" "$quality")
    echo ""

    if [ "$texture_count" -gt 0 ]; then
        update_gltf_references "$input_gltf"
        echo ""
    fi

    if compress_to_glb "$input_gltf" "$output_glb"; then
        echo ""

        show_statistics "$input_gltf" "$output_glb"

        echo ""
        read -p "Delete original PNG/JPG textures? (y/N) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -f "$gltf_dir"/*.png "$gltf_dir"/*.jpg "$gltf_dir"/*.jpeg
            print_success "Deleted original texture files"
        fi

        echo ""
        print_success "All done! Your compressed model is ready: $output_glb"
    else
        print_error "Compression failed"
        exit 1
    fi
}

main "$@"