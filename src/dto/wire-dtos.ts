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

export interface ActiveSolutionSummary
{
    name: string
    members: SolutionMemberSummary[]
}

export interface SolutionGraphChangePayload
{
    memberIds: string[]
    fileIds: string[]
}

export interface ModelViewParams
{
    memberId: string
}

export interface ResourcesParams
{
    nodeId: string
}

export interface ModelMemberDto
{
    id: string
    kind: string | null
}

export interface ModelProjection
{
    members: ModelMemberDto[]
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

export interface ConnectorReadParams
{
    modelId: string
    concept: string
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

export interface WriteConflictDto
{
    key: string | number | boolean | null
    reason: string
}

export interface WriteResultDto
{
    applied: number
    conflicts: WriteConflictDto[]
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

export interface IdentityConfigDto
{
    packId: string
    delegationDepth: string
    providerSettings: Record<string, string>
    groupRoleMap: Record<string, string>
    claimsMapping: Record<string, string>
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
