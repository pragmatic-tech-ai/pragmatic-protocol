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

## Contracts

Source: `src/contracts/`.

**Convention:** a `class` with `public static readonly` `RequestType`/`RequestType0`/`NotificationType` members; request types parameterized `<Params, Result, Error=void>`. Method string inlined in the ctor, OR hoisted to a `private static readonly` (as `CypherProtocol.QueryMethod`).

| Protocol | File | Methods (wire strings) |
| --- | --- | --- |
| `LanguageProtocol` | `language-protocol.ts:12` | 14 requests `language/*` (completions, hover, definition, references, prepareRename, rename, documentSymbols, foldingRanges, workspaceSymbols, semanticTokens, signatureHelp, codeActions, format, diagnostics) + 2 notifs `language/didChange`, `language/publishDiagnostics`. Result types reuse LSP types. |
| `SolutionProtocol` | `solution-protocol.ts:5` | `solution/open`, `solution/active` (RequestType0), `solution/graphChanged` (notif) |
| `ModelProtocol` | `model-protocol.ts:5` | `model/view`, `model/resources` |
| `ConnectorProtocol` | `connector-protocol.ts:6` | `connector/{list(0),prepare,refresh(0),read,writeBack,test}` |
| `AdminProtocol` | `admin-protocol.ts:5` | `admin/grants/{list,grant,revoke}`, `admin/config/{get(0),set}`, `admin/security-model/{get(0),set}` (C5 setting), `admin/security-catalog/get(0)` → `SecurityCatalogDto`, `admin/team-members/list` (`ListTeamMembersParams`) → `TeamMemberDto[]`, `admin/security-changes/list(0)` → `SecurityChangesDto[]`, `admin/accounts/{list(0),create,disable}`, `admin/tokens/{list(0),issue,revoke}` |
| `CypherProtocol` | `cypher-protocol.ts:5` | `cypher/query` → `RequestType<CypherQueryParams, CypherQueryPageDto, void>`; `cypher/execute` → `RequestType<CypherExecuteParams, CypherExecuteResultDto, void>` (writes; both tenant purposes); `cypher/models` → `RequestType0<CypherModelListDto, void>` (the model ids a caller may pass as `modelId`: dev model ids, runtime package ids). Method strings hoisted (`QueryMethod`, `ExecuteMethod`, `ModelsMethod`) |
| `GraphProtocol` | `graph-protocol.ts:5` | `graph/{create,list(0),get,delete,contribute,export,load,loaded(0)}`: the server's named graphs (packages contributed from a solution, exported, loaded/promoted) |
| `ApplicationDeployProtocol` | `pragmatic-app-deploy-protocol.ts:5` | `application/deploy` → `CypherAppDeployParamsDto` (app name/version, packages, UI bundle, servable manifest) → `AppDeployResultDto` (in-band `status`/`reason`; `securityChanges?: SecurityChangesDto` when the deploy changed any security, 0.13.0) |
| `PragmaticAppProtocol` | `pragmatic-app-protocol.ts:5` | `application/list`, `application/open` (runtime-tenant application selection) |
| `AppDataProtocol` | `app-data-protocol.ts:5` | `data/write` (record write against the bound application), `data/changed` (notif, `DataChangedPayload { commit, concepts }`; runtime tenants only, see "data/changed" below) |
| `DataSharingProtocol` | `data-sharing-protocol.ts:5` | `data/share`, `data/unshare`, `data/shares/list` (SP-5 record sharing; `ShareSubjectKind`, share grant DTOs) |
| `DataAssignmentProtocol` | `data-assignment-protocol.ts:5` | `data/assign` → `AssignParams` `{ concept, id, owner: AssignOwnerDto, owningBu? }` → `AssignResultDto` `{ status: AssignStatus, reason? }`; `AssignStatus` = Applied / Denied / Invalid / NotFound / Unsupported |

## Wire DTOs

Source: `src/dto/wire-dtos.ts`, about 900 lines, all camelCase.

Single file. Only external import: `Diagnostic/Position/Range` from `vscode-languageserver-types` (:1). One PascalCase outlier: `RenameErrorDto.Error` (:57).

