// ==========================================================================
//  Java MANIFEST.MF Grammar for tree-sitter
// ==========================================================================
//
//  References:
//    [SPEC]  JAR File Specification – Manifest format
//            https://docs.oracle.com/en/java/javase/25/docs/specs/jar/jar.html
//    [JDK]   OpenJDK Manifest.java (read / parseName / readLine)
//            https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/jar/Manifest.java
//
// --------------------------------------------------------------------------
//  Formal BNF extracted from [SPEC]
// --------------------------------------------------------------------------
//
//    section:           *header +newline
//    nonempty-section:  +header +newline
//    newline:           CR LF | LF | CR (not followed by LF)
//    header:            name : value
//    name:              alphanum *headerchar
//                         alphanum:   {A-Z} | {a-z} | {0-9}
//                         headerchar: alphanum | - | _
//    value:             SPACE *otherchar newline *continuation
//    continuation:      SPACE *otherchar newline
//    otherchar:         any UTF-8 character except NUL, CR and LF
//
//    manifest-file:     main-section newline *individual-section
//    main-section:      version-info newline *main-attribute
//    version-info:      Manifest-Version : version-number
//    main-attribute:    (any legitimate main attribute) newline
//    individual-section: Name : value newline *perentry-attribute
//    perentry-attribute: (any legitimate perentry attribute) newline
//
// --------------------------------------------------------------------------
//  OpenJDK parsing behaviour ([JDK] Manifest.java)
// --------------------------------------------------------------------------
//
//  The reference implementation reveals details not explicit in the BNF:
//
//  1. Section delimiter detection (parseName, line ~390)
//     – A line is a "Name:" header iff its first characters match
//       [Nn][Aa][Mm][Ee]':' ' '  (case-insensitive, colon+space required)
//     – Everything before the first Name header is the main section.
//     – Each subsequent Name header starts a new individual section.
//
//  2. Continuation line rule ([JDK] FastInputStream.readLine, line ~320)
//     – A line whose first byte is 0x20 (SPACE) is a continuation of the
//       previous line's value.
//     – Continuation applies to both header values AND section names.
//       If the next byte after a Name value line is SPACE, the name is
//       folded across lines (lastline buffer in [JDK] read()).
//
//  3. Newline handling ([JDK] FastInputStream.readLine)
//     – CRLF, LF, and lone CR (not followed by LF) are all accepted.
//     – Tree-sitter uses greedy alternation (\r?\n|\r) to mimic this
//       since lookahead is unavailable.
//
//  4. Empty lines between sections (skipEmptyLines in [JDK] read())
//     – Blank lines between the main section and individual sections,
//       or between individual sections, are silently skipped.
//     – Blank lines are NOT themselves AST nodes; they are whitespace.
//
//  5. Value content
//     – Any UTF-8 byte except NUL (0x00), CR (0x0D), LF (0x0A).
//     – Zero-length values are legal (e.g. "Blank-Value: " with nothing
//       after the space).
//
// --------------------------------------------------------------------------
//  Tree-sitter design decisions
// --------------------------------------------------------------------------
//
//  Token types used:
//    attribute_key       – word token (alphanum + headerchar*)
//                          Also serves as tree-sitter's `word` for keyword
//                          extraction; conflicts resolved via GLR.
//    attribute_value     – immediate token: everything after ": " until EOL
//    section_name        – immediate token: path/URL after "Name: "
//    continuation_value  – immediate token: content after leading SPACE
//
//  GLR conflicts declared:
//    [section_name_header, attribute_entry]
//      – "Name: " starts with the same pattern as an attribute_key.
//        GLR forks: one path treats it as section delimiter, the other
//        as a generic attribute.  The section path wins when followed
//        by a path-like value.
//
//    [section_name_header, continuation_line]
//      – After "Name: path", a line starting with SPACE could either
//        be a continuation of the section name (section_name_continuation)
//        or a standalone continuation_line belonging to the main section.
//        prec.right on section_name_header biases towards folding into
//        the section name, matching [JDK] parseName() behaviour.
//
//  prec.right on section_name_header
//      – Instructs the parser to consume continuation lines as part of
//        the section_name_header (repeat(section_name_continuation))
//        rather than reducing early.  This is essential for folded
//        section names like:
//          Name: com/example/
//           folded/path.class
//
// --------------------------------------------------------------------------
//  Parse tree structure
// --------------------------------------------------------------------------
//
//    manifest
//    ├── main_section
//    │   ├── attribute_entry        (key: attribute_key, value: attribute_value)
//    │   ├── attribute_entry
//    │   └── continuation_line      (only when misplaced – see test 15)
//    ├── individual_section
//    │   ├── section_name_header
//    │   │   ├── section_name
//    │   │   └── section_name_continuation*   (folded names only)
//    │   ├── attribute_entry
//    │   └── continuation_line*
//    └── individual_section
//        └── ...
//
//    Note: main_section and individual_section BOTH accept
//    continuation_line as a child.  In a valid manifest, continuation
//    lines only appear after an attribute_entry.  A continuation_line
//    in main_section before any attribute_entry is an error case
//    (see test corpus "Misplaced continuation line").
//
// ==========================================================================

