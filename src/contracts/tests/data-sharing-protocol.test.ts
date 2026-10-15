import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DataSharingProtocol } from '../data-sharing-protocol.js'

test('sharing protocol registers the three data/* methods', () =>
{
    assert.equal(DataSharingProtocol.Share.method, 'data/share')
    assert.equal(DataSharingProtocol.Unshare.method, 'data/unshare')
    assert.equal(DataSharingProtocol.ListShares.method, 'data/shares/list')
})
