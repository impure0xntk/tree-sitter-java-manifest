import XCTest
import SwiftTreeSitter
import TreeSitterManifest

final class TreeSitterManifestTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_manifest())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Java manifest grammar")
    }
}
