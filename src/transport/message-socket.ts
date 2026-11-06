/** Narrow transport seam: one text frame in, one text frame out, plus error/close. */
export interface IMessageSocket
{
    Send(json: string): Promise<void>
    OnMessage(handler: (json: string) => void): void
    OnError(handler: (error: Error) => void): void
    OnClose(handler: () => void): void
    Close(): void
    /** The close code the socket closed with; undefined while open or when the transport cannot tell. */
    CloseCode?(): number | undefined
}
