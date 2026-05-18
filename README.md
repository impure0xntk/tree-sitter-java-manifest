# tree-sitter-java-manifest

tree-sitter grammar for Java MANIFEST.MF files.

## Features

- Parses Java JAR manifest files according to the [JAR specification](https://docs.oracle.com/en/java/javase/25/docs/specs/jar/jar.html)
- Supports main section attributes (e.g., `Manifest-Version`, `Created-By`)
- Supports individual sections with case-insensitive `Name:` headers
- Handles continuation lines with leading space
- Supports folded section names (continuation across lines)
- Zero-length attribute values
- CRLF / LF / CR line endings
- Proper handling of quoted values containing special characters

## Requirements

- tree-sitter CLI (for testing)
- Node.js (for running tests via `tree-sitter test`)
- Nix (optional, for development shell via `nix develop`)

## Usage

### Basic Parsing

Use this grammar with tree-sitter to parse MANIFEST.MF files:

```javascript
const Parser = require('tree-sitter');
const Manifest = require('tree-sitter-java-manifest');

const parser = new Parser();
parser.setLanguage(Manifest);

const source = `Manifest-Version: 1.0
Created-By: 1.8.0_282 (Oracle Corporation)
`;

const tree = parser.parse(source);
console.log(tree.rootNode.toString());
```

### Syntax Highlighting

To test syntax highlighting, run the following command from the project root:

```bash
tree-sitter highlight --config-path test/highlights/config.json --html MANIFEST.MF
```

This will generate an HTML file with syntax-highlighted output using the queries defined in `queries/highlights.scm`.

## Grammar Structure

### Parse Tree

```
manifest
├── main_section
│   ├── attribute_entry        (key: attribute_key, value: attribute_value)
│   ├── attribute_entry
│   └── continuation_line      (only when misplaced — error case)
├── individual_section
│   ├── section_name_header
│   │   ├── section_name
│   │   └── section_name_continuation*   (folded names only)
│   ├── attribute_entry
│   └── continuation_line*
└── individual_section
    └── ...
```

### Node Types

| Node Type | Description |
|-----------|-------------|
| `manifest` | Root node containing the entire manifest |
| `main_section` | Attributes before the first `Name:` header |
| `individual_section` | Section starting with `Name:` header |
| `attribute_entry` | Key-value pair (e.g., `Manifest-Version: 1.0`) |
| `attribute_key` | Attribute name |
| `attribute_value` | Attribute value |
| `section_name_header` | The `Name:` line that starts a section |
| `section_name` | Value after `Name:` |
| `section_name_continuation` | Continuation line for folded section name |
| `continuation_line` | Line starting with space, continuing previous value |
| `continuation_value` | Content of a continuation line |

### Example

```
Manifest-Version: 1.0
Created-By: 1.8

Name: com/example/MyClass.class
SHA-256-Digest: abc123...
```

This parses into:
- `main_section` with `Manifest-Version` and `Created-By` entries
- `individual_section` with `Name` and `SHA-256-Digest` entries

### Folded Section Names

```
Name: com/example/
 folded/path.class
```

Parses into a single `section_name_header` with both `section_name` and `section_name_continuation`.

## Development

### Nix Dev Shell

```bash
nix develop
```

Provides `tree-sitter` and `nodejs`.

### Testing

```bash
# Run all tests
tree-sitter test

# Test highlighting (generates HTML output)
tree-sitter highlight --config-path test/highlights/config.json --html MANIFEST.MF
```

Test corpus: `test/corpus/manifest_test.txt`

## File Types

This grammar recognizes `.MF` files (file type: `MF`).

## License

Apache-2.0
