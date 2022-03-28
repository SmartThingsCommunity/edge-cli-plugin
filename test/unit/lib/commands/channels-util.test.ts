import { Channel } from '@smartthings/core-sdk'

import { APICommand, ChooseOptions, chooseOptionsWithDefaults, selectFromList, stringTranslateToId }
	from '@smartthings/cli-lib'

import { chooseChannel, listChannels, ChooseChannelOptions, chooseChannelOptionsWithDefaults }
	from '../../../../src/lib/commands/channels-util'
import * as channelsUtil from '../../../../src/lib/commands/channels-util'


jest.mock('@smartthings/cli-lib', () => ({
	...jest.requireActual('@smartthings/cli-lib'),
	chooseOptionsWithDefaults: jest.fn(),
	stringTranslateToId: jest.fn(),
	selectFromList: jest.fn(),
}))


describe('channels-util', () => {
	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('chooseChannelOptionsWithDefaults', () => {
		const chooseOptionsWithDefaultsMock = jest.mocked(chooseOptionsWithDefaults)

		it('has a reasonable default', () => {
			chooseOptionsWithDefaultsMock.mockReturnValue({} as unknown as ChooseOptions)

			expect(chooseChannelOptionsWithDefaults())
				.toEqual(expect.objectContaining({ includeReadOnly: false }))

			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledTimes(1)
			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledWith(undefined)
		})

		it('accepts true value', () => {
			chooseOptionsWithDefaultsMock.mockReturnValue({ includeReadOnly: true } as unknown as ChooseOptions)

			expect(chooseChannelOptionsWithDefaults({ includeReadOnly: true }))
				.toEqual(expect.objectContaining({ includeReadOnly: true }))

			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledTimes(1)
			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledWith({ includeReadOnly: true })
		})
	})

	describe('chooseChannel', () => {
		const selectFromListMock = jest.mocked(selectFromList)

		const listChannelsMock = jest.fn()
		const client = { channels: { list: listChannelsMock } }
		const flags = { 'all-organizations': false, 'include-read-only': false }
		const command = { client, flags } as unknown as APICommand

		const chooseChannelOptionsWithDefaultsSpy = jest.spyOn(channelsUtil, 'chooseChannelOptionsWithDefaults')
		const stringTranslateToIdMock = jest.mocked(stringTranslateToId)

		it('uses default channel if specified', async () => {
			chooseChannelOptionsWithDefaultsSpy.mockReturnValueOnce(
				{ allowIndex: false, useConfigDefault: true } as ChooseChannelOptions)
			selectFromListMock.mockImplementation(async () => 'chosen-channel-id')

			expect(await chooseChannel(command, 'prompt message', undefined, { useConfigDefault: true }))
				.toBe('chosen-channel-id')

			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledTimes(1)
			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledWith({ useConfigDefault: true })
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(0)
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'channelId', sortKeyName: 'name' }),
				expect.objectContaining({ configKeyForDefaultValue: 'defaultChannel',
					promptMessage: 'prompt message' }))
		})

		it('translates id from index if allowed', async () => {
			chooseChannelOptionsWithDefaultsSpy.mockReturnValueOnce(
				{ allowIndex: true } as ChooseChannelOptions)
			stringTranslateToIdMock.mockResolvedValueOnce('translated-id')
			selectFromListMock.mockImplementation(async () => 'chosen-channel-id')

			expect(await chooseChannel(command, 'prompt message', 'command-line-channel-id',
				{ allowIndex: true })).toBe('chosen-channel-id')

			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledTimes(1)
			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledWith({ allowIndex: true })
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(1)
			expect(stringTranslateToIdMock).toHaveBeenCalledWith(
				expect.objectContaining({ primaryKeyName: 'channelId', sortKeyName: 'name' }),
				'command-line-channel-id', expect.any(Function))
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'channelId', sortKeyName: 'name' }),
				expect.objectContaining({ preselectedId: 'translated-id' }))
		})

		it('uses list function that lists channels', async () => {
			chooseChannelOptionsWithDefaultsSpy.mockReturnValueOnce(
				{ allowIndex: false, includeReadOnly: false } as ChooseChannelOptions)
			selectFromListMock.mockImplementation(async () => 'chosen-channel-id')

			expect(await chooseChannel(command, 'prompt message', 'command-line-channel-id'))
				.toBe('chosen-channel-id')

			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledTimes(1)
			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledWith(undefined)
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(0)
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'channelId', sortKeyName: 'name' }),
				expect.objectContaining({ preselectedId: 'command-line-channel-id' }))

			const listItems = selectFromListMock.mock.calls[0][2].listItems

			const list = [{ name: 'Channel' }] as Channel[]
			listChannelsMock.mockResolvedValueOnce(list)

			expect(await listItems()).toBe(list)

			expect(listChannelsMock).toHaveBeenCalledTimes(1)
			expect(listChannelsMock).toHaveBeenCalledWith({ includeReadOnly: false })
		})

		it('requests read-only channels when needed', async () => {
			chooseChannelOptionsWithDefaultsSpy.mockReturnValueOnce(
				{ allowIndex: false, includeReadOnly: true } as ChooseChannelOptions)
			selectFromListMock.mockImplementation(async () => 'chosen-channel-id')

			expect(await chooseChannel(command, 'prompt message', 'command-line-channel-id'))
				.toBe('chosen-channel-id')

			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledTimes(1)
			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledWith(undefined)
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(0)
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'channelId', sortKeyName: 'name' }),
				expect.objectContaining({ preselectedId: 'command-line-channel-id' }))

			const listItems = selectFromListMock.mock.calls[0][2].listItems

			const list = [{ name: 'Channel' }] as Channel[]
			listChannelsMock.mockResolvedValueOnce(list)

			expect(await listItems()).toBe(list)

			expect(listChannelsMock).toHaveBeenCalledTimes(1)
			expect(listChannelsMock).toHaveBeenCalledWith({ includeReadOnly: true })
		})
	})

	describe('listChannels', () => {
		const apiListChannelsMock = jest.fn()
		const apiListOrganizationsMock = jest.fn()
		const client = {
			channels: {
				list: apiListChannelsMock,
			},
			organizations: {
				list: apiListOrganizationsMock,
			},
			clone: () => ({
				channels: {
					list: apiListChannelsMock,
				},
			}),
		}

		const result = [
			{
				'channelId': 'channel-id',
				'name': 'Channel Name',
			},
		]
		apiListChannelsMock.mockResolvedValue(result)
		apiListOrganizationsMock.mockResolvedValue([
			{ organizationId: 'org1', name: 'Organization One' },
			{ organizationId: 'org2', name: 'Organization Two' },
		])

		it('lists channels', async () => {
			const flags = { 'all-organizations': false, 'include-read-only': false }
			const command = { client, flags } as unknown as APICommand

			expect(await listChannels(command)).toBe(result)

			expect(apiListOrganizationsMock).toHaveBeenCalledTimes(0)
			expect(apiListChannelsMock).toHaveBeenCalledTimes(1)
			expect(apiListChannelsMock).toHaveBeenCalledWith({ includeReadOnly: false })
		})

		it('lists channels including read-only', async () => {
			const flags = { 'all-organizations': false, 'include-read-only': true }
			const command = { client, flags } as unknown as APICommand

			expect(await listChannels(command)).toBe(result)

			expect(apiListOrganizationsMock).toHaveBeenCalledTimes(0)
			expect(apiListChannelsMock).toHaveBeenCalledTimes(1)
			expect(apiListChannelsMock).toHaveBeenCalledWith({ includeReadOnly: true })
		})

		it('passes subscriber filters on', async () => {
			const flags = { 'all-organizations': false, 'include-read-only': false }
			const command = { client, flags } as unknown as APICommand

			expect(await listChannels(command, 'HUB', 'subscriber-id')).toBe(result)

			expect(apiListOrganizationsMock).toHaveBeenCalledTimes(0)
			expect(apiListChannelsMock).toHaveBeenCalledTimes(1)
			expect(apiListChannelsMock).toHaveBeenCalledWith({
				includeReadOnly: false, subscriberType: 'HUB', subscriberId: 'subscriber-id',
			})
		})

		it('lists channels in all organizations', async () => {
			const flags = { 'all-organizations': true, 'include-read-only': false }
			const command = { client, flags } as unknown as APICommand
			const thisResult = [
				{ ...result[0], organization: 'Organization One' },
				{ ...result[0], organization: 'Organization Two' },
			]

			expect(await listChannels(command)).toStrictEqual(thisResult)

			expect(apiListOrganizationsMock).toHaveBeenCalledTimes(1)
			expect(apiListChannelsMock).toHaveBeenCalledTimes(2)
		})
	})
})
