import type { CypherCellDto, CypherNodeCellDto } from './wire-dtos.js'

/** Decodes cypher result cells: tells a node cell from a map without guessing from shape (see CypherNodeCell). */
export class CypherCells
{
    public static readonly NodeKey = '$node'
    public static readonly MapKey = '$map'

    /** The node when `cell` is a node cell; undefined for every other cell. */
    public static AsNode(cell: CypherCellDto | undefined): CypherNodeCellDto | undefined
    {
        if (!CypherCells.IsObject(cell) || CypherCells.SoleKey(cell) !== CypherCells.NodeKey)
        {
            return undefined
        }
        return cell[CypherCells.NodeKey] as unknown as CypherNodeCellDto
    }

    /** A map cell's entries (unwrapping the `$map` escape); undefined for a node, list, scalar or null. */
    public static AsMap(cell: CypherCellDto | undefined): { [k: string]: CypherCellDto } | undefined
    {
        if (!CypherCells.IsObject(cell))
        {
            return undefined
        }
        const sole = CypherCells.SoleKey(cell)
        if (sole === CypherCells.NodeKey)
        {
            return undefined
        }
        return sole === CypherCells.MapKey ? cell[CypherCells.MapKey] as { [k: string]: CypherCellDto } : cell
    }

    private static IsObject(cell: CypherCellDto | undefined): cell is { [k: string]: CypherCellDto }
    {
        return typeof cell === 'object' && cell !== null && !Array.isArray(cell)
    }

    private static SoleKey(cell: object): string | undefined
    {
        const keys = Object.keys(cell)
        if (keys.length !== 1)
        {
            return undefined
        }
        return keys[0] === CypherCells.NodeKey || keys[0] === CypherCells.MapKey ? keys[0] : undefined
    }
}
