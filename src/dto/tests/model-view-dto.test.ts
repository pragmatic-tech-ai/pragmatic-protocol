import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WikiOriginWire } from '../wire-dtos.js'
import type { FieldDeclDto, ModelMemberDto, ModelViewPageDto, WikiOriginDto } from '../wire-dtos.js'

class ModelViewDtoFixtures
{
    public static readonly Field: FieldDeclDto = { name: 'region', type: 'string', cardinality: 'Optional', secured: true }
    public static readonly Member: ModelMemberDto = {
        id: 'shop.eu1', kind: 'shop.Customer', localId: 'eu1', namespace: 'shop', tier: 'Instance', isClass: false,
        attrs: {}, edges: [], class: 'shop.Gold', canonicalId: 'shop.canon', storageId: 'sid', fields: [ModelViewDtoFixtures.Field],
    }
    public static readonly Origins: Record<string, WikiOriginDto> = {
        'shop.eu1': { kind: WikiOriginWire.OpenProject, memberId: 'm1' },
        'shop.pkg': { kind: WikiOriginWire.Package, id: 'p', version: '1.0.0' },
    }
}

test('a model member carries class, canonicalId, storageId and field declarations over JSON', () =>
{
    const page: ModelViewPageDto = { items: [ModelViewDtoFixtures.Member], provenanceOf: {}, originOf: ModelViewDtoFixtures.Origins }
    const wire = JSON.parse(JSON.stringify(page)) as ModelViewPageDto
    const member = wire.items[0]!
    assert.equal(member.class, 'shop.Gold')
    assert.equal(member.canonicalId, 'shop.canon')
    assert.equal(member.storageId, 'sid')
    assert.deepEqual(member.fields, [ModelViewDtoFixtures.Field])
})

test('a model view page carries the origin of each member, an open project by member id or a package by id and version', () =>
{
    const page: ModelViewPageDto = { items: [], provenanceOf: {}, originOf: ModelViewDtoFixtures.Origins }
    const wire = JSON.parse(JSON.stringify(page)) as ModelViewPageDto
    assert.deepEqual(wire.originOf!['shop.eu1'], { kind: 'openProject', memberId: 'm1' })
    assert.deepEqual(wire.originOf!['shop.pkg'], { kind: 'package', id: 'p', version: '1.0.0' })
})
