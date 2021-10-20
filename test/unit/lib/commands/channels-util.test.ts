import { Device } from '@smartthings/core-sdk'

import {
	ChooseOptions,
	chooseOptionsWithDefaults,
	ListDataFunction,
	Naming,
	selectFromList,
	SelectingConfig,
	SmartThingsCommandInterface,
	Sorting,
	stringTranslateToId,
} from '@smartthings/cli-lib'

import { chooseChannel, listChannels, ChooseChannelOptions, chooseChannelOptionsWithDefaults }
	from '../../../../src/lib/commands/channels-util'
import * as channelsUtil from '../../../../src/lib/commands/channels-util'
import { EdgeCommand } from '../../../../src/lib/edge-command'
import { Channel } from '../../../../src/lib/endpoints/channels'


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
		const chooseOptionsWithDefaultsMock = chooseOptionsWithDefaults as unknown as
			jest.Mock<ChooseOptions, [Partial<ChooseOptions>]>

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
		const selectFromListMock = selectFromList as unknown as
			jest.Mock<Promise<string>, [SmartThingsCommandInterface, SelectingConfig<Device>, string,
				ListDataFunction<Device>, string, boolean]>

		const listChannelsMock = jest.fn()
		const edgeClient = { channels: { list: listChannelsMock } }
		const flags = {'all-organizations': false, 'include-read-only': false}
		const command = { edgeClient, flags } as unknown as EdgeCommand

		const chooseChannelOptionsWithDefaultsSpy = jest.spyOn(channelsUtil, 'chooseChannelOptionsWithDefaults')
		const stringTranslateToIdMock = stringTranslateToId as unknown as
			jest.Mock<Promise<string | undefined>, [Sorting & Naming, string | undefined, ListDataFunction<Channel>]>

		it('uses default channel if specified', async () => {
			chooseChannelOptionsWithDefaultsSpy.mockReturnValueOnce(
				{ allowIndex: false } as ChooseChannelOptions)
			selectFromListMock.mockImplementation(async () => 'chosen-channel-id')

			expect(await chooseChannel(command, 'prompt message', undefined, 'default-channel-id'))
				.toBe('chosen-channel-id')

			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledTimes(1)
			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledWith(undefined)
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(0)
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'channelId', sortKeyName: 'name' }),
				'default-channel-id', expect.any(Function), 'prompt message')
		})

		it('prefers command line over default', async () => {
			chooseChannelOptionsWithDefaultsSpy.mockReturnValueOnce(
				{ allowIndex: false } as ChooseChannelOptions)
			selectFromListMock.mockImplementation(async () => 'chosen-channel-id')

			expect(await chooseChannel(command, 'prompt message', 'command-line-channel-id',
				'default-channel-id')).toBe('chosen-channel-id')

			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledTimes(1)
			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledWith(undefined)
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(0)
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'channelId', sortKeyName: 'name' }),
				'command-line-channel-id', expect.any(Function), 'prompt message')
		})

		it('translates id from index if allowed', async () => {
			chooseChannelOptionsWithDefaultsSpy.mockReturnValueOnce(
				{ allowIndex: true } as ChooseChannelOptions)
			stringTranslateToIdMock.mockResolvedValueOnce('translated-id')
			selectFromListMock.mockImplementation(async () => 'chosen-channel-id')

			expect(await chooseChannel(command, 'prompt message', 'command-line-channel-id',
				'default-channel-id', { allowIndex: true })).toBe('chosen-channel-id')

			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledTimes(1)
			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledWith({ allowIndex: true })
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(1)
			expect(stringTranslateToIdMock).toHaveBeenCalledWith(
				expect.objectContaining({ primaryKeyName: 'channelId', sortKeyName: 'name' }),
				'command-line-channel-id', expect.any(Function))
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'channelId', sortKeyName: 'name' }),
				'translated-id', expect.any(Function), 'prompt message')
		})

		it('uses list function that lists channels', async () => {
			chooseChannelOptionsWithDefaultsSpy.mockReturnValueOnce(
				{ allowIndex: false, includeReadOnly: false } as ChooseChannelOptions)
			selectFromListMock.mockImplementation(async () => 'chosen-channel-id')

			expect(await chooseChannel(command, 'prompt message', 'command-line-channel-id',
				'default-channel-id')).toBe('chosen-channel-id')

			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledTimes(1)
			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledWith(undefined)
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(0)
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'channelId', sortKeyName: 'name' }),
				'command-line-channel-id', expect.any(Function), 'prompt message')

			const listFunction = selectFromListMock.mock.calls[0][3]

			const list = [{ name: 'Channel' }] as Channel[]
			listChannelsMock.mockResolvedValueOnce(list)

			expect(await listFunction()).toBe(list)

			expect(listChannelsMock).toHaveBeenCalledTimes(1)
			expect(listChannelsMock).toHaveBeenCalledWith({ includeReadOnly: false })
		})

		it('requests read-only channels when needed', async () => {
			chooseChannelOptionsWithDefaultsSpy.mockReturnValueOnce(
				{ allowIndex: false, includeReadOnly: true } as ChooseChannelOptions)
			selectFromListMock.mockImplementation(async () => 'chosen-channel-id')

			expect(await chooseChannel(command, 'prompt message', 'command-line-channel-id',
				'default-channel-id')) .toBe('chosen-channel-id')

			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledTimes(1)
			expect(chooseChannelOptionsWithDefaultsSpy).toHaveBeenCalledWith(undefined)
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(0)
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'channelId', sortKeyName: 'name' }),
				'command-line-channel-id', expect.any(Function), 'prompt message')

			const listFunction = selectFromListMock.mock.calls[0][3]

			const list = [{ name: 'Channel' }] as Channel[]
			listChannelsMock.mockResolvedValueOnce(list)

			expect(await listFunction()).toBe(list)

			expect(listChannelsMock).toHaveBeenCalledTimes(1)
			expect(listChannelsMock).toHaveBeenCalledWith({ includeReadOnly: true })
		})
	})

	describe('listChannels', () => {
		const apiListChannelsMock = jest.fn()
		const apiListOrganizationsMock = jest.fn()
		const client = {
			organizations: {
				list: apiListOrganizationsMock,
			},
		}

		const edgeClient = {
			channels: {
				list: apiListChannelsMock,
			},
			cloneEdge: () => ({
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
			{organizationId: 'org1', name: 'Organization One'},
			{organizationId: 'org2', name: 'Organization Two'},
		])

		it('lists channels', async () => {
			const flags = {'all-organizations': false, 'include-read-only': false}
			const command = { edgeClient, flags } as unknown as EdgeCommand

			expect(await listChannels(command)).toBe(result)

			expect(apiListOrganizationsMock).toHaveBeenCalledTimes(0)
			expect(apiListChannelsMock).toHaveBeenCalledTimes(1)
			expect(apiListChannelsMock).toHaveBeenCalledWith({includeReadOnly: false})
		})

		it('lists channels including read-only', async () => {
			const flags = {'all-organizations': false, 'include-read-only': true}
			const command = { edgeClient, flags } as unknown as EdgeCommand

			expect(await listChannels(command)).toBe(result)

			expect(apiListOrganizationsMock).toHaveBeenCalledTimes(0)
			expect(apiListChannelsMock).toHaveBeenCalledTimes(1)
			expect(apiListChannelsMock).toHaveBeenCalledWith({includeReadOnly: true})
		})

		it('lists channels in all organizations', async () => {
			const flags = {'all-organizations': true, 'include-read-only': false}
			const command = { client, edgeClient, flags } as unknown as EdgeCommand
			const thisResult = [
				{...result[0], organization: 'Organization One'},
				{...result[0], organization: 'Organization Two'},
			]

			expect(await listChannels(command)).toStrictEqual(thisResult)

			expect(apiListOrganizationsMock).toHaveBeenCalledTimes(1)
			expect(apiListChannelsMock).toHaveBeenCalledTimes(2)
		})
	})
})
