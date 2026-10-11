import { createMessageConnection, NullLogger } from 'vscode-jsonrpc'
import type { Disposable, MessageConnection } from 'vscode-jsonrpc'
import { WebSocket } from 'ws'
import type {
    CodeAction, CompletionItem, Diagnostic, DocumentSymbol, FoldingRange, Hover,
    Location, Position, Range, SemanticTokens, SignatureHelp, TextEdit, WorkspaceEdit, WorkspaceSymbol,
} from 'vscode-languageserver-types'
import type { IMessageSocket } from '../transport/message-socket.js'
import { WebSocketMessageReader } from '../transport/web-socket-message-reader.js'
import { WebSocketMessageWriter } from '../transport/web-socket-message-writer.js'
import { WsMessageSocket } from '../transport/ws-message-socket.js'
import { LanguageProtocol } from '../contracts/language-protocol.js'
import { SolutionProtocol } from '../contracts/solution-protocol.js'
import { ModelProtocol } from '../contracts/model-protocol.js'
import type {
    ActiveSolutionSummary, ModelProjection, PublishDiagnosticsParams, ResolvedResourceDto, RenameErrorDto, SolutionGraphChangePayload,
} from '../dto/wire-dtos.js'

/** Typed JSON-RPC client over a WebSocket (or any IMessageSocket). */
export class PragmaticClient
{
    private readonly connection: MessageConnection
    private readonly socket: IMessageSocket

    private constructor(connection: MessageConnection, socket: IMessageSocket)
    {
        this.connection = connection
        this.socket = socket
    }

    public static CreateOverSocket(socket: IMessageSocket): PragmaticClient
    {
        const connection = createMessageConnection(new WebSocketMessageReader(socket), new WebSocketMessageWriter(socket), NullLogger)
        connection.listen()
        return new PragmaticClient(connection, socket)
    }

    public static async ConnectAsync(url: string): Promise<PragmaticClient>
    {
        const ws = new WebSocket(url)
        await new Promise<void>((resolve, reject) =>
        {
            const onOpen = () =>
            {
                ws.off('error', onError)
                resolve()
            }
            const onError = (error: Error) =>
            {
                ws.off('open', onOpen)
                ws.close()
                reject(error)
            }
            ws.once('open', onOpen)
            ws.once('error', onError)
        })
        return PragmaticClient.CreateOverSocket(new WsMessageSocket(ws))
    }

    public OpenSolution(location: string): Promise<ActiveSolutionSummary>
    {
        return this.connection.sendRequest(SolutionProtocol.OpenSolution, { location })
    }

    public ActiveSolution(): Promise<ActiveSolutionSummary | null>
    {
        return this.connection.sendRequest(SolutionProtocol.ActiveSolution)
    }

    public CompletionsAt(uri: string, position: Position): Promise<CompletionItem[]>
    {
        return this.connection.sendRequest(LanguageProtocol.CompletionsAt, { uri, position })
    }

    public HoverAt(uri: string, position: Position): Promise<Hover | null>
    {
        return this.connection.sendRequest(LanguageProtocol.HoverAt, { uri, position })
    }

    public DefinitionAt(uri: string, position: Position): Promise<Location | null>
    {
        return this.connection.sendRequest(LanguageProtocol.DefinitionAt, { uri, position })
    }

    public ReferencesAt(uri: string, position: Position, includeDeclaration: boolean): Promise<Location[]>
    {
        return this.connection.sendRequest(LanguageProtocol.ReferencesAt, { uri, position, includeDeclaration })
    }

    public PrepareRename(uri: string, position: Position): Promise<Range | null>
    {
        return this.connection.sendRequest(LanguageProtocol.PrepareRename, { uri, position })
    }

    public RenameEdits(uri: string, position: Position, newName: string): Promise<WorkspaceEdit | RenameErrorDto>
    {
        return this.connection.sendRequest(LanguageProtocol.RenameEdits, { uri, position, newName })
    }

    public DocumentSymbols(uri: string): Promise<DocumentSymbol[]>
    {
        return this.connection.sendRequest(LanguageProtocol.DocumentSymbols, { uri })
    }

    public FoldingRanges(uri: string): Promise<FoldingRange[]>
    {
        return this.connection.sendRequest(LanguageProtocol.FoldingRanges, { uri })
    }

    public WorkspaceSymbols(query: string): Promise<WorkspaceSymbol[]>
    {
        return this.connection.sendRequest(LanguageProtocol.WorkspaceSymbols, { query })
    }

    public SemanticTokens(uri: string): Promise<SemanticTokens>
    {
        return this.connection.sendRequest(LanguageProtocol.SemanticTokens, { uri })
    }

    public SignatureHelpAt(uri: string, position: Position): Promise<SignatureHelp | null>
    {
        return this.connection.sendRequest(LanguageProtocol.SignatureHelpAt, { uri, position })
    }

    public CodeActions(uri: string, range: Range, diagnostics: Diagnostic[]): Promise<CodeAction[]>
    {
        return this.connection.sendRequest(LanguageProtocol.CodeActions, { uri, range, diagnostics })
    }

    public FormatDocument(uri: string): Promise<TextEdit[]>
    {
        return this.connection.sendRequest(LanguageProtocol.FormatDocument, { uri })
    }

    public DiagnosticsFor(uri: string): Promise<Diagnostic[]>
    {
        return this.connection.sendRequest(LanguageProtocol.DiagnosticsFor, { uri })
    }

    public ModelView(memberId: string): Promise<ModelProjection>
    {
        return this.connection.sendRequest(ModelProtocol.ModelView, { memberId })
    }

    public Resources(nodeId: string): Promise<ResolvedResourceDto[]>
    {
        return this.connection.sendRequest(ModelProtocol.Resources, { nodeId })
    }

    public DidChange(uri: string, text: string): void
    {
        this.connection.sendNotification(LanguageProtocol.DidChange, { uri, text }).catch(() => {})
    }

    public OnGraphChanged(handler: (change: SolutionGraphChangePayload) => void): Disposable
    {
        return this.connection.onNotification(SolutionProtocol.GraphChanged, handler)
    }

    public OnDiagnostics(handler: (params: PublishDiagnosticsParams) => void): Disposable
    {
        return this.connection.onNotification(LanguageProtocol.PublishDiagnostics, handler)
    }

    public async DisposeAsync(): Promise<void>
    {
        this.connection.dispose()
        this.socket.Close()
    }
}
