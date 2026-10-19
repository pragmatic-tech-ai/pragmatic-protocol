/** The decoded content of an opaque paging cursor. */
export interface PageCursor
{
    offset: number
    fingerprint: string
}

/** Encodes and decodes the opaque cursor strings carried by paged requests (base64url over UTF-8 JSON; browser-safe). */
export class PageCursorCodec
{
    public static Encode(cursor: PageCursor): string
    {
        const payload: PageCursor = { offset: cursor.offset, fingerprint: cursor.fingerprint }
        const bytes = new TextEncoder().encode(JSON.stringify(payload))
        let binary = ''
        for (const byte of bytes)
        {
            binary += String.fromCharCode(byte)
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }

    private static DecodeBase64Url(text: string): string
    {
        const standard = text.replace(/-/g, '+').replace(/_/g, '/')
        const binary = atob(standard + '='.repeat((4 - standard.length % 4) % 4))
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++)
        {
            bytes[i] = binary.charCodeAt(i)
        }
        return new TextDecoder().decode(bytes)
    }

    /** Returns undefined for anything that is not a well-formed cursor; never throws. */
    public static Decode(text: string): PageCursor | undefined
    {
        try
        {
            if (typeof text !== 'string' || text.length === 0)
            {
                return undefined
            }
            const parsed: unknown = JSON.parse(PageCursorCodec.DecodeBase64Url(text))
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
            {
                return undefined
            }
            const candidate = parsed as { offset?: unknown, fingerprint?: unknown }
            if (typeof candidate.offset !== 'number' || !Number.isSafeInteger(candidate.offset) || candidate.offset < 0)
            {
                return undefined
            }
            if (typeof candidate.fingerprint !== 'string')
            {
                return undefined
            }
            return { offset: candidate.offset, fingerprint: candidate.fingerprint }
        }
        catch
        {
            return undefined
        }
    }
}
