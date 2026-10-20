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

export interface TeamDto
{
    id: string
    name: string
    owningBusinessUnit?: string
}

export interface MembershipClaimRuleDto
{
    claim: string
    value: string
    homeBusinessUnit?: string
    teams?: string[]
}

export interface MembershipOverrideDto
{
    principalId: string
    homeBusinessUnit?: string
    teams?: string[]
}

export interface MembershipDto
{
    claimsMapping: MembershipClaimRuleDto[]
    overrides: MembershipOverrideDto[]
}

export interface OwnershipSourceDto
{
    kind: string
    value: string
}

export interface OwnershipRuleDto
{
    concept: string
    owningBusinessUnit: OwnershipSourceDto
    owner?: OwnershipSourceDto
}

export interface PrivilegeDto
{
    action: string
    concept: string
    level: string
}

export interface RoleConfigDto
{
    id: string
    name: string
    privileges: PrivilegeDto[]
}

export interface RoleClaimRuleDto
{
    claim: string
    value: string
    roles: string[]
}

export interface RoleOverrideDto
{
    principalId: string
    roles: string[]
}

export interface TeamRoleGrantDto
{
    teamId: string
    roles: string[]
}

export interface RoleAssignmentDto
{
    claimsMapping: RoleClaimRuleDto[]
    overrides: RoleOverrideDto[]
    teamRoles: TeamRoleGrantDto[]
}

export interface SecuredFieldDto
{
    concept: string
    field: string
}

export interface FieldGrantDto
{
    concept: string
    field: string
    read?: boolean
    update?: boolean
    create?: boolean
}

export interface FieldProfileDto
{
    id: string
    name: string
    grants: FieldGrantDto[]
}

export interface FieldProfileClaimRuleDto
{
    claim: string
    value: string
    profiles: string[]
}

export interface FieldProfileOverrideDto
{
    principalId: string
    profiles: string[]
}

export interface FieldProfileTeamGrantDto
{
    teamId: string
    profiles: string[]
}

export interface FieldProfileAssignmentDto
{
    claimsMapping: FieldProfileClaimRuleDto[]
    overrides: FieldProfileOverrideDto[]
    teamProfiles: FieldProfileTeamGrantDto[]
}

export interface FieldSecurityDto
{
    securedFields: SecuredFieldDto[]
    profiles: FieldProfileDto[]
    profileAssignment: FieldProfileAssignmentDto
}

export interface SecurityModelDto
{
    businessUnits: BusinessUnitDto[]
    teams: TeamDto[]
    membership: MembershipDto
    ownershipRules: OwnershipRuleDto[]
    roles?: RoleConfigDto[]
    roleAssignment?: RoleAssignmentDto
    fieldSecurity?: FieldSecurityDto
}

export interface SetSecurityModelParams
{
    securityModel: SecurityModelDto
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

// Mirrors CypherValueDto. The node member precedes the generic-object member.
export type CypherCellDto = string | number | boolean | null | CypherNodeCellDto | CypherCellDto[] | { [k: string]: CypherCellDto }

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
