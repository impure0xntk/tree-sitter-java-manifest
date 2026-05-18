; highlights.scm — tree-sitter queries for Java MANIFEST.MF
; Capture reference:
;   @keyword.import       — attribute_key (header name)
;   @string               — attribute_value, continuation_value
;   @label                — section_name

; ── Header key ──────────────────────────────────
(attribute_entry
  key: (attribute_key) @keyword.import)

; ── Header value (first-line value) ─────────────
(attribute_value) @string

; ── Continuation line value ─────────────────────
(continuation_line
  value: (continuation_value) @string)

; ── Section delimiter ("Name: …") ──────────────
(section_name_header
  name: (section_name) @label)
