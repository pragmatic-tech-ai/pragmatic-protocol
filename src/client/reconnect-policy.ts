export interface ReconnectPolicy
{
    initialDelayMs: number
    factor: number
    maxDelayMs: number
    maxAttempts?: number
}

/** Exponential backoff with full jitter, capped at maxDelayMs. */
export class ReconnectBackoff
{
    private readonly policy: ReconnectPolicy
    private readonly random: () => number

    public constructor(policy: ReconnectPolicy, random: () => number = Math.random)
    {
        this.policy = policy
        this.random = random
    }

    public Next(attempt: number): number
    {
        const raw = this.policy.initialDelayMs * Math.pow(this.policy.factor, Math.max(0, attempt - 1))
        const capped = Math.min(this.policy.maxDelayMs, raw)
        return Math.floor(this.random() * capped)
    }
}
