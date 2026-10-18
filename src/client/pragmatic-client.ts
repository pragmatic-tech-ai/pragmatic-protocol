import { createMessageConnection, NullLogger, Emitter } from 'vscode-jsonrpc'
import type { Disposable, Emitter as EmitterType, MessageConnection, RequestType, RequestType0, NotificationType } from 'vscode-jsonrpc'
import { WebSocket } from 'ws'
import type {
    CodeAction, CompletionItem, Diagnostic, DocumentSymbol, FoldingRange, Hover,
    Location, Position, Range, SemanticTokens, SignatureHelp, TextEdit, WorkspaceEdit, WorkspaceSymbol,
} from 'vscode-languageserver-types'
import type { IMessageSocket } from '../transport/message-socket.js'
import { WebSocketMessageReader } from '../transport/web-socket-message-reader.js'
import { WebSocketMessageWriter } from '../transport/web-socket-message-writer.js'
import { WsMessageSocket } from '../transport/ws-message-socket.js'
import { MultiplexMessageSocket } from '../transport/multiplex-message-socket.js'
import { ConnectionLostError } from '../transport/transport-signals.js'
import { ConnectionState } from './connection-state.js'
import { ReconnectBackoff } from './reconnect-policy.js'
import type { ReconnectPolicy } from './reconnect-policy.js'
import type { ISocketDialer } from './socket-dialer.js'
import { LanguageProtocol } from '../contracts/language-protocol.js'
import { SolutionProtocol } from '../contracts/solution-protocol.js'
import { ModelProtocol } from '../contracts/model-protocol.js'
import { ConnectorProtocol } from '../contracts/connector-protocol.js'
import { CypherProtocol } from '../contracts/cypher-protocol.js'
import { PragmaticAppProtocol } from '../contracts/pragmatic-app-protocol.js'
import { AppDataProtocol } from '../contracts/app-data-protocol.js'
import { DataSharingProtocol } from '../contracts/data-sharing-protocol.js'
import { DataAssignmentProtocol } from '../contracts/data-assignment-protocol.js'
import type {
    ActiveSolutionSummary, ModelViewPageDto, PublishDiagnosticsParams, ResolvedResourceDto, RenameErrorDto, SolutionGraphChangePayload,
    ConnectorModelDto, EntityDto, FlushOutcomeDto, ConnectionProbeDto, CypherParamValue, CypherQueryPageDto, CypherExecuteResultDto, Page, PragmaticAppSummaryDto,
    AppWriteParams, AppWriteResultDto, ShareParams, ShareResultDto, UnshareParams, UnshareResultDto, ListSharesParams, ListSharesResultDto,
    AssignParams, AssignResultDto, BuildStateChangedPayload, PageParams,
} from '../dto/wire-dtos.js'

interface Subscription<P>
{
    type: NotificationType<P>
    handler: (params: P) => void
    live: Disposable
}

export interface ReconnectingOptions
{
    reconnect?: ReconnectPolicy
    readIdleMs?: number
    now?: () => number
    schedule?: (ms: number, fn: () => void) => void
}

/** Typed JSON-RPC client over a WebSocket (or any IMessageSocket); optionally auto-reconnecting over a dialer. */
export class PragmaticClient
{
    private static readonly AuthorizationHeader = 'Authorization'
    private static readonly BearerPrefix = 'Bearer '
    private static readonly DefaultReconnect: ReconnectPolicy = { initialDelayMs: 500, factor: 2, maxDelayMs: 30000 }
    private static readonly DefaultReadIdleMs = 60000

    private connection: MessageConnection
    private socket: IMessageSocket
    private readonly dialer: ISocketDialer | undefined
    private readonly backoff: ReconnectBackoff | undefined
    private readonly schedule: (ms: number, fn: () => void) => void
    private readonly now: () => number
    private readonly readIdleMs: number | undefined
    private readonly subscriptions = new Set<Subscription<unknown>>()
    private readonly stateChanged: EmitterType<ConnectionState> = new Emitter<ConnectionState>()
    private lost: { promise: Promise<never>, reject: (error: Error) => void }
    private state: ConnectionState = ConnectionState.Connecting
    private disposed = false
    private attempt = 0
    private lastInbound = 0
    private idleGeneration = 0

