import { Device } from '@smartthings/core-sdk'

import { ChooseOptions, chooseOptionsWithDefaults, ListDataFunction, Naming, selectFromList, SelectingConfig, SmartThingsCommandInterface,
	Sorting, stringTranslateToId } from '@smartthings/cli-lib'

import { chooseChannel, ChooseChannelOptions, chooseChannelOptionsWithDefaults }
	from '../../../../src/lib/commands/channels-util'
import * as channelsUtil from '../../../../src/lib/commands/channels-util'
import { EdgeCommand } from '../../../../src/lib/edge-command'
import { Channel } from '../../../../src/lib/endpoints/channels'


jest.mock('@smartthings/cli-lib', () => ({
	chooseOptionsWithDefaults: jest.fn(),
	stringTranslateToId: jest.fn(),
	selectFromList: jest.fn(),
}))


describe('channels-util', () => {
	const selectFromListMock = selectFromList as unknown as
		jest.Mock<Promise<string>, [SmartThingsCommandInterface, SelectingConfig<Device>, string,
			ListDataFunction<Device>, string, boolean]>

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
		const listChannelsMock = jest.fn()
		const edgeClient = { channels: { list: listChannelsMock } }
		const command = { edgeClient } as unknown as EdgeCommand

		const chooseChannelOptionsWithDefaultsSpy = jest.spyOn(channelsUtil, 'chooseChannelOptionsWithDefaults')
		const stringTranslateToIdMock = stringTranslateToId as unknown as
			jest.Mock<Promise<string | undefined>, [Sorting & Naming, string | undefined, ListDataFunction<Channel>]>

		it('presents user with list of channels', async () => {
			chooseChannelOptionsWithDefaultsSpy.mockReturnValueOnce({ allowIndex: false } as ChooseChannelOptions)
			selectFromListMock.mockImplementation(async () => 'chosen-channel-id')

			expect(await chooseChannel(command, 'prompt message', 'command-line-channel-id')).toBe('chosen-channel-id')

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
				'translated-id', expect.any(Function), 'prompt message')
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

			expect(await chooseChannel(command, 'prompt message', 'command-line-channel-id'))
				.toBe('chosen-channel-id')

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
})
