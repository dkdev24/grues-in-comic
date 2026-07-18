# AI Knowledge Infrastructure Decision

**Project:** Grues in Comic
**Status:** Accepted
**Decision Date:** July 2026

---

# Executive Summary

Grues in Comic is an AI-first software modernization project involving multiple programming languages, historical source code, and AI coding agents.

The project requires an AI knowledge infrastructure capable of supporting:

* long-term software evolution
* multi-agent collaboration
* semantic understanding
* structural analysis
* architectural documentation
* browser modernization

After evaluating several modern AI code understanding platforms, the project adopts the following baseline infrastructure.

**Selected Tools**

* **Graphify**
* **OpenWiki**

These two tools provide complementary capabilities and form the foundation of the Grues in Comic AI workflow.

---

# Project Requirements

Grues in Comic differs significantly from a conventional software project.

Characteristics include:

* historical source code
* ZIL (Zork Implementation Language)
* C++
* JavaScript / TypeScript
* HTML/CSS
* Markdown documentation
* AI-assisted development
* browser modernization
* WebAssembly
* Intermediate Representation (IR)

The knowledge infrastructure must therefore support both software engineering and semantic documentation.

---

# Evaluation Criteria

The following criteria were used when comparing available tools.

| Criterion                  | Description                                     |
| -------------------------- | ----------------------------------------------- |
| Structural Analysis        | Understand code relationships and architecture  |
| Semantic Understanding     | Explain design intent and gameplay behavior     |
| AI Integration             | Compatibility with modern AI coding agents      |
| Multi-language Support     | Ability to work with heterogeneous repositories |
| Documentation Support      | Long-term knowledge accumulation                |
| Visualization              | Architecture exploration                        |
| Extensibility              | Ability to support future workflows             |
| Suitability for Grues in Comic | Overall fitness for this project                |

---

# Evaluated Tools

## 1. Graphify

Repository

https://github.com/Graphify-Labs/graphify

### Primary Purpose

Generate structural knowledge graphs of software projects.

### Strengths

* AI-first architecture
* AST-based analysis
* dependency graphs
* call graphs
* module relationships
* architecture visualization
* MCP compatibility
* suitable for large repositories
* excellent support for modern AI coding agents

### Weaknesses

* No native ZIL parser
* Requires structured input for unsupported languages
* Graph generation introduces preprocessing overhead

### Suitability

★★★★★

Graphify is the strongest candidate for structural analysis.

---

## 2. OpenWiki

Repository

https://github.com/langchain-ai/openwiki

### Primary Purpose

Generate AI-friendly project documentation.

### Strengths

* Excellent Markdown generation
* Captures semantic knowledge
* Explains architecture
* Documents gameplay behavior
* Maintains design rationale
* Works well with LLMs

### Weaknesses

* No AST analysis
* Limited structural understanding
* Does not generate dependency graphs

### Suitability

★★★★★

OpenWiki complements Graphify exceptionally well.

---

## 3. CodeGraph

Repository

https://github.com/colbymchenry/codegraph

### Primary Purpose

Repository indexing and code navigation.

### Strengths

* Lightweight
* Fast indexing
* Efficient code lookup
* Simple deployment

### Weaknesses

* Limited architectural reasoning
* Minimal semantic documentation
* Less comprehensive knowledge graph support

### Suitability

★★★☆☆

Useful for conventional repositories but less suitable for Grues in Comic.

---

## 4. Understand Anything

Repository

https://github.com/Egonex-AI/Understand-Anything

### Primary Purpose

AI-assisted repository exploration and visualization.

### Strengths

* Excellent architecture visualization
* Human-friendly explanations
* Interactive exploration
* Good educational value

### Weaknesses

* Less focused on AI coding workflows
* Limited long-term knowledge management
* Less comprehensive than Graphify for structural analysis

### Suitability

★★★★☆

A strong candidate for future documentation and presentation workflows.

---

## 5. Code Review Graph

Repository

