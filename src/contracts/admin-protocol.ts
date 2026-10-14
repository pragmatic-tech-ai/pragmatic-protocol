import { RequestType, RequestType0 } from 'vscode-jsonrpc'
import type { GrantDto, GrantMutationDto, ListGrantsParams, IdentityConfigDto, AdminAckDto, AccountDto, CreateAccountParams, DisableAccountParams, ServiceTokenSummaryDto, IssueTokenParams, TokenIssuedDto, RevokeTokenParams } from '../dto/wire-dtos.js'

/** JSON-RPC contracts for RBAC-gated tenant administration (grants + identity config). */
export class AdminProtocol
{
    public static readonly ListGrants = new RequestType<ListGrantsParams, GrantDto[], void>('admin/grants/list')
    public static readonly GrantRole = new RequestType<GrantMutationDto, AdminAckDto, void>('admin/grants/grant')
    public static readonly RevokeRole = new RequestType<GrantMutationDto, AdminAckDto, void>('admin/grants/revoke')
    public static readonly GetConfig = new RequestType0<IdentityConfigDto, void>('admin/config/get')
    public static readonly SetConfig = new RequestType<IdentityConfigDto, AdminAckDto, void>('admin/config/set')
    public static readonly ListAccounts = new RequestType0<AccountDto[], void>('admin/accounts/list')
    public static readonly CreateAccount = new RequestType<CreateAccountParams, AdminAckDto, void>('admin/accounts/create')
    public static readonly DisableAccount = new RequestType<DisableAccountParams, AdminAckDto, void>('admin/accounts/disable')
    public static readonly ListTokens = new RequestType0<ServiceTokenSummaryDto[], void>('admin/tokens/list')
    public static readonly IssueToken = new RequestType<IssueTokenParams, TokenIssuedDto, void>('admin/tokens/issue')
    public static readonly RevokeToken = new RequestType<RevokeTokenParams, AdminAckDto, void>('admin/tokens/revoke')
}