- **Language params** (:3-50); **Solution/model** (:52-107: `OpenSolutionParams`, `ActiveSolutionSummary`, `SolutionGraphChangePayload`, `ModelViewParams`, `ModelViewPageDto`, `Page<T>`/`PageParams` (items/nextCursor envelope), `BuildState`, `BuildStateChangedPayload`, `ResolvedResourceDto`, …).
- **Connector** (:109-189: `ConnectorInfoDto`, `ConnectorModelDto`, `EntityDto`, `WriteResultDto`, …).
- **Admin** (:191-273: `GrantDto`, `IdentityConfigDto`, `AccountDto`, `ServiceTokenSummaryDto`, `TokenIssuedDto`, …).
- **Security setting** (contract C5, 0.13.0): `SecurityModelDto` `{ businessUnits, users: UserPlacementDto[], teams: TeamDto { id, name, businessUnitId, idpGroups, manualMembers }, roleAssignments, profileAssignments, roleOverrides: RoleOverrideDto { role, concept, action, level }, profileOverrides: ProfileOverrideDto { profile, concept, field, read, update, create } }`, carried by `admin/security-model/{get,set}` (`SetSecurityModelParams`) and `IdentityConfigDto.securityModel`. Roles, profiles and secured fields come from the deployed packages, so the setting only places, assigns and overrides. The tier-2 shapes (membership claim rules, ownership rules, role configs, field-security profiles) are gone; action and level strings are the C1 values.
- **Security catalog** (0.13.0, `admin/security-catalog/get`): `SecurityCatalogDto` `{ roles: SecurityRoleDto { name, kind: SecurityRoleKind (Base | Package), package?, defaults: PrivilegeDto[] }, concepts: SecurityConceptDto { name, package, owned }, securedFields: SecuredFieldDto[], profiles: SecurityProfileDto { name, package, defaults: FieldAccessDto { concept, field, read, update, create }[] } }`: the vocabulary an admin edits the setting against.
- **Team members** (0.13.0, `admin/team-members/list`): `ListTeamMembersParams` `{ teamId }` → `TeamMemberDto` `{ principalId, origin: TeamMemberOrigin (Synced | Manual) }[]`; a principal both synced and manual is two rows.
- **Security changes** (0.13.0, `admin/security-changes/list` and `AppDeployResultDto.securityChanges`): `SecurityChangesDto` `{ at (ISO), delivery, version, roleDefaults: RoleDefaultChangeDto { role, concept, action, before, after }[], profileDefaults: ProfileDefaultChangeDto { profile, concept, field, before, after: FieldAccessDto | null }[], securedFieldsAdded, securedFieldsRemoved, roleOverridesDropped, profileOverridesDropped, rolesRemoved: RoleAssignmentDto[], profilesRemoved: ProfileAssignmentDto[] }`, newest first in the list.
- **Cypher** (`CypherParamValue` … `CypherExecuteResultDto`):
  - `CypherParamValue` recursive scalar/array/object union; `CypherQueryParams` `{ cypher, parameters?, modelId? }` + `PageParams` (`modelId` scopes the read to one model; see "Meaning of modelId, memberId and record id").
  - `CypherFieldSnapshotDto` `{ value, definitionOrigin, valueOrigin }` (:283).
  - `CypherNodeCellDto` (:291) — structural mirror of TODL MirrorSnapshot: `{ id, concept, class?, label, fields: map<CypherFieldSnapshotDto>, refs: map<string[]>, iconKey? }`.
  - `CypherCellDto` (:303) — recursive union; **node member precedes the generic-object member** (ordering matters for runtime narrowing).
  - `CypherQueryPageDto` — `Page<CypherCellDto[]>` + `{ columns: string[], truncated: boolean }` (rows are `items`, paging via `nextCursor`). Cursor codec: `PageCursorCodec` (`src/paging`); stale-cursor error code: `CursorStaleError` (-32032). Decode cells with `CypherCells.AsNode` / `AsMap` (`src/dto/cypher-cells.ts`).
  - `CypherModelListDto` `{ models }`; `CypherExecuteParams` `{ cypher, parameters?, modelId, expectedRevision? }` (`modelId` typed optional; the server requires it on a development tenant and takes it as optional on a runtime tenant); `CypherExecuteResultDto` `{ status: AppWriteStatus, reason?, counts: CypherWriteCountsDto, revision, columns, rows, truncated }` (validation and access outcomes travel in-band as `status`).
  - Visibility is the server's concern, not the wire's: on both tenant purposes every `cypher/*`, `connector/*`, `model/view`, `model/resources` and `data/*` answer is decided by the caller's engine access scope (rows and members outside it are never returned, hidden members are absent); the DTOs carry no visibility flags.
- **Application deploy / graphs** (`CypherAppDeployParamsDto`, `AppDeployResultDto`, `Graph*Dto`, `ContributedPackageDto`): see the contract rows above.

## Cursor semantics

Every paged answer (`cypher/query`, `connector/read*`, `model/view`) returns an opaque `nextCursor` (`PageCursorCodec`); a client passes it back unchanged with the same request and treats it as a token only.

- **Keyset, not offset.** On the engine-backed server a cursor encodes the engine's keyset position, so a commit between two pages neither repeats nor skips a row. The cursor binds the query text and parameters, the schema version and the caller's access scope.
- **Stale.** A cursor is stale (`CursorStaleError`, -32032) after a schema upgrade, after a security-setting edit, when presented by another principal, or when malformed. A new commit never stales it. A development tenant saves its `.todl` sources on every write, which upgrades its schema, so a dev cursor still stales after a write.
- **Offset fallback.** A `cypher/query` whose `ORDER BY` uses an expression that is not a returned column has no keyset position; its cursor carries an offset instead, and a commit between its pages may repeat or skip rows.
- **Short pages.** A page may hold fewer items than requested (a runtime `model/view` page drops rows that are not package members) while `nextCursor` stays present until the answer is exhausted.

