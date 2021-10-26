import { Device, DeviceIntegrationType } from '@smartthings/core-sdk'

import { APICommand, ChooseOptions, chooseOptionsWithDefaults, ListDataFunction, Naming,
	selectFromList, SelectingConfig, SmartThingsCommandInterface, Sorting,
	stringTranslateToId } from '@smartthings/cli-lib'

import { chooseDriver, chooseDriverFromChannel, chooseHub, DriverChannelDetailsWithName,
	listAssignedDriversWithNames } from '../../../../src/lib/commands/drivers-util'
import * as driversUtil from '../../../../src/lib/commands/drivers-util'
import { EdgeClient } from '../../../../src/lib/edge-client'
import { EdgeCommand } from '../../../../src/lib/edge-command'
import { DriverChannelDetails } from '../../../../src/lib/endpoints/channels'
import { EdgeDriverSummary } from '../../../../src/lib/endpoints/drivers'


jest.mock('@smartthings/cli-lib', () => ({
	chooseOptionsWithDefaults: jest.fn(),
	stringTranslateToId: jest.fn(),
	selectFromList: jest.fn(),
}))

describe('drivers-util', () => {
	const selectFromListMock = selectFromList as unknown as
		jest.Mock<Promise<string>, [SmartThingsCommandInterface, SelectingConfig<Device>, string,
			ListDataFunction<Device>, string, boolean]>

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('chooseDriver', () => {
		const listDriversMock = jest.fn()
		const edgeClient = { drivers: { list: listDriversMock } }
		const command = { edgeClient } as unknown as EdgeCommand

		const chooseOptionsWithDefaultsMock = chooseOptionsWithDefaults as unknown as jest.Mock<ChooseOptions, [Partial<ChooseOptions>]>
		const stringTranslateToIdMock = stringTranslateToId as unknown as
			jest.Mock<Promise<string | undefined>, [Sorting & Naming, string | undefined, ListDataFunction<EdgeDriverSummary>]>

		it('presents user with list of drivers', async () => {
			chooseOptionsWithDefaultsMock.mockReturnValueOnce({ allowIndex: false } as ChooseOptions)
			selectFromListMock.mockImplementation(async () => 'chosen-driver-id')

			expect(await chooseDriver(command, 'prompt message', 'command-line-driver-id')).toBe('chosen-driver-id')

			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledTimes(1)
			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledWith(undefined)
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(0)
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'driverId', sortKeyName: 'name' }),
				'command-line-driver-id', expect.any(Function), 'prompt message')
		})

		it('translates id from index if allowed', async () => {
			chooseOptionsWithDefaultsMock.mockReturnValueOnce({ allowIndex: true } as ChooseOptions)
			stringTranslateToIdMock.mockResolvedValueOnce('translated-id')
			selectFromListMock.mockImplementation(async () => 'chosen-driver-id')

			expect(await chooseDriver(command, 'prompt message', 'command-line-driver-id',
				{ allowIndex: true })).toBe('chosen-driver-id')

			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledTimes(1)
			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledWith({ allowIndex: true })
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(1)
			expect(stringTranslateToIdMock).toHaveBeenCalledWith(
				expect.objectContaining({ primaryKeyName: 'driverId', sortKeyName: 'name' }),
				'command-line-driver-id', expect.any(Function))
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'driverId', sortKeyName: 'name' }),
				'translated-id', expect.any(Function), 'prompt message')
		})

		it('uses list function that lists drivers', async () => {
			chooseOptionsWithDefaultsMock.mockReturnValueOnce({ allowIndex: false } as ChooseOptions)
			selectFromListMock.mockImplementation(async () => 'chosen-driver-id')

			expect(await chooseDriver(command, 'prompt message', 'command-line-driver-id'))
				.toBe('chosen-driver-id')

			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledTimes(1)
			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledWith(undefined)
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(0)
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'driverId', sortKeyName: 'name' }),
				'command-line-driver-id', expect.any(Function), 'prompt message')

			const listFunction = selectFromListMock.mock.calls[0][3]

			const list = [{ name: 'Driver' }] as EdgeDriverSummary[]
			listDriversMock.mockResolvedValueOnce(list)

			expect(await listFunction()).toBe(list)

			expect(listDriversMock).toHaveBeenCalledTimes(1)
			expect(listDriversMock).toHaveBeenCalledWith()
		})
	})

	describe('chooseHub', () => {
		const listDevicesMock = jest.fn()
		const client = { devices: { list: listDevicesMock } }
		const command = { client } as unknown as APICommand

		const chooseOptionsWithDefaultsMock = chooseOptionsWithDefaults as unknown as
			jest.Mock<ChooseOptions, [Partial<ChooseOptions>]>
		const stringTranslateToIdMock = stringTranslateToId as unknown as
			jest.Mock<Promise<string | undefined>, [Sorting & Naming, string | undefined, ListDataFunction<Device>]>

		it('uses default hub if specified', async () => {
			chooseOptionsWithDefaultsMock.mockReturnValueOnce({ allowIndex: false } as ChooseOptions)
			selectFromListMock.mockImplementation(async () => 'chosen-hub-id')

			expect(await chooseHub(command, 'prompt message', undefined,
				'default-hub-id')).toBe('chosen-hub-id')

			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledTimes(1)
			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledWith(undefined)
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(0)
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'deviceId', sortKeyName: 'name' }),
				'default-hub-id', expect.any(Function), 'prompt message')
		})

		it('prefers command line over default', async () => {
			chooseOptionsWithDefaultsMock.mockReturnValueOnce({ allowIndex: false } as ChooseOptions)
			selectFromListMock.mockImplementation(async () => 'chosen-hub-id')

			expect(await chooseHub(command, 'prompt message', 'command-line-hub-id',
				'default-hub-id')).toBe('chosen-hub-id')

			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledTimes(1)
			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledWith(undefined)
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(0)
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'deviceId', sortKeyName: 'name' }),
				'command-line-hub-id', expect.any(Function), 'prompt message')
		})

		it('translates id from index if allowed', async () => {
			chooseOptionsWithDefaultsMock.mockReturnValueOnce({ allowIndex: true } as ChooseOptions)
			stringTranslateToIdMock.mockResolvedValueOnce('translated-id')
			selectFromListMock.mockImplementation(async () => 'chosen-hub-id')

			expect(await chooseHub(command, 'prompt message', 'command-line-hub-id',
				'default-hub-id', { allowIndex: true })).toBe('chosen-hub-id')

			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledTimes(1)
			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledWith({ allowIndex: true })
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(1)
			expect(stringTranslateToIdMock).toHaveBeenCalledWith(
				expect.objectContaining({ primaryKeyName: 'deviceId', sortKeyName: 'name' }),
				'command-line-hub-id', expect.any(Function))
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'deviceId', sortKeyName: 'name' }),
				'translated-id', expect.any(Function), 'prompt message')
		})

		it('uses list function that specifies hubs', async () => {
			chooseOptionsWithDefaultsMock.mockReturnValueOnce({ allowIndex: false } as ChooseOptions)
			selectFromListMock.mockImplementation(async () => 'chosen-hub-id')

			expect(await chooseHub(command, 'prompt message', 'command-line-hub-id',
				'default-hub-id')).toBe('chosen-hub-id')

			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledTimes(1)
			expect(chooseOptionsWithDefaultsMock).toHaveBeenCalledWith(undefined)
			expect(stringTranslateToIdMock).toHaveBeenCalledTimes(0)
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'deviceId', sortKeyName: 'name' }),
				'command-line-hub-id', expect.any(Function), 'prompt message')

			const listFunction = selectFromListMock.mock.calls[0][3]

			const list = [{ name: 'Hub' }] as Device[]
			listDevicesMock.mockResolvedValueOnce(list)

			expect(await listFunction()).toBe(list)

			expect(listDevicesMock).toHaveBeenCalledTimes(1)
			expect(listDevicesMock).toHaveBeenCalledWith(
				{ capability: 'bridge', type: DeviceIntegrationType.HUB })
		})
	})

	describe('listAssignedDriversWithNames', () => {
		const driverChannelDetailsList = [{ channelId: 'channel-id', driverId: 'driver-id' }] as
			unknown as DriverChannelDetails[]
		const listAssignedDriversMock = jest.fn()
		const getDriverChannelMetaInfoMock = jest.fn()
		const client = { channels: {
			listAssignedDrivers: listAssignedDriversMock,
			getDriverChannelMetaInfo: getDriverChannelMetaInfoMock,
		} } as unknown as EdgeClient

		it('lists drivers with their names', async () => {
			listAssignedDriversMock.mockReturnValueOnce(driverChannelDetailsList)
			getDriverChannelMetaInfoMock.mockResolvedValueOnce({ name: 'driver name' })

			const result = await listAssignedDriversWithNames(client, 'channel-id')

			expect(result).toEqual([{ channelId: 'channel-id', driverId: 'driver-id', name: 'driver name' }])

			expect(listAssignedDriversMock).toHaveBeenCalledTimes(1)
			expect(listAssignedDriversMock).toHaveBeenCalledWith('channel-id')
			expect(getDriverChannelMetaInfoMock).toHaveBeenCalledTimes(1)
			expect(getDriverChannelMetaInfoMock).toHaveBeenCalledWith('channel-id', 'driver-id')
		})

		it('skips deleted drivers', async () => {
			const driverChannelDetailsList = [
				{ channelId: 'channel-id', driverId: 'driver-id' },
				{ channelId: 'channel-id', driverId: 'deleted-driver-id' },
			] as unknown as DriverChannelDetails[]
			listAssignedDriversMock.mockReturnValueOnce(driverChannelDetailsList)
			getDriverChannelMetaInfoMock.mockResolvedValueOnce({ name: 'driver name' })
			getDriverChannelMetaInfoMock.mockRejectedValueOnce({ response: { status: 404 } })

			const result = await listAssignedDriversWithNames(client, 'channel-id')

			expect(result).toEqual([{ channelId: 'channel-id', driverId: 'driver-id', name: 'driver name' }])

			expect(listAssignedDriversMock).toHaveBeenCalledTimes(1)
			expect(listAssignedDriversMock).toHaveBeenCalledWith('channel-id')
			expect(getDriverChannelMetaInfoMock).toHaveBeenCalledTimes(2)
			expect(getDriverChannelMetaInfoMock).toHaveBeenCalledWith('channel-id', 'driver-id')
			expect(getDriverChannelMetaInfoMock).toHaveBeenCalledWith('channel-id', 'deleted-driver-id')
		})

		it('passes on other errors from getDriverChannelMetaInfo', async () => {
			listAssignedDriversMock.mockReturnValueOnce(driverChannelDetailsList)
			getDriverChannelMetaInfoMock.mockRejectedValueOnce(Error('random error'))

			expect(listAssignedDriversWithNames(client, 'channel-id')).rejects.toThrow(Error('random error'))

			expect(listAssignedDriversMock).toHaveBeenCalledTimes(1)
			expect(listAssignedDriversMock).toHaveBeenCalledWith('channel-id')
		})
	})

	describe('chooseDriverFromChannel', () => {
		it('presents user with list of drivers with names', async () => {
			const edgeClient = {} as EdgeClient
			const command = { edgeClient } as unknown as EdgeCommand
			selectFromListMock.mockResolvedValueOnce('chosen-driver-id')

			const result = await chooseDriverFromChannel(command, 'channel-id', 'preselected-driver-id')

			expect(result).toBe('chosen-driver-id')
			expect(selectFromListMock).toHaveBeenCalledTimes(1)
			expect(selectFromListMock).toHaveBeenCalledWith(command,
				expect.objectContaining({ primaryKeyName: 'driverId', sortKeyName: 'name' }),
				'preselected-driver-id', expect.any(Function), 'Select a driver to install.')

			const drivers = [{ name: 'driver' }] as DriverChannelDetailsWithName[]
			const listAssignedDriversWithNamesSpy = jest.spyOn(driversUtil, 'listAssignedDriversWithNames')
				.mockResolvedValueOnce(drivers)

			const listDrivers = selectFromListMock.mock.calls[0][3]

			expect(await listDrivers()).toBe(drivers)

			expect(listAssignedDriversWithNamesSpy).toHaveBeenCalledTimes(1)
			expect(listAssignedDriversWithNamesSpy).toHaveBeenCalledWith(edgeClient, 'channel-id')
		})
	})
})
