#!/bin/bash
# Download YAGO 4.5 English Wikipedia subset
# This downloads the core knowledge base with English Wikipedia entities

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_ROOT/data/yago"

echo "🌊 Congo River - YAGO 4.5 Download Script"
echo "=========================================="
echo ""

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR"

# YAGO 4.5 Download Information
# Note: YAGO files must be manually downloaded from the official website
# This script provides guidance and will check for existing files

echo "⚠️  YAGO files require manual download"
echo ""
echo "Please visit: https://yago-knowledge.org/downloads/yago-4-5"
echo "Download these files and place them in: $DATA_DIR"
echo ""
echo "Required files:"
echo "  1. yago-taxonomy.ttl (or .nt format)"
echo "  2. yago-schema.ttl (or .nt format)"
echo "  3. yago-facts.ttl (or yago-facts-en.nt for English subset)"
echo ""
echo "Alternative: Hugging Face dataset"
echo "  https://huggingface.co/datasets/wikipunk/yago45en"
echo ""

# Check if files already exist
declare -A FILES=(
    ["yago-taxonomy"]="Taxonomy - class hierarchy and schema"
    ["yago-schema"]="Schema - property definitions and constraints"
    ["yago-facts"]="Facts - entities with English Wikipedia pages"
)

echo "📂 Checking for YAGO files in: $DATA_DIR"
echo ""

found_count=0
for file_prefix in "${!FILES[@]}"; do
    description="${FILES[$file_prefix]}"
    echo "🔍 $file_prefix"
    echo "   $description"

    # Check for .ttl or .nt versions
    if [ -f "$DATA_DIR/$file_prefix.ttl" ] || [ -f "$DATA_DIR/$file_prefix.nt" ]; then
        echo "   ✓ Found!"
        ((found_count++))
    else
        echo "   ✗ Not found"
    fi
    echo ""
done

if [ $found_count -eq 0 ]; then
    echo "❌ No YAGO files found!"
    echo ""
    echo "To proceed:"
    echo "  1. Visit https://yago-knowledge.org/downloads/yago-4-5"
    echo "  2. Download the Turtle (.ttl) or N-Triples (.nt) files"
    echo "  3. Place them in: $DATA_DIR"
    echo "  4. Run this script again to verify"
    echo ""
    echo "Or create a sample dataset for testing:"
    echo "  bash scripts/create-sample-yago.sh"
    exit 1
else
    echo "✅ Found $found_count YAGO file(s)!"
    echo ""
    echo "📊 Available files:"
    ls -lh "$DATA_DIR"/*.ttl "$DATA_DIR"/*.nt 2>/dev/null || echo "No files listed"
    echo ""
    echo "Next steps:"
    echo "  1. Run: npm run yago:import"
    echo "  2. Or use the import_knowledge tool from Claude Code"
    echo ""
fi
