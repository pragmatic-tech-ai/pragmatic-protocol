import type { Diagnostic, Position, Range } from 'vscode-languageserver-types'

export interface UriParams
{
    uri: string
}

export interface PositionParams
{
    uri: string
    position: Position
}

export interface ReferencesAtParams
{
    uri: string
    position: Position
    includeDeclaration: boolean
}

export interface RenameParams
{
    uri: string
    position: Position
    newName: string
}

export interface CodeActionsParams
{
    uri: string
    range: Range
    diagnostics: Diagnostic[]
}

export interface WorkspaceSymbolsParams
{
    query: string
}

export interface DidChangeParams
{
    uri: string
    text: string
}

export interface PublishDiagnosticsParams
{
    uri: string
    diagnostics: Diagnostic[]
}

export interface OpenSolutionParams
{
    location: string
}

export interface RenameErrorDto
{
    Error: string
}

export interface SolutionMemberSummary
{
    id: string
    type: string
}

export enum BuildState
{
    Building = 'building',
    Ready = 'ready',
    Failed = 'failed',
}

export interface ActiveSolutionSummary
{
    name: string
    members: SolutionMemberSummary[]
    buildState: BuildState
}

export interface BuildStateChangedPayload
{
    buildState: BuildState
}

export interface PageParams
{
    cursor?: string
    pageSize?: number
}

export interface Page<T>
{
    items: T[]
    nextCursor?: string
}

export interface SolutionGraphChangePayload
{
    memberIds: string[]
    fileIds: string[]
}

export interface ModelViewParams extends PageParams
{
    memberId: string
}

export interface ResourcesParams
{
    nodeId: string
}

export interface ModelEdgeDto
{
    kind: string
    via: string | null
    to: string
}

export interface ModelMemberDto
{
    id: string
    kind: string | null
    localId: string
    namespace: string
    tier: string
    isClass: boolean
    attrs: Record<string, string | number | boolean | null>
    edges: ModelEdgeDto[]
}

export interface ModelViewPageDto extends Page<ModelMemberDto>
{
    provenanceOf: Record<string, string>
}

export interface ResolvedResourceDto
{
    annotation: string
    path: string
    storageRoot: string
}

export interface ConnectorInfoDto
{
    name: string
    kind: string
}

export interface BindingDto
{
    concept: string
    connector: string
    source: string
    writable: boolean
}

export interface ConnectorModelDto
{
    modelId: string
    connectors: ConnectorInfoDto[]
    bindings: BindingDto[]
}

export interface ConnectionProbeDto
{
    ok: boolean
    detail?: string
}

export interface ConnectorTestParams
{
    modelId: string
    connectorName: string
}

export interface ConnectorPrepareParams
{
    modelId: string
}

export interface ConnectorReadParams extends PageParams
{
    modelId: string
    concept: string
    /** connector/readPage only: an AND of filter terms over the concept's MODEL members, applied at the source. */
    where?: ConnectorFilterTermDto[]
}

/** Filter operator of a paged connector read (SQL semantics: a null field satisfies only isNull). */
export enum ConnectorFilterOp
{
    Eq = 'eq',
    Neq = 'neq',
    Lt = 'lt',
    Lte = 'lte',
    Gt = 'gt',
    Gte = 'gte',
    In = 'in',
    IsNull = 'isNull',
    IsNotNull = 'isNotNull',
}

/** One filter term: `value` is the operand of eq..gte, `values` the set of in; isNull / isNotNull take neither. */
export interface ConnectorFilterTermDto
{
    field: string
    op: ConnectorFilterOp
    value?: string | number | boolean | null
    values?: (string | number | boolean | null)[]
}

export enum ConnectorWriteOp
{
    Upsert = 'upsert',
    Delete = 'delete',
}

export interface ConnectorWriteOpDto
{
    op: ConnectorWriteOp
    concept: string
    connector: string
    source: string
    key: string | number | boolean
    fields?: Record<string, string | number | boolean | null>
    expectedVersion?: string | number | boolean | null
}

