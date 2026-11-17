import { RequestType, NotificationType } from 'vscode-jsonrpc'
import type {
    StoragePathParams, StorageTextDto, StorageBytesDto, StorageWriteTextParams, StorageWriteBytesParams,
    StorageRenameParams, StorageEntryDto, StorageChangedPayload
} from '../dto/wire-dtos.js'

/** JSON-RPC contracts mirroring IStorage + IWatchableStorage over a server-hosted environment store. Bytes travel base64. */
export class StorageProtocol
{
    public static readonly ReadText = new RequestType<StoragePathParams, StorageTextDto, void>('storage/readText')
    public static readonly ReadBytes = new RequestType<StoragePathParams, StorageBytesDto, void>('storage/readBytes')
    public static readonly WriteText = new RequestType<StorageWriteTextParams, void, void>('storage/writeText')
    public static readonly WriteBytes = new RequestType<StorageWriteBytesParams, void, void>('storage/writeBytes')
    public static readonly Exists = new RequestType<StoragePathParams, boolean, void>('storage/exists')
    public static readonly Delete = new RequestType<StoragePathParams, void, void>('storage/delete')
    public static readonly CreateDirectory = new RequestType<StoragePathParams, void, void>('storage/createDirectory')
    public static readonly Rename = new RequestType<StorageRenameParams, void, void>('storage/rename')
    public static readonly List = new RequestType<StoragePathParams, StorageEntryDto[], void>('storage/list')
    public static readonly Changed = new NotificationType<StorageChangedPayload>('storage/changed')
}
