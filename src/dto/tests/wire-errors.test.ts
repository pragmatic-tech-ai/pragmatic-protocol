import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ResponseError } from 'vscode-jsonrpc'
import { DataSourceUnavailableError } from '../wire-errors.js'

class WireErrorFixtures
{
    public static readonly Source = 'catalog.Catalog'
}

test('a data-source-unavailable response error yields its data source', () =>
{
    const error = DataSourceUnavailableError.Create(WireErrorFixtures.Source)
    assert.equal(error.code, DataSourceUnavailableError.Code)
    assert.equal(error.message, DataSourceUnavailableError.MessageStart + WireErrorFixtures.Source)
    assert.equal(DataSourceUnavailableError.DataSourceOf(error), WireErrorFixtures.Source)
})

test('the data source is read from the wire shape, so a deserialized error is recognised too', () =>
{
    const wire = { code: DataSourceUnavailableError.Code, message: 'x', data: { dataSource: WireErrorFixtures.Source } }
    assert.equal(DataSourceUnavailableError.DataSourceOf(wire), WireErrorFixtures.Source)
})

test('any other error, or one without a data source name, yields nothing', () =>
{
    assert.equal(DataSourceUnavailableError.DataSourceOf(new ResponseError(-32603, 'internal error')), undefined)
    assert.equal(DataSourceUnavailableError.DataSourceOf({ code: DataSourceUnavailableError.Code, data: {} }), undefined)
    assert.equal(DataSourceUnavailableError.DataSourceOf({ code: DataSourceUnavailableError.Code, data: { dataSource: '' } }), undefined)
    assert.equal(DataSourceUnavailableError.DataSourceOf(new Error('boom')), undefined)
    assert.equal(DataSourceUnavailableError.DataSourceOf(undefined), undefined)
})
