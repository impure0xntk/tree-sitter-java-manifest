{
  description = "tree-sitter parser for Java MANIFEST.MF";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        info = builtins.fromJSON (builtins.readFile ./tree-sitter.json);

        # parser and queries
        tree-sitter-java-manifest = pkgs.tree-sitter.buildGrammar {
          language = "java_manifest_mf";
          version = info.metadata.version;
          src = ./. ;
        };
      in
      {
        packages = {
          default = tree-sitter-java-manifest;
          parser  = tree-sitter-java-manifest;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            tree-sitter
            nodejs
          ];

          shellHook = ''
            echo "tree-sitter dev shell"
            tree-sitter --version
          '';
        };
      });
}
