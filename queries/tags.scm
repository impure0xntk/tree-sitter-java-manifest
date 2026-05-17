; tags.scm — tree-sitter tagging queries for Java MANIFEST.MF
; Capture reference:
;   @tag                  — section_name_header ("Name:" delimiter)

; ── Section delimiter ("Name: …") ──────────────
(section_name_header) @tag

; ── Section body ───────────────────────────────
(individual_section) @tag
