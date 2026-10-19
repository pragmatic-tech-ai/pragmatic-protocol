import type { IMessageSocket } from '../transport/message-socket.js'

export interface ISocketDialer
{
    Dial(): Promise<IMessageSocket>
}
