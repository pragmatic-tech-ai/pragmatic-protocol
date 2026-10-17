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
| `CypherProtocol` | `cypher-protocol.ts:5` | `cypher/query` → `RequestType<CypherQueryParams, CypherQueryPageDto, void>` (:9); method hoisted to `QueryMethod` (:7) |
| `PragmaticAppProtocol` | `pragmatic-app-protocol.ts:5` | `application/list`, `application/open` (runtime-tenant application selection) |
| `AppDataProtocol` | `app-data-protocol.ts:5` | `data/write` (record write against the bound application) |
| `DataSharingProtocol` | `data-sharing-protocol.ts:5` | `data/share`, `data/unshare`, `data/shares/list` (SP-5 record sharing; `ShareSubjectKind`, share grant DTOs) |
| `DataAssignmentProtocol` | `data-assignment-protocol.ts:5` | `data/assign` → `AssignParams` `{ concept, id, owner: AssignOwnerDto, owningBu? }` → `AssignResultDto` `{ status: AssignStatus, reason? }`; `AssignStatus` = Applied / Denied / Invalid / NotFound / Unsupported |

## Wire DTOs (`src/dto/wire-dtos.ts`, ~311 lines, all camelCase)

Single file. Only external import: `Diagnostic/Position/Range` from `vscode-languageserver-types` (:1). One PascalCase outlier: `RenameErrorDto.Error` (:57).

- **Language params** (:3-50); **Solution/model** (:52-107: `OpenSolutionParams`, `ActiveSolutionSummary`, `SolutionGraphChangePayload`, `ModelViewParams`, `ModelViewPageDto`, `Page<T>`/`PageParams` (items/nextCursor envelope), `BuildState`, `BuildStateChangedPayload`, `ResolvedResourceDto`, …).
- **Connector** (:109-189: `ConnectorInfoDto`, `ConnectorModelDto`, `EntityDto`, `WriteResultDto`, …).
- **Admin** (:191-273: `GrantDto`, `IdentityConfigDto`, `AccountDto`, `ServiceTokenSummaryDto`, `TokenIssuedDto`, …).
- **Cypher** (:275-310):
  - `CypherParamValue` recursive scalar/array/object union (:275); `CypherQueryParams` `{ cypher, parameters? }` (:277).
  - `CypherFieldSnapshotDto` `{ value, definitionOrigin, valueOrigin }` (:283).
  - `CypherNodeCellDto` (:291) — structural mirror of TODL MirrorSnapshot: `{ id, concept, class?, label, fields: map<CypherFieldSnapshotDto>, refs: map<string[]>, iconKey? }`.
  - `CypherCellDto` (:303) — recursive union; **node member precedes the generic-object member** (ordering matters for runtime narrowing).
  - `CypherQueryPageDto` — `Page<CypherCellDto[]>` + `{ columns: string[], truncated: boolean }` (rows are `items`, paging via `nextCursor`). Cursor codec: `PageCursorCodec` (`src/paging`); stale-cursor error code: `CursorStaleError` (-32032).

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
- Every protocol method is a 1:1 `sendRequest` wrapper (solution/language/model/`CypherQuery`:154/connector). `DidChange` is fire-and-forget. Notifs: `OnGraphChanged`, `OnDiagnostics` return `Disposable`. **No `AdminProtocol` wrappers** (admin consumed server-side/by admin tooling).

## Barrel (`src/index.ts`)

`export *` DTOs (:1); the ten protocol classes (:2-10; incl. `PragmaticAppProtocol`, `AppDataProtocol`, `DataSharingProtocol`, `DataAssignmentProtocol`); transport (:8-12); `PragmaticClient` (:13); vscode-jsonrpc runtime values + types (:14-15, the shared-instance seam).

## Tests + build

- `node:test` + `node:assert/strict` via `tsx --test "src/**/*.test.ts"` (`package.json:15`); tests colocated under `tests/` subdirs. Round-trips wire two connections over `InMemoryMessageSocket.Pair()`. Suite = 19.
- Build `tsc -p tsconfig.build.json` (excludes `*.test.ts`/`tests/**`); ES2022, NodeNext, strict, declaration; `dist/` mirrors `src/`, gitignored.

## To add a protocol method

1. Add the `static readonly` RequestType/NotificationType in the relevant `src/contracts/*.ts` (hoist the method string if reused).
2. Add params/result DTO in `src/dto/wire-dtos.ts` (camelCase).
3. Add a 1:1 wrapper in `PragmaticClient`.
4. Export new types from `src/index.ts`.
5. Server side lives in pragmatic-server — it consumes this barrel and must take vscode-jsonrpc via `src/index.ts:14-15`.