export interface ConnectorPagedWriteParams
{
    modelId: string
    operations: ConnectorWriteOpDto[]
}

export interface ConnectorWriteOpResultDto
{
    key: string | number | boolean | null
    status: AppWriteStatus
    reason?: string
    /** An applied optimistic upsert's new version (bumped by the server): the expectedVersion of the next write. */
    version?: string | number | boolean | null
}

export interface ConnectorPagedWriteResultDto
{
    results: ConnectorWriteOpResultDto[]
}

export interface ConnectorWriteBackParams
{
    modelId: string
    dirty: string[]
    deleted: string[]
}

export interface EntityDto
{
    id: string
    concept: string
    fields: Record<string, string | number | boolean | null>
}

export interface WriteFailureDto
{
    key: string | number | boolean | null
    kind: string
    reason: string
}

export interface WriteResultDto
{
    applied: number
    failures: WriteFailureDto[]
}

export interface DiagnosticDto
{
    code: string
    message: string
}

export interface FlushOutcomeDto
{
    results: WriteResultDto[]
    diagnostics: DiagnosticDto[]
}

export interface ConnectorRefreshModelParams
{
    modelId: string
}

export interface ConnectorRefreshOutcomeDto
{
    diagnostics: DiagnosticDto[]
}

export interface ConnectorDecisionsParams
{
    modelId: string
    /** Only the decisions for this merged (canonical) instance; all visible ones when omitted. */
    canonical?: string
}

/** One merge-audit decision: which source supplied a merged instance's field value, and under which merge rule. */
export interface ConnectorMergeDecisionDto
{
    /** The canonical (surviving) instance id the members merged into. */
    canonical: string
    /** The field whose value was decided. */
    member: string
    /** The winning source tag (`connector.source`), empty for a hand-authored value. */
    source: string
    /** The member instance whose value won. */
    winningNode: string
    /** The declared merge strategy that picked it (e.g. `source`, `latest`); absent for the default rule. */
    strategy?: string
}

export interface GrantDto
{
    subject: string
    role: string
    resourceKind: string
    resourcePath: string[]
}

export interface GrantMutationDto
{
    subject: string
    role: string
    resourceKind?: string
    resourcePath?: string[]
}

export interface ListGrantsParams
{
    subject: string
}

export interface BusinessUnitDto
{
    id: string
    name: string
    parent?: string
}

/** Where a principal sits in the business-unit tree (contract C5). */
export interface UserPlacementDto
{
    principalId: string
    businessUnitId: string
}

export interface TeamDto
{
    id: string
    name: string
    businessUnitId: string
    idpGroups: string[]
    manualMembers: string[]
}

export interface RoleAssignmentDto
{
    role: string
    principalIds: string[]
    teamIds: string[]
}

export interface ProfileAssignmentDto
{
    profile: string
    principalIds: string[]
    teamIds: string[]
}

/** One role's depth for one action on one concept, replacing the package default (C1 action and level strings). */
export interface RoleOverrideDto
{
    role: string
    concept: string
    action: string
    level: string
}

export interface ProfileOverrideDto
{
    profile: string
    concept: string
    field: string
    read: boolean
    update: boolean
    create: boolean
}

export interface PrivilegeDto
{
    action: string
    concept: string
    level: string
}

export interface SecuredFieldDto
{
    concept: string
    field: string
}

/** Whether a catalog role is one of the platform base roles or a package-declared role (C4). */
export enum SecurityRoleKind
{
    Base = 'base',
    Package = 'package',
}

/** One role of an environment's security catalog: its package defaults, keyed Base or Package (then its declaring package). */
export interface SecurityRoleDto
{
    name: string
    kind: SecurityRoleKind
    /** The declaring package model id for a Package role; absent for a base role. */
    package?: string
    defaults: PrivilegeDto[]
}

