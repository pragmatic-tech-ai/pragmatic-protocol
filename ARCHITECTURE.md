# pragmatic-protocol — Architecture Index

> Navigational map for orientation. Read this before re-exploring. **Maintenance rule:** when a change moves or renames a seam below, update this file in the same commit. Line numbers drift — trust the symbol name over the number.

**Package:** `@pragmatic-tech-ai/pragmatic-protocol` — the typed **JSON-RPC-over-WebSocket** protocol shared by the server (L4) and its clients. Contracts (method strings + request/notification types), wire DTOs, a transport seam, and a typed client. **No TODL dependency** — wire DTOs are *structural copies* (see `src/dto/wire-dtos.ts:290`,`:302`). ESM, NodeNext `.js` specifiers. Deps: `vscode-jsonrpc`, `vscode-languageserver-types`, `ws` (`package.json:17-21`).

---

## Layout

```
src/
  contracts/   one class per protocol surface (method strings + RequestType/NotificationType)
  dto/         wire-dtos.ts — all camelCase structural DTOs
  transport/   IMessageSocket seam + ws/in-memory adapters + vscode-jsonrpc reader/writer
  client/      PragmaticClient (typed, 1:1 per method)
  index.ts     barrel (also re-exports the vscode-jsonrpc runtime — see gotcha)
```

## Contracts (`src/contracts/`)

**Convention:** a `class` with `public static readonly` `RequestType`/`RequestType0`/`NotificationType` members; request types parameterized `<Params, Result, Error=void>`. Method string inlined in the ctor, OR hoisted to a `private static readonly` (as `CypherProtocol.QueryMethod`).

| Protocol | File | Methods (wire strings) |
| --- | --- | --- |
| `LanguageProtocol` | `language-protocol.ts:12` | 14 requests `language/*` (completions, hover, definition, references, prepareRename, rename, documentSymbols, foldingRanges, workspaceSymbols, semanticTokens, signatureHelp, codeActions, format, diagnostics) + 2 notifs `language/didChange`, `language/publishDiagnostics`. Result types reuse LSP types. |
| `SolutionProtocol` | `solution-protocol.ts:5` | `solution/open`, `solution/active` (RequestType0), `solution/graphChanged` (notif) |
| `ModelProtocol` | `model-protocol.ts:5` | `model/view`, `model/resources` |
| `ConnectorProtocol` | `connector-protocol.ts:6` | `connector/{list(0),prepare,refresh(0),read,writeBack,test}` |
| `AdminProtocol` | `admin-protocol.ts:5` | `admin/grants/{list,grant,revoke}`, `admin/config/{get(0),set}`, `admin/accounts/{list(0),create,disable}`, `admin/tokens/{list(0),issue,revoke}` |
| `CypherProtocol` | `cypher-protocol.ts:5` | `cypher/query` → `RequestType<CypherQueryParams, CypherQueryPageDto, void>`; `cypher/execute` → `RequestType<CypherExecuteParams, CypherExecuteResultDto, void>` (writes; development tenants only); `cypher/models` → `RequestType0<CypherModelListDto, void>` (the model shard ids a caller may pass as `modelId`; development tenants only). Method strings hoisted (`QueryMethod`, `ExecuteMethod`, `ModelsMethod`) |
| `GraphProtocol` | `graph-protocol.ts:5` | `graph/{create,list(0),get,delete,contribute,export,load,loaded(0)}`: the server's named graphs (packages contributed from a solution, exported, loaded/promoted) |
| `ApplicationDeployProtocol` | `pragmatic-app-deploy-protocol.ts:5` | `application/deploy` → `CypherAppDeployParamsDto` (app name/version, packages, UI bundle, servable manifest) → `AppDeployResultDto` (in-band `status`/`reason`) |
| `PragmaticAppProtocol` | `pragmatic-app-protocol.ts:5` | `application/list`, `application/open` (runtime-tenant application selection) |
| `AppDataProtocol` | `app-data-protocol.ts:5` | `data/write` (record write against the bound application) |
| `DataSharingProtocol` | `data-sharing-protocol.ts:5` | `data/share`, `data/unshare`, `data/shares/list` (SP-5 record sharing; `ShareSubjectKind`, share grant DTOs) |
| `DataAssignmentProtocol` | `data-assignment-protocol.ts:5` | `data/assign` → `AssignParams` `{ concept, id, owner: AssignOwnerDto, owningBu? }` → `AssignResultDto` `{ status: AssignStatus, reason? }`; `AssignStatus` = Applied / Denied / Invalid / NotFound / Unsupported |