    private constructor(connection: MessageConnection, socket: IMessageSocket, dialer?: ISocketDialer, backoff?: ReconnectBackoff, options: ReconnectingOptions = {})
    {
        this.connection = connection
        this.socket = socket
        this.dialer = dialer
        this.backoff = backoff
        this.schedule = options.schedule ?? ((ms, fn) => { const timer = setTimeout(fn, ms); timer.unref() })
        this.now = options.now ?? (() => Date.now())
        this.readIdleMs = dialer === undefined ? undefined : (options.readIdleMs ?? PragmaticClient.DefaultReadIdleMs)
        this.lost = PragmaticClient.NewLost()
        this.WatchSocket(socket)
        this.SetState(ConnectionState.Open)
        this.ScheduleIdleCheck(++this.idleGeneration)
    }

    private static NewLost(): { promise: Promise<never>, reject: (error: Error) => void }
    {
        let reject: (error: Error) => void = () => {}
        const promise = new Promise<never>((_resolve, rej) => { reject = rej })
        promise.catch(() => {})
        return { promise, reject }
    }

    public static CreateOverSocket(raw: IMessageSocket): PragmaticClient
    {
        const socket = new MultiplexMessageSocket(raw)
        const connection = createMessageConnection(new WebSocketMessageReader(socket), new WebSocketMessageWriter(socket), NullLogger)
        connection.listen()
        return new PragmaticClient(connection, socket)
    }