/** One engine-stored concept the platform security governs: its home package and whether it carries the ownership aspect. */
export interface SecurityConceptDto
{
    name: string
    package: string
    owned: boolean
}

/** The rights a field profile grants on one secured field. */
export interface FieldAccessDto
{
    concept: string
    field: string
    read: boolean
    update: boolean
    create: boolean
}

/** One field profile of an environment's security catalog: its package and the per-field rights it grants. */
export interface SecurityProfileDto
{
    name: string
    package: string
    defaults: FieldAccessDto[]
}

/** The security vocabulary an admin edits the C5 setting against: the environment's roles, concepts, secured fields and profiles. */
export interface SecurityCatalogDto
{
    roles: SecurityRoleDto[]
    concepts: SecurityConceptDto[]
    securedFields: SecuredFieldDto[]
    profiles: SecurityProfileDto[]
}

/** Whether a team member comes from an IdP-linked group or a manual roster entry (S3 MembershipOrigin). */
export enum TeamMemberOrigin
{
    Synced = 'synced',
    Manual = 'manual',
}

/** One row of a team's effective membership: a principal and where the membership comes from. */
export interface TeamMemberDto
{
    principalId: string
    origin: TeamMemberOrigin
}

export interface ListTeamMembersParams
{
    teamId: string
}

/** An environment's security setting (contract C5): placement, teams, assignments and overrides; roles come from packages. */
export interface SecurityModelDto
{
    businessUnits: BusinessUnitDto[]
    users: UserPlacementDto[]
    teams: TeamDto[]
    roleAssignments: RoleAssignmentDto[]
    profileAssignments: ProfileAssignmentDto[]
    roleOverrides: RoleOverrideDto[]
    profileOverrides: ProfileOverrideDto[]
}

export interface SetSecurityModelParams
{
    securityModel: SecurityModelDto
}

/** One role default a deploy changed, per (role, concept, action); `before` / `after` are C1 level strings, absent = `none`. */
export interface RoleDefaultChangeDto
{
    role: string
    concept: string
    action: string
    before: string
    after: string
}

/** One profile default a deploy changed, per (profile, concept, field); null = the profile did not grant the field. */
export interface ProfileDefaultChangeDto
{
    profile: string
    concept: string
    field: string
    before: FieldAccessDto | null
    after: FieldAccessDto | null
}

/**
 * One deploy's or promote's security changes (the change log entry and `AppDeployResultDto.securityChanges`): the
 * package-default changes, the secured fields added and removed, and the setting entries the new packages cannot mean
 * (dropped overrides, assignments of removed roles and profiles), which the deploy pruned from the setting.
 */
export interface SecurityChangesDto
{
    /** ISO time the change was applied. */
    at: string
    /** The app name (deploy) or the promote set name (promote). */
    delivery: string
    version: string
    roleDefaults: RoleDefaultChangeDto[]
    profileDefaults: ProfileDefaultChangeDto[]
    securedFieldsAdded: SecuredFieldDto[]
    securedFieldsRemoved: SecuredFieldDto[]
    roleOverridesDropped: RoleOverrideDto[]
    profileOverridesDropped: ProfileOverrideDto[]
    rolesRemoved: RoleAssignmentDto[]
    profilesRemoved: ProfileAssignmentDto[]
}

export interface IdentityConfigDto
{
    packId: string
    delegationDepth: string
    providerSettings: Record<string, string>
    groupRoleMap: Record<string, string>
    claimsMapping: Record<string, string>
    securityModel?: SecurityModelDto
}

export interface AdminAckDto
{
    ok: true
}

export interface AccountDto
{
    principalId: string
    email: string
    disabled: boolean
}

export interface CreateAccountParams
{
    email: string
    principalId: string
    password: string
}

export interface DisableAccountParams
{
    principalId: string
}

export interface ServiceTokenSummaryDto
{
    tokenRef: string
    principalId: string
    scopes: string[]
    expiresAt: string | null
    revoked: boolean
}

