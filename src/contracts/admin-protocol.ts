import { RequestType, RequestType0 } from 'vscode-jsonrpc'
import type { GrantDto, GrantMutationDto, ListGrantsParams, IdentityConfigDto, AdminAckDto } from '../dto/wire-dtos.js'

/** JSON-RPC contracts for RBAC-gated tenant administration (grants + identity config). */
export class AdminProtocol
{
    public static readonly ListGrants = new RequestType<ListGrantsParams, GrantDto[], void>('admin/grants/list')
    public static readonly GrantRole = new RequestType<GrantMutationDto, AdminAckDto, void>('admin/grants/grant')
    public static readonly RevokeRole = new RequestType<GrantMutationDto, AdminAckDto, void>('admin/grants/revoke')
    public static readonly GetConfig = new RequestType0<IdentityConfigDto, void>('admin/config/get')
    public static readonly SetConfig = new RequestType<IdentityConfigDto, AdminAckDto, void>('admin/config/set')
}
