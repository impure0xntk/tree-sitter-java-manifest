; highlights.scm — tree-sitter queries for Java MANIFEST.MF
; Capture reference:
;   @keyword.import       — attribute_key (header name)
;   @string               — header_value (entire value including continuations)
;   @label                — section_name

; ── Header key ──────────────────────────────────
(attribute_entry
  key: (attribute_key) @keyword.import)

; ── Header value (entire value, continuations included) ──
(header_value) @string

; ── Section delimiter ("Name: …") ──────────────
(section_name_header
  name: (section_name) @label)
