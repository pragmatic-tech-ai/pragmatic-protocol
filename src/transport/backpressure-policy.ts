export enum BackpressureAction
{
    None,
    Warn,
    Shed,
}

/** Stateless assessment of a socket's outbound buffer against soft/hard/grace thresholds.
 *  The caller threads `overHardSince` back in so a continuous over-hard stretch can be timed. */
export class BackpressurePolicy
{
    private readonly softWaterMarkBytes: number
    private readonly hardLimitBytes: number
    private readonly graceMs: number

    public constructor(softWaterMarkBytes: number, hardLimitBytes: number, graceMs: number)
    {
        this.softWaterMarkBytes = softWaterMarkBytes
        this.hardLimitBytes = hardLimitBytes
        this.graceMs = graceMs
    }

    public Assess(bufferedAmount: number, overHardSince: number | undefined, now: number): { action: BackpressureAction, overHardSince: number | undefined }
    {
        if (bufferedAmount < this.hardLimitBytes)
        {
            const action = bufferedAmount >= this.softWaterMarkBytes ? BackpressureAction.Warn : BackpressureAction.None
            return { action, overHardSince: undefined }
        }
        const since = overHardSince ?? now
        if (now - since >= this.graceMs)
        {
            return { action: BackpressureAction.Shed, overHardSince: since }
        }
        return { action: BackpressureAction.Warn, overHardSince: since }
    }
}