## data/changed

`AppDataProtocol.Changed` (`data/changed`), received with `PragmaticClient.OnDataChanged(handler)`, which resubscribes after a reconnect. Runtime tenants only: a development tenant sends `solution/graphChanged` instead.

- **Payload.** `DataChangedPayload { commit: string, concepts: string[] }`. `commit` is the engine commit sequence number as decimal text; `concepts` is the sorted, de-duplicated set of concept names that changed.
- **Watermark.** `commit` is a monotonic watermark: never older than an earlier payload's, and it may repeat across payloads, so it is not a payload id. Compare commits numerically, not as strings.
- **Coalescing.** The server merges changes over a short window (50 ms): one payload carries the latest commit and the union of concepts. A payload is never sent empty.
- **Concept-level.** There are no record ids. A concept name covers its subconcepts, so a client treats an ancestor name as "maybe mine". A schema-level event (an upgrade, or the server reopening its engine) is announced as the root concept `todl.Element`. Only concepts the connection may read are sent; the filter is conservative, so a name can arrive for a concept in which the caller sees no change.
- **Resubscribe and catch up.** Changes made while the client was disconnected are not replayed. After a reconnect (or on `todl.Element`) a client re-runs its queries. External sources changed outside the server are not announced.

## Meaning of modelId, memberId and record id

- **`modelId` on a development tenant** is a model of the active solution (`cypher/models` lists them from the saved sources). **On a runtime tenant** it is a delivered package id (`cypher/models` lists them, sorted, without `todl.system`); the read or write is confined to that package's data (engine nodes it owns and the external rows of its bindings). An unknown id is InvalidParams "model not found".
- **`memberId`** (`model/view`): on a development tenant a solution member; on a runtime tenant a delivered package id, and an unknown one is InvalidRequest. Runtime items are the package's engine nodes (no schema, model or class nodes, no provenance) and `model/resources` is always empty.
- **Record `id`** (`EntityDto.id`, `ModelMemberDto.id`, `data/write` and `data/share|unshare|assign` ids, `ShareGrantDto.recordId`): the engine's public id of the node. A client may choose the id of a record it creates in `data/write`. An external (connector) record's id is minted from its binding and key, so it is stable for that row.

## Transport

Source: `src/transport/`.

- **`IMessageSocket`** (`message-socket.ts:2`) — narrow seam: `Send(json)`, `OnMessage`, `OnError`, `OnClose`, `Close`. One text frame in/out.
- **`InMemoryMessageSocket`** (`in-memory-message-socket.ts:4`) — `static Pair()` (:11) cross-wires two for offline tests (delivery via `setImmediate`).
- **`WebSocketMessageReader`/`WebSocketMessageWriter`** (`web-socket-message-{reader,writer}.ts:6`) — extend vscode-jsonrpc `AbstractMessage*`; parse/stringify per frame, route failures to `fireError` not throw. Reader `dispose` is a no-op (socket lifetime owned by creator).
- **`WsMessageSocket`** (`ws-message-socket.ts:6`) — `ws` adapter; `readyState`-guarded sends; `ToText` normalizes string/Buffer[]/ArrayBuffer/Buffer → UTF-8 (:47).
- **⚠ CRITICAL shared-instance gotcha:** `src/index.ts:14` re-exports `createMessageConnection, NullLogger, ResponseError, ErrorCodes` from `vscode-jsonrpc`. The **server MUST import these from this barrel**, never its own copy — two runtime vscode-jsonrpc instances break RequestType identity ("Unknown parameter structure auto"). Two copies on *disk* are fine; a second runtime *instance* is not.

## Client

Source: `src/client/pragmatic-client.ts`.

- **`PragmaticClient`** (:23), private ctor over a `MessageConnection` + `IMessageSocket`.
  - `static CreateOverSocket(socket)` (:37) — builds connection, `listen()`, returns client (shared-instance entry for in-memory/test wiring).
  - `static async ConnectAsync(url, { bearerToken? })` (:44) — opens `ws` (optional `Authorization: Bearer`), delegates to `CreateOverSocket(new WsMessageSocket(ws))`.
- `static async ConnectReconnecting(dialer, options)` — a reconnecting client over an `ISocketDialer` (`NodeClientWiring` builds the Node dialer); `State()` / `OnStateChanged` expose the connection state.
- Every protocol method is a 1:1 `sendRequest` wrapper (solution/language/model/connector; `CypherQuery` + `QueryAll` (pages to the end), `CypherExecute`, `CypherModels`; `DeployApplication`; `CreateGraph`/`ListGraphs`/`GetGraph`/`DeleteGraph`/`ContributeGraph`/`ExportGraph`/`LoadGraph`/`GetLoadedGraph`). `DidChange` is fire-and-forget. Notifs: `OnGraphChanged`, `OnDataChanged`, `OnDiagnostics` return `Disposable` (resubscribed on reconnect). **No `AdminProtocol` wrappers** (admin consumed server-side/by admin tooling).

## Barrel

Source: `src/index.ts`.

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