export interface IssueTokenParams
{
    principalId: string
    scopes: string[]
    expiresInSeconds: number | null
}

export interface TokenIssuedDto
{
    tokenRef: string
    token: string
    principalId: string
    scopes: string[]
    expiresAt: string | null
}

export interface RevokeTokenParams
{
    tokenRef: string
}

export interface InvalidatePackParams
{
    name: string
}

export interface PackScriptsParams
{
    name: string
}

export interface ScriptAllowlistDto
{
    names: string[]
}

export type CypherParamValue = string | number | boolean | null | CypherParamValue[] | { [k: string]: CypherParamValue }

export interface CypherQueryParams extends PageParams
{
    cypher: string
    parameters?: { [k: string]: CypherParamValue }
    modelId?: string
}

export interface CypherFieldSnapshotDto
{
    value: string | number | boolean | null
    definitionOrigin: string
    valueOrigin: string
}

// Mirrors TODL MirrorSnapshot (structural copy; no TODL dependency).
export interface CypherNodeCellDto
{
    id: string
    concept: string
    class?: string
    label: string
    fields: { [name: string]: CypherFieldSnapshotDto }
    refs: { [name: string]: string[] }
    iconKey?: string
}

/** A node cell: the node under the reserved `$node` key. A map whose sole key is `$node` or `$map` travels escaped as
 *  `{ "$map": entries }`, so no map a query builds can pass for a node. Decode with CypherCells. */
export interface CypherNodeCell
{
    $node: CypherNodeCellDto
}

// Mirrors CypherValueDto. The node member precedes the generic-object member.
export type CypherCellDto = string | number | boolean | null | CypherNodeCell | CypherCellDto[] | { [k: string]: CypherCellDto }

/** The model shard ids a principal may target with a model-scoped cypher/query or cypher/execute. */
export interface CypherModelListDto
{
    models: string[]
}

export interface CypherQueryPageDto extends Page<CypherCellDto[]>
{
    columns: string[]
    truncated: boolean
}

export interface CypherExecuteParams
{
    cypher: string
    parameters?: { [k: string]: CypherParamValue }
    /** Typed optional on the wire (consistent with the read side), but the cypher/execute server REQUIRES it and returns InvalidParams if omitted. */
    modelId?: string
    expectedRevision?: number
}

export interface CypherWriteCountsDto
{
    nodesCreated: number
    nodesDeleted: number
    relationshipsCreated: number
    relationshipsDeleted: number
    propertiesSet: number
}

export interface CypherExecuteResultDto
{
    status: AppWriteStatus
    reason?: string
    counts: CypherWriteCountsDto
    revision: number
    columns: string[]
    rows: CypherCellDto[][]
    truncated: boolean
}

export interface PragmaticAppSummaryDto
{
    name: string
    version: string
}

export interface OpenPragmaticAppParams
{
    name: string
}

export enum AppWriteOpKind
{
    Create = 'create',
    Update = 'update',
    Delete = 'delete',
}

export enum AppWriteStatus
{
    Applied = 'applied',
    Conflict = 'conflict',
    Denied = 'denied',
    Invalid = 'invalid',
    Failed = 'failed',
}

export interface AppWriteOpDto
{
    op: AppWriteOpKind
    concept: string
    id?: string
    fields?: Record<string, unknown>
}

export interface AppWriteParams
{
    operations: AppWriteOpDto[]
}

export interface AppWriteOpResultDto
{
    status: AppWriteStatus
    id?: string
    reason?: string
}

export interface AppWriteResultDto
{
    results: AppWriteOpResultDto[]
}

/** `data/changed` push: the concepts (sorted, each covering its subconcepts) a commit touched, filtered to the connection's read scope. */
export interface DataChangedPayload
{
    /**
     * Engine commit sequence number, decimal: a monotonic watermark, never older than
     * an earlier payload's; it may repeat across payloads and is not a unique payload id.
     */
    commit: string
    concepts: string[]
}

