import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ModelProtocol } from '../model-protocol.js'

test('model contracts carry their wire method names', () =>
{
    assert.equal(ModelProtocol.ModelView.method, 'model/view')
    assert.equal(ModelProtocol.Resources.method, 'model/resources')
})
