import XCTest
import SwiftTreeSitter
import TreeSitterJavaManifest

final class TreeSitterJavaManifestTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_java_manifest())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Java manifest grammar")
    }
}