## Wire DTOs (`src/dto/wire-dtos.ts`, ~900 lines, all camelCase)

Single file. Only external import: `Diagnostic/Position/Range` from `vscode-languageserver-types` (:1). One PascalCase outlier: `RenameErrorDto.Error` (:57).

- **Language params** (:3-50); **Solution/model** (:52-107: `OpenSolutionParams`, `ActiveSolutionSummary`, `SolutionGraphChangePayload`, `ModelViewParams`, `ModelViewPageDto`, `Page<T>`/`PageParams` (items/nextCursor envelope), `BuildState`, `BuildStateChangedPayload`, `ResolvedResourceDto`, …).
- **Connector** (:109-189: `ConnectorInfoDto`, `ConnectorModelDto`, `EntityDto`, `WriteResultDto`, …).
- **Admin** (:191-273: `GrantDto`, `IdentityConfigDto`, `AccountDto`, `ServiceTokenSummaryDto`, `TokenIssuedDto`, …).
- **Cypher** (`CypherParamValue` … `CypherExecuteResultDto`):
  - `CypherParamValue` recursive scalar/array/object union; `CypherQueryParams` `{ cypher, parameters?, modelId? }` + `PageParams` (`modelId` scopes the read to one model shard; a runtime tenant refuses it).
  - `CypherFieldSnapshotDto` `{ value, definitionOrigin, valueOrigin }` (:283).
  - `CypherNodeCellDto` (:291) — structural mirror of TODL MirrorSnapshot: `{ id, concept, class?, label, fields: map<CypherFieldSnapshotDto>, refs: map<string[]>, iconKey? }`.
  - `CypherCellDto` (:303) — recursive union; **node member precedes the generic-object member** (ordering matters for runtime narrowing).
  - `CypherQueryPageDto` — `Page<CypherCellDto[]>` + `{ columns: string[], truncated: boolean }` (rows are `items`, paging via `nextCursor`). Cursor codec: `PageCursorCodec` (`src/paging`); stale-cursor error code: `CursorStaleError` (-32032). Decode cells with `CypherCells.AsNode` / `AsMap` (`src/dto/cypher-cells.ts`).
  - `CypherModelListDto` `{ models }`; `CypherExecuteParams` `{ cypher, parameters?, modelId, expectedRevision? }` (`modelId` typed optional but REQUIRED by the server); `CypherExecuteResultDto` `{ status: AppWriteStatus, reason?, counts: CypherWriteCountsDto, revision, columns, rows, truncated }` (validation and access outcomes travel in-band as `status`).
  - Visibility is the server's concern, not the wire's: on a development tenant every `cypher/*`, `model/view` and `model/resources` answer is decided by the caller's engine access scope (rows and members outside it are never returned, hidden members are absent); the DTOs carry no visibility flags.
- **Application deploy / graphs** (`CypherAppDeployParamsDto`, `AppDeployResultDto`, `Graph*Dto`, `ContributedPackageDto`): see the contract rows above.

## Transport (`src/transport/`)

