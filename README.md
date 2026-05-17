# tree-sitter-java-manifest

tree-sitter grammar for Java MANIFEST.MF files.

## Features

- Parses Java JAR manifest files according to the JAR specification
- Supports main section attributes (e.g., `Manifest-Version`, `Created-By`)
- Supports individual sections with `Name:` headers
- Handles continuation lines with leading space
- Proper handling of quoted values containing special characters

## Requirements

- tree-sitter CLI (for testing)
- Node.js (for running tests via tree-sitter test)

## Usage

### Basic Parsing

Use this grammar with tree-sitter to parse MANIFEST.MF files:

```javascript
const Parser = require('tree-sitter');
const manifest = require('tree-sitter-manifest');

const parser = new Parser();
parser.setLanguage(manifest);

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

### Node Types

| Node Type | Description |
|-----------|-------------|
| `manifest` | Root node containing the entire manifest |
| `attribute_entry` | Key-value pair (e.g., `Manifest-Version: 1.0`) |
| `attribute_key` | Attribute name |
| `attribute_value` | Attribute value |
| `individual_section` | Section starting with `Name: header` |
| `section_name_header` | The `Name:` line that starts a section |
| `section_name` | Value after `Name:` |
| `continuation_line` | Line starting with space, continuing previous value |

### Example

```
Manifest-Version: 1.0
Created-By: 1.8

Name: com/example/MyClass.class
SHA-256-Digest: abc123...
```

This parses into:
- Main section with `Manifest-Version` and `Created-By` entries
- Individual section with `Name` and `SHA-256-Digest` entries

## Testing

```bash
# Run tests
tree-sitter test

# Test highlighting (generates HTML output)
tree-sitter highlight --config-path test/highlights/config.json --html MANIFEST.MF
```

## License

Apache-2.0
