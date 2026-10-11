import { RequestType } from 'vscode-jsonrpc'
import type { ModelProjection, ModelViewParams, ResolvedResourceDto, ResourcesParams } from '../dto/wire-dtos.js'

/** JSON-RPC contracts for the model surface: a member-addressed model view and node resources. */
export class ModelProtocol
{
    public static readonly ModelView = new RequestType<ModelViewParams, ModelProjection, void>('model/view')
    public static readonly Resources = new RequestType<ResourcesParams, ResolvedResourceDto[], void>('model/resources')
}
