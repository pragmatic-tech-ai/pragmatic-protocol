import { RequestType } from 'vscode-jsonrpc'
import type { ShareParams, ShareResultDto, UnshareParams, UnshareResultDto, ListSharesParams, ListSharesResultDto } from '../dto/wire-dtos.js'

/** JSON-RPC contract for per-record sharing on a bound runtime application. */
export class DataSharingProtocol
{
    private static readonly ShareMethod = 'data/share'
    private static readonly UnshareMethod = 'data/unshare'
    private static readonly ListSharesMethod = 'data/shares/list'

    public static readonly Share = new RequestType<ShareParams, ShareResultDto, void>(DataSharingProtocol.ShareMethod)
    public static readonly Unshare = new RequestType<UnshareParams, UnshareResultDto, void>(DataSharingProtocol.UnshareMethod)
    public static readonly ListShares = new RequestType<ListSharesParams, ListSharesResultDto, void>(DataSharingProtocol.ListSharesMethod)
}
