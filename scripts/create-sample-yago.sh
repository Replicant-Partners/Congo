#!/bin/bash
# Create a small sample YAGO dataset for testing
# This creates minimal schema, taxonomy, and facts files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_ROOT/data/yago"

echo "🌊 Congo River - Creating Sample YAGO Dataset"
echo "============================================="
echo ""

mkdir -p "$DATA_DIR"

# Create sample schema
cat > "$DATA_DIR/yago-schema.ttl" << 'EOF'
@prefix schema: <http://schema.org/> .
@prefix rdf: <http://www.rdf-schema.org/2000/01/rdf-schema#> .
@prefix yago: <http://yago-knowledge.org/resource/> .

# Sample schema properties
schema:name rdf:type rdf:Property .
schema:description rdf:type rdf:Property .
schema:birthDate rdf:type rdf:Property .
schema:nationality rdf:type rdf:Property .
EOF

# Create sample taxonomy
cat > "$DATA_DIR/yago-taxonomy.ttl" << 'EOF'
@prefix schema: <http://schema.org/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix yago: <http://yago-knowledge.org/resource/> .

# Sample taxonomy - class hierarchy
schema:Person rdfs:subClassOf schema:Thing .
schema:Organization rdfs:subClassOf schema:Thing .
schema:Place rdfs:subClassOf schema:Thing .
schema:Concept rdfs:subClassOf schema:Thing .

# More specific classes
yago:Scientist rdfs:subClassOf schema:Person .
yago:Philosopher rdfs:subClassOf schema:Person .
yago:University rdfs:subClassOf schema:Organization .
yago:City rdfs:subClassOf schema:Place .
EOF

# Create sample facts
cat > "$DATA_DIR/yago-facts.ttl" << 'EOF'
@prefix schema: <http://schema.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix yago: <http://yago-knowledge.org/resource/> .

# Sample entities and facts
yago:Alan_Turing rdf:type yago:Scientist .
yago:Alan_Turing schema:name "Alan Turing" .
yago:Alan_Turing schema:birthDate "1912-06-23" .
yago:Alan_Turing schema:nationality "British" .
yago:Alan_Turing schema:description "Computer scientist and mathematician" .

yago:Ada_Lovelace rdf:type yago:Scientist .
yago:Ada_Lovelace schema:name "Ada Lovelace" .
yago:Ada_Lovelace schema:birthDate "1815-12-10" .
yago:Ada_Lovelace schema:nationality "British" .
yago:Ada_Lovelace schema:description "Mathematician and first computer programmer" .

yago:Consciousness rdf:type yago:Concept .
yago:Consciousness schema:name "Consciousness" .
yago:Consciousness schema:description "The state of being aware of internal and external stimuli" .

yago:Artificial_Intelligence rdf:type yago:Concept .
yago:Artificial_Intelligence schema:name "Artificial Intelligence" .
yago:Artificial_Intelligence schema:description "Intelligence demonstrated by machines" .

yago:University_of_Cambridge rdf:type yago:University .
yago:University_of_Cambridge schema:name "University of Cambridge" .
yago:University_of_Cambridge schema:description "Collegiate research university in Cambridge, England" .
EOF

echo "✅ Sample YAGO files created!"
echo ""
echo "📊 Files created in: $DATA_DIR"
ls -lh "$DATA_DIR"/*.ttl
echo ""
echo "📝 Sample dataset includes:"
echo "  - Schema: Basic property definitions"
echo "  - Taxonomy: Simple class hierarchy"
echo "  - Facts: 5 sample entities (2 scientists, 2 concepts, 1 university)"
echo ""
echo "⚠️  Note: This is a MINIMAL dataset for testing only"
echo "   For production use, download full YAGO 4.5 from:"
echo "   https://yago-knowledge.org/downloads/yago-4-5"
echo ""
echo "Next steps:"
echo "  1. Run: npm run yago:import"
echo "  2. Test with Congo River tools"
echo ""
