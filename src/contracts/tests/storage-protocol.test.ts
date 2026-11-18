import { test } from 'node:test'
import assert from 'node:assert/strict'
import { StorageProtocol } from '../storage-protocol.js'
import { SolutionProtocol } from '../solution-protocol.js'

test('storage protocol registers the storage/* methods', () =>
{
    assert.equal(StorageProtocol.ReadText.method, 'storage/readText')
    assert.equal(StorageProtocol.ReadBytes.method, 'storage/readBytes')
    assert.equal(StorageProtocol.WriteText.method, 'storage/writeText')
    assert.equal(StorageProtocol.WriteBytes.method, 'storage/writeBytes')
    assert.equal(StorageProtocol.Exists.method, 'storage/exists')
    assert.equal(StorageProtocol.Delete.method, 'storage/delete')
    assert.equal(StorageProtocol.CreateDirectory.method, 'storage/createDirectory')
    assert.equal(StorageProtocol.Rename.method, 'storage/rename')
    assert.equal(StorageProtocol.List.method, 'storage/list')
    assert.equal(StorageProtocol.Changed.method, 'storage/changed')
})

test('solution protocol registers list + selectAuthoring', () =>
{
    assert.equal(SolutionProtocol.ListSolutions.method, 'solution/list')
    assert.equal(SolutionProtocol.SelectAuthoring.method, 'solution/selectAuthoring')
})
