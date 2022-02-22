import { Channel, ChannelsEndpoint } from '@smartthings/core-sdk'

import { APICommand, outputListing } from '@smartthings/cli-lib'

import ChannelsCommand from '../../../../src/commands/edge/channels'
import { listChannels } from '../../../../src/lib/commands/channels-util'


jest.mock('@smartthings/cli-lib', () => {
	const originalLib = jest.requireActual('@smartthings/cli-lib')

	return {
		...originalLib,
		outputListing: jest.fn(),
	}
})
jest.mock('../../../../src/lib/commands/channels-util')

describe('ChannelsCommand', () => {
	const outputListingMock = jest.mocked(outputListing)

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('uses outputListing', async () => {
		await expect(ChannelsCommand.run([])).resolves.not.toThrow()

		expect(outputListingMock).toHaveBeenCalledTimes(1)
		expect(outputListingMock).toHaveBeenCalledWith(
			expect.any(ChannelsCommand),
			expect.objectContaining({
				primaryKeyName: 'channelId',
				listTableFieldDefinitions: expect.not.arrayContaining(['organization']),
			}),
			undefined,
			expect.any(Function),
			expect.any(Function),
		)
	})

	it('includes organization in listing output', async () => {
		await expect(ChannelsCommand.run(['--all-organizations'])).resolves.not.toThrow()

		expect(outputListingMock).toHaveBeenCalledTimes(1)
		expect(outputListingMock).toHaveBeenCalledWith(
			expect.any(ChannelsCommand),
			expect.objectContaining({
				primaryKeyName: 'channelId',
				listTableFieldDefinitions: expect.arrayContaining(['organization']),
			}),
			undefined,
			expect.any(Function),
			expect.any(Function),
		)
	})

	it('passes subscriber type and id on to listChannels', async () => {
		await expect(ChannelsCommand.run([
			'--subscriber-type=HUB',
			'--subscriber-id=subscriber-id',
		])).resolves.not.toThrow()

		expect(outputListingMock).toHaveBeenCalledTimes(1)
		expect(outputListingMock).toHaveBeenCalledWith(
			expect.any(ChannelsCommand),
			expect.objectContaining({ primaryKeyName: 'channelId' }),
			undefined,
			expect.any(Function),
			expect.any(Function),
		)

		const listFunction = outputListingMock.mock.calls[0][3]

		const channelList = [{ channelId: 'channel-in-list-id' }] as Channel[]
		const listChannelsMock = jest.mocked(listChannels).mockResolvedValueOnce(channelList)

		expect(await listFunction()).toBe(channelList)

		expect(listChannelsMock).toHaveBeenCalledTimes(1)
		expect(listChannelsMock).toHaveBeenCalledWith(expect.any(APICommand), 'HUB', 'subscriber-id')
	})

	test('get item function uses channels.get with id', async () => {
		await expect(ChannelsCommand.run(['id-from-command-line'])).resolves.not.toThrow()

		expect(outputListingMock).toHaveBeenCalledTimes(1)
		expect(outputListingMock).toHaveBeenCalledWith(
			expect.any(ChannelsCommand),
			expect.objectContaining({ primaryKeyName: 'channelId' }),
			'id-from-command-line',
			expect.any(Function),
			expect.any(Function),
		)

		const getFunction = outputListingMock.mock.calls[0][4]

		const channel = { channelId: 'channel-in-list-id' } as Channel
		const getSpy = jest.spyOn(ChannelsEndpoint.prototype, 'get').mockResolvedValueOnce(channel)

		expect(await getFunction('resolved-channel-id')).toBe(channel)

		expect(getSpy).toHaveBeenCalledTimes(1)
		expect(getSpy).toHaveBeenCalledWith('resolved-channel-id')
	})
})