    public static async ConnectAsync(url: string, options: { bearerToken?: string } = {}): Promise<PragmaticClient>
    {
        const socketOptions = options.bearerToken === undefined
            ? undefined
            : { headers: { [PragmaticClient.AuthorizationHeader]: PragmaticClient.BearerPrefix + options.bearerToken } }
        const ws = new WebSocket(url, socketOptions)
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

    public static async ConnectReconnecting(dialer: ISocketDialer, options: ReconnectingOptions = {}): Promise<PragmaticClient>
    {
        const socket = new MultiplexMessageSocket(await dialer.Dial())
        const connection = createMessageConnection(new WebSocketMessageReader(socket), new WebSocketMessageWriter(socket), NullLogger)
        connection.listen()
        return new PragmaticClient(connection, socket, dialer, new ReconnectBackoff(options.reconnect ?? PragmaticClient.DefaultReconnect), options)
    }

    public State(): ConnectionState
    {
        return this.state
    }

    public OnStateChanged(handler: (state: ConnectionState) => void): Disposable
    {
        return this.stateChanged.event(handler)
    }

    private SetState(state: ConnectionState): void
    {
        if (this.state === state)
        {
            return
        }
        this.state = state
        this.stateChanged.fire(state)
    }

    /** Wires close + inbound-activity tracking for a freshly installed socket. */
    private WatchSocket(socket: IMessageSocket): void
    {
        this.lastInbound = this.now()
        socket.OnMessage(() => { this.lastInbound = this.now() })
        socket.OnClose(() => this.OnDrop(socket))
    }

    /** Periodic read-idle check via the schedule seam; a chain retires when its generation is superseded. */
    private ScheduleIdleCheck(generation: number): void
    {
        if (this.readIdleMs === undefined || this.disposed || generation !== this.idleGeneration)
        {
            return
        }
        let scheduling = true
        this.schedule(this.readIdleMs, () =>
        {
            if (this.disposed || generation !== this.idleGeneration)
            {
                return
            }
            const inline = scheduling
            if (this.state === ConnectionState.Open && this.now() - this.lastInbound >= this.readIdleMs!)
            {
                this.OnDrop(this.socket)
                return
            }
            if (!inline)
            {
                this.ScheduleIdleCheck(generation)
            }
        })
        scheduling = false
    }

    private OnDrop(socket: IMessageSocket): void
    {
        if (this.disposed || this.dialer === undefined || socket !== this.socket || this.state === ConnectionState.Reconnecting)
        {
            return
        }
        // Any unexpected close — a server GoingAway (1001) or a transport drop — triggers reconnect; only a caller DisposeAsync (which sets `disposed` first) does not.
        this.idleGeneration++
        const lost = this.lost
        this.lost = PragmaticClient.NewLost()
        lost.reject(new ConnectionLostError())
        try
        {
            this.connection.dispose()
        }
        catch
        {
            // the connection may already be torn down
        }
        this.SetState(ConnectionState.Reconnecting)
        try
        {
            socket.Close()
        }
        catch
        {
            // the socket may already be closed
        }
        this.attempt++
        this.schedule(this.backoff!.Next(this.attempt), () => void this.Reconnect())
    }

    private async Reconnect(): Promise<void>
    {
        if (this.disposed || this.dialer === undefined)
        {
            return
        }
        try
        {
            const socket = new MultiplexMessageSocket(await this.dialer.Dial())
            if (this.disposed)
            {
                socket.Close()
                return
            }
            const connection = createMessageConnection(new WebSocketMessageReader(socket), new WebSocketMessageWriter(socket), NullLogger)
            connection.listen()
            this.socket = socket
            this.connection = connection
            for (const sub of this.subscriptions)
            {
                sub.live = connection.onNotification(sub.type, sub.handler)
            }
            this.WatchSocket(socket)
            this.attempt = 0
            this.SetState(ConnectionState.Open)
            this.ScheduleIdleCheck(++this.idleGeneration)
        }
        catch
        {
            this.attempt++
            this.schedule(this.backoff!.Next(this.attempt), () => void this.Reconnect())
        }
    }

    private Request<P, R, E>(type: RequestType<P, R, E>, params: P): Promise<R>
    {
        return Promise.race([this.connection.sendRequest(type, params), this.lost.promise])
    }

    private RequestNoParams<R>(type: RequestType0<R, void>): Promise<R>
    {
        return Promise.race([this.connection.sendRequest(type), this.lost.promise])
    }

    private Subscribe<P>(type: NotificationType<P>, handler: (params: P) => void): Disposable
    {
        const entry: Subscription<P> = { type, handler, live: this.connection.onNotification(type, handler) }
        this.subscriptions.add(entry as Subscription<unknown>)
        return { dispose: () =>
        {
            this.subscriptions.delete(entry as Subscription<unknown>)
            entry.live.dispose()
        } }
    }

    public OpenSolution(location: string): Promise<ActiveSolutionSummary>
    {
        return this.Request(SolutionProtocol.OpenSolution, { location })
    }

    public ActiveSolution(): Promise<ActiveSolutionSummary | null>
    {
        return this.RequestNoParams(SolutionProtocol.ActiveSolution)
    }

    public CompletionsAt(uri: string, position: Position): Promise<CompletionItem[]>
    {
        return this.Request(LanguageProtocol.CompletionsAt, { uri, position })
    }

    public HoverAt(uri: string, position: Position): Promise<Hover | null>
    {
        return this.Request(LanguageProtocol.HoverAt, { uri, position })
    }

    public DefinitionAt(uri: string, position: Position): Promise<Location | null>
    {
        return this.Request(LanguageProtocol.DefinitionAt, { uri, position })
    }

    public ReferencesAt(uri: string, position: Position, includeDeclaration: boolean): Promise<Location[]>
    {
        return this.Request(LanguageProtocol.ReferencesAt, { uri, position, includeDeclaration })
    }

    public PrepareRename(uri: string, position: Position): Promise<Range | null>
    {
        return this.Request(LanguageProtocol.PrepareRename, { uri, position })
    }

    public RenameEdits(uri: string, position: Position, newName: string): Promise<WorkspaceEdit | RenameErrorDto>
    {
        return this.Request(LanguageProtocol.RenameEdits, { uri, position, newName })
    }

    public DocumentSymbols(uri: string): Promise<DocumentSymbol[]>
    {
        return this.Request(LanguageProtocol.DocumentSymbols, { uri })
    }

    public FoldingRanges(uri: string): Promise<FoldingRange[]>
    {
        return this.Request(LanguageProtocol.FoldingRanges, { uri })
    }

    public WorkspaceSymbols(query: string): Promise<WorkspaceSymbol[]>
    {
        return this.Request(LanguageProtocol.WorkspaceSymbols, { query })
    }

    public SemanticTokens(uri: string): Promise<SemanticTokens>
    {
        return this.Request(LanguageProtocol.SemanticTokens, { uri })
    }

    public SignatureHelpAt(uri: string, position: Position): Promise<SignatureHelp | null>
    {
        return this.Request(LanguageProtocol.SignatureHelpAt, { uri, position })
    }

    public CodeActions(uri: string, range: Range, diagnostics: Diagnostic[]): Promise<CodeAction[]>
    {
        return this.Request(LanguageProtocol.CodeActions, { uri, range, diagnostics })
    }

    public FormatDocument(uri: string): Promise<TextEdit[]>
    {
        return this.Request(LanguageProtocol.FormatDocument, { uri })
    }

    public DiagnosticsFor(uri: string): Promise<Diagnostic[]>
    {
        return this.Request(LanguageProtocol.DiagnosticsFor, { uri })
    }

    public ModelView(memberId: string, page?: PageParams): Promise<ModelViewPageDto>
    {
        return this.Request(ModelProtocol.ModelView, { memberId, ...page })
    }

    public CypherQuery(cypher: string, parameters?: { [k: string]: CypherParamValue }, page?: PageParams, modelId?: string): Promise<CypherQueryPageDto>
    {
        return this.Request(CypherProtocol.Query, { cypher, parameters, modelId, ...page })
    }

    public async *QueryAll(cypher: string, parameters?: { [k: string]: CypherParamValue }, pageSize?: number, modelId?: string): AsyncIterable<CypherQueryPageDto>
    {
        let cursor: string | undefined
        do
        {
            const page: CypherQueryPageDto = await this.CypherQuery(cypher, parameters, { cursor, pageSize }, modelId)
            yield page
            cursor = page.nextCursor
        }
        while (cursor !== undefined)
    }

    public CypherExecute(cypher: string, parameters?: { [k: string]: CypherParamValue }, modelId?: string, expectedRevision?: number): Promise<CypherExecuteResultDto>
    {
        return this.Request(CypherProtocol.Execute, { cypher, parameters, modelId, expectedRevision })
    }

    public async *ReadAll(modelId: string, concept: string, pageSize?: number): AsyncIterable<Page<EntityDto>>
    {
        let cursor: string | undefined
        do
        {
            const page: Page<EntityDto> = await this.ReadEntities(modelId, concept, { cursor, pageSize })
            yield page
            cursor = page.nextCursor
        }
        while (cursor !== undefined)
    }

    public async *ModelViewAll(memberId: string, pageSize?: number): AsyncIterable<ModelViewPageDto>
    {
        let cursor: string | undefined
        do
        {
            const page: ModelViewPageDto = await this.ModelView(memberId, { cursor, pageSize })
            yield page
            cursor = page.nextCursor
        }
        while (cursor !== undefined)
    }

    public Resources(nodeId: string): Promise<ResolvedResourceDto[]>
    {
        return this.Request(ModelProtocol.Resources, { nodeId })
    }

    public DidChange(uri: string, text: string): void
    {
        this.connection.sendNotification(LanguageProtocol.DidChange, { uri, text }).catch(() => {})
    }

    public OnGraphChanged(handler: (change: SolutionGraphChangePayload) => void): Disposable
    {
        return this.Subscribe(SolutionProtocol.GraphChanged, handler)
    }

    public OnBuildStateChanged(handler: (payload: BuildStateChangedPayload) => void): Disposable
    {
        return this.Subscribe(SolutionProtocol.BuildStateChanged, handler)
    }

    public OnDiagnostics(handler: (params: PublishDiagnosticsParams) => void): Disposable
    {
        return this.Subscribe(LanguageProtocol.PublishDiagnostics, handler)
    }

    public Connectors(): Promise<ConnectorModelDto[]>
    {
        return this.RequestNoParams(ConnectorProtocol.List)
    }

    public ListApplications(): Promise<PragmaticAppSummaryDto[]>
    {
        return this.RequestNoParams(PragmaticAppProtocol.List)
    }

    public OpenApplication(name: string): Promise<PragmaticAppSummaryDto>
    {
        return this.Request(PragmaticAppProtocol.Open, { name })
    }

    public WriteAppData(params: AppWriteParams): Promise<AppWriteResultDto>
    {
        return this.Request(AppDataProtocol.Write, params)
    }

    public ShareRecord(params: ShareParams): Promise<ShareResultDto>
    {
        return this.Request(DataSharingProtocol.Share, params)
    }

    public UnshareRecord(params: UnshareParams): Promise<UnshareResultDto>
    {
        return this.Request(DataSharingProtocol.Unshare, params)
    }

    public ListRecordShares(params: ListSharesParams): Promise<ListSharesResultDto>
    {
        return this.Request(DataSharingProtocol.ListShares, params)
    }

    public AssignRecord(params: AssignParams): Promise<AssignResultDto>
    {
        return this.Request(DataAssignmentProtocol.Assign, params)
    }

    public PrepareConnectors(modelId: string): Promise<void>
    {
        return this.Request(ConnectorProtocol.Prepare, { modelId })
    }

    public RefreshConnectors(): Promise<void>
    {
        return this.RequestNoParams(ConnectorProtocol.Refresh)
    }

    public ReadEntities(modelId: string, concept: string, page?: PageParams): Promise<Page<EntityDto>>
    {
        return this.Request(ConnectorProtocol.Read, { modelId, concept, ...page })
    }

    public WriteBack(modelId: string, dirty: string[], deleted: string[]): Promise<FlushOutcomeDto>
    {
        return this.Request(ConnectorProtocol.WriteBack, { modelId, dirty, deleted })
    }

    public TestConnection(modelId: string, connectorName: string): Promise<ConnectionProbeDto>
    {
        return this.Request(ConnectorProtocol.Test, { modelId, connectorName })
    }

    public async DisposeAsync(): Promise<void>
    {
        this.disposed = true
        this.SetState(ConnectionState.Closed)
        this.connection.dispose()
        this.socket.Close()
    }
}