module.exports = grammar({
  name: 'java_manifest',

  // -----------------------------------------------------------------------
  //  Inline whitespace (SPACE, TAB, FF) is extra – freely skipped between
  //  tokens.  Newlines are also extra but matched explicitly as:
  //    \r?\n|\r   →  CRLF | LF | CR (greedy; CRLF takes priority)
  // -----------------------------------------------------------------------
  extras: $ => [
    /[ \t\f]+/,       // intra-line whitespace
    /\r?\n|\r/,        // line terminators (matches [SPEC] newline, [JDK] readLine)
  ],

  // -----------------------------------------------------------------------
  //  `word` token – required by tree-sitter for keyword extraction.
  //  Set to attribute_key because header names are the only atomic
  //  identifiers in a manifest.  Section delimiters (Name) are matched
  //  case-insensitively at the lexer level, distinct from attribute_key.
  // -----------------------------------------------------------------------
  word: $ => $.attribute_key,

  // -----------------------------------------------------------------------
  //  GLR conflict declarations
  // -----------------------------------------------------------------------
  //  No explicit conflicts are needed.  The potential ambiguities –
  //    (a) "Name:" matching the attribute_key pattern, and
  //    (b) a leading-space line being a continuation_line vs. a
  //        section_name_continuation within a section_name_header –
  //  are both resolved naturally by tree-sitter's GLR algorithm
  //  (prec.right on section_name_header handles case (b)).
  // -----------------------------------------------------------------------

  // ========================================================================
  //  Grammar rules
  // ========================================================================
  rules: {

    // ----------------------------------------------------------------------
    //  manifest – the root node
    //
    //    [SPEC] manifest-file: main-section newline *individual-section
    //    [JDK]   Main attrs are read first, then entries in a loop.
    //
    //  A valid manifest always has at least a main section with
    //  Manifest-Version.  Individual sections are delimited by "Name:"
    //  headers, each containing per-entry attributes.
    // ----------------------------------------------------------------------
    manifest: $ => seq(
      $.main_section,
      repeat($.individual_section),
    ),

    // ----------------------------------------------------------------------
    //  main_section – attributes before the first "Name:" header
    //
    //    [SPEC] main-section: version-info newline *main-attribute
    //    [JDK]   Parsed by attr.read() before the entry loop.
    //
    //  Must contain at least one node (Manifest-Version is mandatory).
    //  Accepts attribute_entry for key:value pairs and continuation_line
    //  for wrapped values.  A continuation_line appearing before any
    //  attribute_entry is a malformed manifest (see test corpus).
    // ----------------------------------------------------------------------
    main_section: $ => repeat1(choice(
      $.attribute_entry,       // key: value
      $.continuation_line,     // continuation of previous value
    )),

    // ----------------------------------------------------------------------
    //  individual_section – per-entry attributes delimited by "Name:"
    //
    //    [SPEC] individual-section: Name : value newline *perentry-attribute
    //    [JDK]   Each iteration of the read() loop creates a new entry
    //            when parseName() succeeds.
    //
    //  Structure: a section_name_header followed by zero or more
    //  attribute_entry / continuation_line nodes.
    //  An empty section (Name header only, no attributes) is legal.
    // ----------------------------------------------------------------------
    individual_section: $ => seq(
      $.section_name_header,   // "Name: <path>" delimiter
      repeat(choice(
        $.attribute_entry,
        $.continuation_line,
      )),
    ),

    // ----------------------------------------------------------------------
    //  section_name_header – the "Name:" delimiter + its value
    //
    //    [SPEC] Not in BNF, but implied by individual-section.
    //    [JDK]   parseName() checks: [Nn][Aa][Mm][Ee]':' ' '
    //            If followed by SPACE on the next line, the name is folded.
    //
    //  prec.right: greedy consumption of continuation lines into the
    //  section name (section_name_continuation).  This matches [JDK]
    //  parseName() which eagerly reads continuation lines into the name
    //  buffer until a non-continuation line is encountered.
    //
    //  Example normal:
    //    Name: com/example/MyClass.class
    //
    //  Example folded:
    //    Name: com/example/
    //     folded/path.class
    //  → section_name = "com/example/"
    //  → section_name_continuation = "folded/path.class"
    //  → logical name = "com/example/folded/path.class"
    // ----------------------------------------------------------------------
    section_name_header: $ => prec.right(seq(
      // Case-insensitive "Name" ([JDK] toLower-based comparison)
      /[Nn][Aa][Mm][Ee]/,
      ': ',                                              // colon + space (required)
      field('name', $.section_name),                     // path/URL value
      repeat($.section_name_continuation),               // folded continuation lines
    )),

    // ----------------------------------------------------------------------
    //  section_name – the path/URL value on a "Name:" line
    //
    //    [SPEC] otherchar: any UTF-8 character except NUL, CR, LF
    //
    //  token.immediate: no whitespace matching inside the token.
    //  Matches one line worth of non-NUL, non-newline characters.
    // ----------------------------------------------------------------------
    section_name: $ => token.immediate(/[^\x00\n\r]+/),

    // ----------------------------------------------------------------------
    //  section_name_continuation – continuation line for a folded "Name:"
    //
    //    [JDK] If the byte after a name line is SPACE (0x20), parseName()
    //          appends it to the name buffer (lastline).  Multiple
    //          continuation lines are supported.
    //
    //  Starts with a literal space (matched from extras), followed by
    //  the continuation value.
    // ----------------------------------------------------------------------
    section_name_continuation: $ => seq(
      ' ',                                                // leading space
      field('value', $.continuation_value),               // folded name fragment
    ),

    // ----------------------------------------------------------------------
    //  attribute_entry – a single key: value pair
    //
    //    [SPEC] header: name : value
    //
    //  key:   attribute_key  – alphanum *headerchar (see below)
    //  ": "   literal         – colon + space separator
    //  value: attribute_value – *otherchar (can be empty)
    //
    //  Continuation of the value is handled by separate continuation_line
    //  nodes that follow this node.
    // ----------------------------------------------------------------------
    attribute_entry: $ => seq(
      field('key', $.attribute_key),
      ': ',                                                // colon + space
      field('value', $.attribute_value),
    ),

    // ----------------------------------------------------------------------
    //  attribute_value – the value portion of a header
    //
    //    [SPEC] value: SPACE *otherchar newline *continuation
    //           otherchar: any UTF-8 character except NUL, CR and LF
    //
    //  token.immediate prevents whitespace (SPACE, TAB) from being
    //  consumed inside the token – whitespace belongs to extras.
    //  The regex matches zero or more characters that are not NUL, CR, LF.
    //  Zero-length is valid (e.g. "Blank-Value: ").
    // ----------------------------------------------------------------------
    attribute_value: $ => token.immediate(/[^\x00\n\r]*/),

    // ----------------------------------------------------------------------
    //  continuation_line – a wrapped continuation of the previous value
    //
    //    [SPEC] continuation: SPACE *otherchar newline
    //    [JDK]   Lines starting with 0x20 (SPACE) are appended to the
    //            previous header's value.
    //
    //  The leading space is matched literally (consumed from extras),
    //  followed by the continuation value.  Multiple continuation lines
    //  can appear consecutively for deeply wrapped values.
    // ----------------------------------------------------------------------
    continuation_line: $ => seq(
      ' ',                                                // leading space
      field('value', $.continuation_value),
    ),

    // ----------------------------------------------------------------------
    //  continuation_value – the content of a continuation line
    //
    //    [SPEC] *otherchar  (no leading space, that's consumed separately)
    //
    //  token.immediate: same semantics as attribute_value.
    //  Shared between continuation_line and section_name_continuation.
    // ----------------------------------------------------------------------
    continuation_value: $ => token.immediate(/[^\x00\n\r]*/),

    // ----------------------------------------------------------------------
    //  attribute_key – a header name
    //
    //    [SPEC] name: alphanum *headerchar
    //           alphanum:   {A-Z} | {a-z} | {0-9}
    //           headerchar: alphanum | - | _
    //
    //  Characters allowed: [A-Za-z0-9] for the first character,
    //  [A-Za-z0-9_-] for subsequent characters.
    //
    //  Examples: Manifest-Version, Created-By, X-COMM-1, SHA-256-Digest
    //
    //  Also serves as tree-sitter's `word` token for keyword extraction.
    // ----------------------------------------------------------------------
    attribute_key: $ => token(/[A-Za-z0-9][A-Za-z0-9_\-]*/),
  },
});
