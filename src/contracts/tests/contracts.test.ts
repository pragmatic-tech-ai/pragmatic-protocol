import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LanguageProtocol } from '../language-protocol.js'
import { SolutionProtocol } from '../solution-protocol.js'

test('language contracts carry their wire method names', () =>
{
    assert.equal(LanguageProtocol.CompletionsAt.method, 'language/completions')
    assert.equal(LanguageProtocol.HoverAt.method, 'language/hover')
    assert.equal(LanguageProtocol.DefinitionAt.method, 'language/definition')
    assert.equal(LanguageProtocol.ReferencesAt.method, 'language/references')
    assert.equal(LanguageProtocol.PrepareRename.method, 'language/prepareRename')
    assert.equal(LanguageProtocol.RenameEdits.method, 'language/rename')
    assert.equal(LanguageProtocol.DocumentSymbols.method, 'language/documentSymbols')
    assert.equal(LanguageProtocol.FoldingRanges.method, 'language/foldingRanges')
    assert.equal(LanguageProtocol.WorkspaceSymbols.method, 'language/workspaceSymbols')
    assert.equal(LanguageProtocol.SemanticTokens.method, 'language/semanticTokens')
    assert.equal(LanguageProtocol.SignatureHelpAt.method, 'language/signatureHelp')
    assert.equal(LanguageProtocol.CodeActions.method, 'language/codeActions')
    assert.equal(LanguageProtocol.FormatDocument.method, 'language/format')
    assert.equal(LanguageProtocol.DiagnosticsFor.method, 'language/diagnostics')
    assert.equal(LanguageProtocol.DidChange.method, 'language/didChange')
    assert.equal(LanguageProtocol.PublishDiagnostics.method, 'language/publishDiagnostics')
})

test('solution contracts carry their wire method names', () =>
{
    assert.equal(SolutionProtocol.OpenSolution.method, 'solution/open')
    assert.equal(SolutionProtocol.ActiveSolution.method, 'solution/active')
    assert.equal(SolutionProtocol.GraphChanged.method, 'solution/graphChanged')
})