- **`IMessageSocket`** (`message-socket.ts:2`) — narrow seam: `Send(json)`, `OnMessage`, `OnError`, `OnClose`, `Close`. One text frame in/out.
- **`InMemoryMessageSocket`** (`in-memory-message-socket.ts:4`) — `static Pair()` (:11) cross-wires two for offline tests (delivery via `setImmediate`).
- **`WebSocketMessageReader`/`WebSocketMessageWriter`** (`web-socket-message-{reader,writer}.ts:6`) — extend vscode-jsonrpc `AbstractMessage*`; parse/stringify per frame, route failures to `fireError` not throw. Reader `dispose` is a no-op (socket lifetime owned by creator).
- **`WsMessageSocket`** (`ws-message-socket.ts:6`) — `ws` adapter; `readyState`-guarded sends; `ToText` normalizes string/Buffer[]/ArrayBuffer/Buffer → UTF-8 (:47).
- **⚠ CRITICAL shared-instance gotcha:** `src/index.ts:14` re-exports `createMessageConnection, NullLogger, ResponseError, ErrorCodes` from `vscode-jsonrpc`. The **server MUST import these from this barrel**, never its own copy — two runtime vscode-jsonrpc instances break RequestType identity ("Unknown parameter structure auto"). Two copies on *disk* are fine; a second runtime *instance* is not.

## Client (`src/client/pragmatic-client.ts`)

- **`PragmaticClient`** (:23), private ctor over a `MessageConnection` + `IMessageSocket`.
  - `static CreateOverSocket(socket)` (:37) — builds connection, `listen()`, returns client (shared-instance entry for in-memory/test wiring).
  - `static async ConnectAsync(url, { bearerToken? })` (:44) — opens `ws` (optional `Authorization: Bearer`), delegates to `CreateOverSocket(new WsMessageSocket(ws))`.
- `static async ConnectReconnecting(dialer, options)` — a reconnecting client over an `ISocketDialer` (`NodeClientWiring` builds the Node dialer); `State()` / `OnStateChanged` expose the connection state.
- Every protocol method is a 1:1 `sendRequest` wrapper (solution/language/model/connector; `CypherQuery` + `QueryAll` (pages to the end), `CypherExecute`, `CypherModels`; `DeployApplication`; `CreateGraph`/`ListGraphs`/`GetGraph`/`DeleteGraph`/`ContributeGraph`/`ExportGraph`/`LoadGraph`/`GetLoadedGraph`). `DidChange` is fire-and-forget. Notifs: `OnGraphChanged`, `OnDiagnostics` return `Disposable`. **No `AdminProtocol` wrappers** (admin consumed server-side/by admin tooling).

## Barrel (`src/index.ts`)

`export *` DTOs; `CursorStaleError`, `PageCursorCodec`; the twelve protocol classes (incl. `ApplicationDeployProtocol`, `GraphProtocol`, `PragmaticAppProtocol`, `AppDataProtocol`, `DataSharingProtocol`, `DataAssignmentProtocol`) and `CypherCells`; transport (sockets, reader/writer, `TransportCloseCode` + connection signals, `HeartbeatMonitor`); `PragmaticClient`, `NodeClientWiring`; vscode-jsonrpc runtime values + types (the shared-instance seam). `src/browser.ts` is the browser barrel (no Node-only wiring).

## Tests + build

- `node:test` + `node:assert/strict` via `tsx --test "src/**/*.test.ts"` (`package.json:15`); tests colocated under `tests/` subdirs. Round-trips wire two connections over `InMemoryMessageSocket.Pair()`. `barrel-parity.test.ts` keeps the Node and browser barrels in step.
- Build `tsc -p tsconfig.build.json` (excludes `*.test.ts`/`tests/**`); ES2022, NodeNext, strict, declaration; `dist/` mirrors `src/`, gitignored.

## To add a protocol method

1. Add the `static readonly` RequestType/NotificationType in the relevant `src/contracts/*.ts` (hoist the method string if reused).
2. Add params/result DTO in `src/dto/wire-dtos.ts` (camelCase).
3. Add a 1:1 wrapper in `PragmaticClient`.
4. Export new types from `src/index.ts`.
5. Server side lives in pragmatic-server — it consumes this barrel and must take vscode-jsonrpc via `src/index.ts:14-15`.
