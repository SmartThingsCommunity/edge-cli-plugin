import { CommonListOutputProducer, GetDataFunction, outputList, SmartThingsCommandInterface } from '@smartthings/cli-lib'

import { DriverChannelDetailsWithName } from '../../../../../src/lib/commands/drivers-util'
import * as driversUtil from '../../../../../src/lib/commands/drivers-util'
import ChannelsDriversCommand from '../../../../../src/commands/edge/channels/drivers'
import * as channels from '../../../../../src/commands/edge/channels'
import { EdgeClient } from '../../../../../src/lib/edge-client'


jest.mock('@smartthings/cli-lib', () => {
	const originalLib = jest.requireActual('@smartthings/cli-lib')

	return {
		...originalLib,
		outputList: jest.fn(),
	}
})

describe('ChannelsDriversCommand', () => {
	const outputListMock = outputList as unknown as
		jest.Mock<Promise<DriverChannelDetailsWithName[]>, [SmartThingsCommandInterface,
			CommonListOutputProducer<DriverChannelDetailsWithName>,
			GetDataFunction<DriverChannelDetailsWithName>]>

	const chooseChannelSpy = jest.spyOn(channels, 'chooseChannel')
		.mockResolvedValue('chosen-channel-id')
	const driverChannelDetailsList = [] as DriverChannelDetailsWithName[]
	outputListMock.mockResolvedValue(driverChannelDetailsList)

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('calls outputList to do the work', async () => {
		await expect(ChannelsDriversCommand.run([])).resolves.not.toThrow()

		expect(chooseChannelSpy).toHaveBeenCalledTimes(1)
		expect(chooseChannelSpy).toHaveBeenCalledWith(expect.any(ChannelsDriversCommand),
			'Select a channel.', undefined,
			expect.objectContaining({ allowIndex: true, includeReadOnly: true }))
		expect(outputListMock).toHaveBeenCalledTimes(1)
		expect(outputListMock).toHaveBeenCalledWith(expect.any(ChannelsDriversCommand),
			expect.objectContaining({
				primaryKeyName: 'channelId',
				listTableFieldDefinitions: expect.arrayContaining(['name', 'driverId', 'version']),
			}),
			expect.any(Function))
	})

	it('passes predefined id or index to chooseChannel', async () => {
		await expect(ChannelsDriversCommand.run(['id-or-index'])).resolves.not.toThrow()

		expect(chooseChannelSpy).toHaveBeenCalledTimes(1)
		expect(chooseChannelSpy).toHaveBeenCalledWith(expect.any(ChannelsDriversCommand),
			'Select a channel.', 'id-or-index',
			expect.objectContaining({ allowIndex: true, includeReadOnly: true }))
		expect(outputListMock).toHaveBeenCalledTimes(1)
		expect(outputListMock).toHaveBeenCalledWith(expect.any(ChannelsDriversCommand),
			expect.objectContaining({
				primaryKeyName: 'channelId',
				listTableFieldDefinitions: expect.arrayContaining(['name', 'driverId', 'version']),
			}),
			expect.any(Function))
	})

	it('passes predefined id or index to chooseChannel', async () => {
		await expect(ChannelsDriversCommand.run([])).resolves.not.toThrow()

		expect(chooseChannelSpy).toHaveBeenCalledTimes(1)
		expect(chooseChannelSpy).toHaveBeenCalledWith(expect.any(ChannelsDriversCommand),
			'Select a channel.', undefined,
			expect.objectContaining({ allowIndex: true, includeReadOnly: true }))
		expect(outputListMock).toHaveBeenCalledTimes(1)
		expect(outputListMock).toHaveBeenCalledWith(expect.any(ChannelsDriversCommand),
			expect.objectContaining({
				primaryKeyName: 'channelId',
				listTableFieldDefinitions: expect.arrayContaining(['name', 'driverId', 'version']),
			}),
			expect.any(Function))

		const getData = outputListMock.mock.calls[0][2]

		const drivers = [{ name: 'driver' }] as DriverChannelDetailsWithName[]
		const listAssignedDriversWithNamesSpy = jest.spyOn(driversUtil, 'listAssignedDriversWithNames')
			.mockResolvedValueOnce(drivers)

		expect(await getData()).toBe(drivers)

		expect(listAssignedDriversWithNamesSpy).toHaveBeenCalledTimes(1)
		expect(listAssignedDriversWithNamesSpy).toHaveBeenCalledWith(expect.any(EdgeClient), 'chosen-channel-id')
	})
})
