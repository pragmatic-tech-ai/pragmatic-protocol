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
