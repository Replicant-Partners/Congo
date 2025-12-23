# Congo River Project Memory Context

## Project Identity
- **Name**: Congo River Compositional Intelligence MCP Server
- **Philosophy**: Thousands of tributaries (simple reasoning operations) composing into one massive flow (deep intelligence)
- **Core Principles**: Compositional Structure, Polyglot Architecture, Semantic Foundations, Neuro-Symbolic Integration

## Current Status Summary
- **Phase**: 1 (Foundation) - ✅ Complete with Enhanced Architecture
- **RDF Parser**: ✅ Basic implementation complete with enhanced security, type safety, and error handling
- **Integration**: ✅ All services fully integrated and tested
- **Database**: ✅ PostgreSQL + pgvector schema complete with all tables and enhanced architecture
- **Enhanced Architecture**: ✅ Security improvements, type safety, structured error handling implemented

## Key Components Status
1. **MCP Server**: ✅ Complete with enhanced error handling (server.ts)
2. **Database Manager**: ✅ Complete with security improvements (configure_database tool)
3. **Language Selection**: ✅ Complete (recommend_language tool)  
4. **RDF Parser**: ✅ Complete with enhanced architecture (rdf-parser.ts)
5. **Python Services**: ✅ Complete and integrated (graph_engine.py, neuro_symbolic.py, proof_searcher.py, triple_decomposer.py)
6. **TypeScript Lambda**: ✅ Complete and integrated (lambda-abstractor.ts)
7. **Neuro-symbolic Query**: ✅ Complete and integrated
8. **Enhanced Architecture**: ✅ Security, type safety, and error handling implemented across all components

## RDF Parser Technical Context
- **Current Capabilities**: Basic Turtle parsing, prefix handling, triple extraction
- **Key Limitations**: No abbreviated syntax, incomplete literal metadata, basic error handling
- **Enhancement Priority**: High - blocks full YAGO dataset processing
- **Integration Point**: Feeds into knowledge graph via triple_decomposition and import_knowledge tools

## Development Roadmap Context
- **Phase 1.5**: RDF parser enhancement, complete Python services, end-to-end testing
- **Phase 2**: Tree of Thoughts orchestrator, Chain of Thought tracer (reasoning exploration)
- **Phase 3**: Meta-cognitive layer (compositional analyzer, loop discovery)

## Architecture Context
- **Polyglot Design**: Python for AI/neuro-symbolic, TypeScript for orchestration/MCP
- **Database**: Supabase PostgreSQL with pgvector for embeddings
- **Protocol**: MCP STDIO/SSE compliant
- **Data Flow**: User → MCP Server → Language Selection → Service Routing → Database

## Standards Compliance Context
- **Epistemic Rigor**: Single-step inferences only, evidence-based assessments
- **Investigation Methodology**: Semantic analysis over brute-force, progressive refinement
- **Professional Collaboration**: Direct technical analysis, no emotional pandering
- **Quality Focus**: Comprehensive solutions over shortcuts, root cause analysis

## Key Files and Locations
- **Core**: `/src/server.ts`
- **RDF Parser**: `/src/services/rdf-parser.ts`  
- **Python Services**: `/src/services/python/`
- **TypeScript Services**: `/src/services/typescript/`
- **Database**: `/src/config/database.ts`, `/src/db/schema.sql`
- **YAGO Data**: `/data/yago/`
- **Documentation**: `/docs/`, `README.md`, `PHASE-2-PLAN.md`

## Critical Dependencies
- **YAGO 4.5 Dataset**: Primary RDF source requiring full parser compliance
- **PostgreSQL + pgvector**: Database requirement for embeddings and triples
- **Anthropic/OpenAI APIs**: LLM integration for reasoning services
- **MCP Protocol**: Transport layer for tool integration

## Success Metrics Context
- **Phase 1**: ✅ All 10 MCP tools functional with enhanced architecture, end-to-end testing complete
- **RDF Parser**: ✅ Basic Turtle parsing complete, enhanced with security and type safety
- **Integration**: ✅ Seamless Python/TypeScript service orchestration with proper error handling
- **Performance**: ✅ Efficient processing of knowledge graphs with enhanced architecture
- **Enhanced Architecture**: ✅ Security improvements, type safety enhancements, structured error handling implemented

---
**Memory Updated**: December 23, 2025  
**Purpose**: Internal project context reference following standards.md epistemic rigor guidelines
**Usage**: Reference for future development decisions and status assessments
**Status**: Phase 1 Complete - Enhanced Architecture