import { RequestType } from 'vscode-jsonrpc'
import type { ModelViewPageDto, ModelViewParams, ResolvedResourceDto, ResourcesParams } from '../dto/wire-dtos.js'

/** JSON-RPC contracts for the model surface: a member-addressed model view and node resources. */
export class ModelProtocol
{
    public static readonly ModelView = new RequestType<ModelViewParams, ModelViewPageDto, void>('model/view')
    public static readonly Resources = new RequestType<ResourcesParams, ResolvedResourceDto[], void>('model/resources')
}