export enum ShareSubjectKind
{
    Principal = 'principal',
    Team = 'team',
}

export enum ShareStatus
{
    Applied = 'applied',
    Denied = 'denied',
    Invalid = 'invalid',
    NotFound = 'not-found',
}

export interface ShareSubjectDto
{
    kind: ShareSubjectKind
    id: string
}

export interface ShareGrantDto
{
    concept: string
    recordId: string
    subject: ShareSubjectDto
    rights: string[]
}

export interface ShareParams
{
    concept: string
    id: string
    subject: ShareSubjectDto
    rights: string[]
}

export interface ShareResultDto
{
    status: ShareStatus
    reason?: string
}

export interface UnshareParams
{
    concept: string
    id: string
    subject: ShareSubjectDto
}

export interface UnshareResultDto
{
    status: ShareStatus
    reason?: string
}

export interface ListSharesParams
{
    concept: string
    id: string
}

export interface ListSharesResultDto
{
    grants: ShareGrantDto[]
}

export enum AssignStatus
{
    Applied = 'applied',
    Denied = 'denied',
    Invalid = 'invalid',
    NotFound = 'not-found',
    Unsupported = 'unsupported',
}

export interface AssignOwnerDto
{
    kind: ShareSubjectKind
    id: string
}

export interface AssignParams
{
    concept: string
    id: string
    owner: AssignOwnerDto
    owningBu?: string
}

export interface AssignResultDto
{
    status: AssignStatus
    reason?: string
}

/** Descriptor of a servable app. Authority: the server validates CypherAppDeployParamsDto.packages as the authoritative deployable closure; manifest.packages must correspond to it. */
export interface ServableAppManifestDto
{
    name: string
    version: string
    packages: { id: string; version: string }[]
    ui: { entry: string; assets: string[] }
}

/** Deploy request. Authority: the server validates `packages` as the authoritative deployable closure; `manifest.packages` must correspond to it. */
export interface CypherAppDeployParamsDto
{
    appName: string
    appVersion: string
    packages: { id: string; version: string; modelJson: string }[]
    uiBundle: { path: string; contentBase64: string }[]
    manifest: ServableAppManifestDto
}

/** Deploy outcome. Error channel: validation outcomes travel in-band as `status` (+ optional `reason`, which must stay secret-free); protocol/transport failures travel as a JSON-RPC ResponseError. */
export interface AppDeployResultDto
{
    status: AppWriteStatus
    reason?: string
    appName: string
    appVersion: string
    /** The deploy's security changes, present when it changed any (S4 Task 13). */
    securityChanges?: SecurityChangesDto
}

/** Params for creating a named graph. */
export interface GraphCreateParamsDto
{
    graphName: string
    description: string
}

/** Params identifying an existing graph by name. */
export interface GraphRefParamsDto
{
    graphName: string
}

/** Listing row for a graph. */
export interface GraphSummaryDto
{
    name: string
    description: string
    packageCount: number
    createdAt: string
}

/** Full graph description including its packages. */
export interface GraphDetailDto
{
    name: string
    description: string
    packages: { id: string; version: string }[]
    createdAt: string
}

/** One package contributed to a graph: its id, version and compiled model JSON. */
export interface ContributedPackageDto
{
    id: string
    version: string
    modelJson: string
}

/** Params for contributing a solution's packages into a named graph. */
export interface GraphContributeParamsDto
{
    graphName: string
    solutionId: string
    packages: ContributedPackageDto[]
}

/** A graph's effective package set including each package's compiled model JSON (for promotion). */
export interface GraphExportDto
{
    name: string
    packages: ContributedPackageDto[]
}

/** Params for loading a promoted graph's packages into a runtime container. */
export interface GraphLoadParamsDto
{
    graphName: string
    packages: ContributedPackageDto[]
}

/** A runtime's recorded loaded-graph manifest (package refs only, no content). */
export interface GraphLoadedDto
{
    name: string
    packages: { id: string; version: string }[]
    promotedAt: string
}
