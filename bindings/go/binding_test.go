package tree_sitter_java_manifest_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_java_manifest "github.com/impure0xntk/tree-sitter-java-manifest/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_java_manifest.Language())
	if language == nil {
		t.Errorf("Error loading Java manifest grammar")
	}
}