https://github.com/tirth8205/code-review-graph

### Primary Purpose

AI-assisted code review and pull request analysis.

### Strengths

* Incremental graph updates
* Review-oriented architecture
* Efficient context reduction

### Weaknesses

* Optimized for code review
* Limited documentation capabilities
* Limited architectural knowledge management

### Suitability

★★☆☆☆

Better suited for collaborative review workflows than long-term software modernization.

---

# ZIL Compatibility

One of the most important considerations is support for ZIL.

| Tool                | Native ZIL Support | Practical Usage                             |
| ------------------- | ------------------ | ------------------------------------------- |
| Graphify            | No                 | Excellent after semantic extraction into IR |
| OpenWiki            | Partial            | LLMs can explain ZIL semantics directly     |
| CodeGraph           | No                 | Limited                                     |
| Understand Anything | Partial            | Useful for documentation                    |
| Code Review Graph   | No                 | Not recommended                             |

No evaluated tool currently provides native parsing of ZIL.

This reinforces the decision to introduce a dedicated semantic analysis stage before downstream AI tooling.

---

# Proposed Knowledge Pipeline

The project adopts the following AI knowledge architecture.

```text
                 ZIL
                  │
                  ▼
        Semantic Analysis
                  │
                  ▼
    Intermediate Representation (IR)
          │                     │
          ▼                     ▼
     Graphify              OpenWiki
 (Structural Graph)   (Semantic Knowledge)
          │                     │
          └──────────┬──────────┘
                     ▼
              AI Coding Agents
                     ▼
            Grues in Comic Engine
```

This architecture separates software structure from software meaning.

---

# Responsibilities

## Graphify

Responsible for structural knowledge.

Examples include:

* dependency graphs
* object relationships
* call graphs
* module graphs
* architecture graphs

Graphify should primarily consume:

* modernized source code
* Intermediate Representation
* generated metadata

Graph outputs belong in:

```
graph/
```

---

## OpenWiki

Responsible for semantic knowledge.

Examples include:

* gameplay mechanics
* parser behavior
* migration rationale
* architecture decisions
* browser integration
* design trade-offs

Documentation belongs in:

```
wiki/
```

---

# Why Not Use Only One Tool?

Graphify and OpenWiki solve different problems.

| Graphify                   | OpenWiki                    |
| -------------------------- | --------------------------- |
| Explains structure         | Explains meaning            |
| Generates graphs           | Generates documentation     |
| Uses AST and relationships | Uses LLM reasoning          |
| Optimized for navigation   | Optimized for understanding |

Together they provide a complete AI knowledge system.

---

# Future Expansion

The selected infrastructure does not prevent future additions.

Potential future tools include:

### Understand Anything

Recommended when:

* architecture presentations become important
* educational material is created
* interactive exploration is needed

### CodeGraph

May be useful for lightweight indexing in very large repositories.

### Code Review Graph

May become useful if the project evolves into a large multi-contributor open-source community.

---

# Final Decision

The Grues in Comic project officially adopts the following baseline AI knowledge infrastructure.

| Category             | Selected Tool |
| -------------------- | ------------- |
| Structural Knowledge | Graphify      |
| Semantic Knowledge   | OpenWiki      |

These tools will be integrated into the standard AI development workflow.

Additional tools may be evaluated in the future, but Graphify and OpenWiki constitute the project's long-term foundation.

---

# Guiding Principle

Grues in Comic distinguishes between two complementary forms of knowledge.

**Structural Knowledge**

Maintained by Graphify.

Answers:

> **How is the software connected?**

Examples:

* dependencies
* relationships
* architecture
* call graphs

---

**Semantic Knowledge**

Maintained by OpenWiki.

Answers:

> **Why does the software behave this way?**

Examples:

* gameplay rules
* parser behavior
* migration strategy
* design decisions
* engineering rationale

Together, these systems create an AI-friendly development environment capable of supporting long-term software modernization and multi-agent collaboration.
