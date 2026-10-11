import { RequestType, NotificationType } from 'vscode-jsonrpc'
import type {
    CodeAction, CompletionItem, Diagnostic, DocumentSymbol, FoldingRange, Hover,
    Location, Range, SemanticTokens, SignatureHelp, TextEdit, WorkspaceEdit, WorkspaceSymbol,
} from 'vscode-languageserver-types'
import type {
    CodeActionsParams, DidChangeParams, PositionParams, PublishDiagnosticsParams,
    ReferencesAtParams, RenameErrorDto, RenameParams, UriParams, WorkspaceSymbolsParams,
} from '../dto/wire-dtos.js'

/** JSON-RPC contracts mirroring ILanguageService 1:1. Each method string lives only in its declaration. */
export class LanguageProtocol
{
    public static readonly CompletionsAt = new RequestType<PositionParams, CompletionItem[], void>('language/completions')
    public static readonly HoverAt = new RequestType<PositionParams, Hover | null, void>('language/hover')
    public static readonly DefinitionAt = new RequestType<PositionParams, Location | null, void>('language/definition')
    public static readonly ReferencesAt = new RequestType<ReferencesAtParams, Location[], void>('language/references')
    public static readonly PrepareRename = new RequestType<PositionParams, Range | null, void>('language/prepareRename')
    public static readonly RenameEdits = new RequestType<RenameParams, WorkspaceEdit | RenameErrorDto, void>('language/rename')
    public static readonly DocumentSymbols = new RequestType<UriParams, DocumentSymbol[], void>('language/documentSymbols')
    public static readonly FoldingRanges = new RequestType<UriParams, FoldingRange[], void>('language/foldingRanges')
    public static readonly WorkspaceSymbols = new RequestType<WorkspaceSymbolsParams, WorkspaceSymbol[], void>('language/workspaceSymbols')
    public static readonly SemanticTokens = new RequestType<UriParams, SemanticTokens, void>('language/semanticTokens')
    public static readonly SignatureHelpAt = new RequestType<PositionParams, SignatureHelp | null, void>('language/signatureHelp')
    public static readonly CodeActions = new RequestType<CodeActionsParams, CodeAction[], void>('language/codeActions')
    public static readonly FormatDocument = new RequestType<UriParams, TextEdit[], void>('language/format')
    public static readonly DiagnosticsFor = new RequestType<UriParams, Diagnostic[], void>('language/diagnostics')
    public static readonly DidChange = new NotificationType<DidChangeParams>('language/didChange')
    public static readonly PublishDiagnostics = new NotificationType<PublishDiagnosticsParams>('language/publishDiagnostics')
}
