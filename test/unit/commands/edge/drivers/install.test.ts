import { Device } from '@smartthings/core-sdk'

import { APICommand, ChooseOptions, ListDataFunction, selectFromList, SelectingConfig,
	SmartThingsCommandInterface } from '@smartthings/cli-lib'

import { chooseDriverFromChannel, chooseHub } from '../../../../../src/lib/commands/drivers-util'
import { EdgeCommand } from '../../../../../src/lib/edge-command'
import DriversInstallCommand from '../../../../../src/commands/edge/drivers/install'
import { EnrolledChannel, HubsEndpoint } from '../../../../../src/lib/endpoints/hubs'


jest.mock('@smartthings/cli-lib', () => {
	const originalLib = jest.requireActual('@smartthings/cli-lib')

	return {
		...originalLib,
		selectFromList: jest.fn(),
	}
})
jest.mock('../../../../../src/lib/commands/drivers-util')

describe('DriversInstallCommand', () => {
	const chooseHubMock = chooseHub as
		jest.Mock<Promise<string>, [APICommand, string, string | undefined, Partial<ChooseOptions>]>
	const chooseDriverFromChannelMock = chooseDriverFromChannel as
		jest.Mock<Promise<string>, [EdgeCommand, string, string | undefined]>
	const selectFromListMock = selectFromList as unknown as
		jest.Mock<Promise<string>, [SmartThingsCommandInterface, SelectingConfig<Device>,
			string, ListDataFunction<Device>, string, boolean]>
	const enrolledChannelsSpy = jest.spyOn(HubsEndpoint.prototype, 'enrolledChannels')
	const installDriverSpy = jest.spyOn(HubsEndpoint.prototype, 'installDriver')
	const logSpy = jest.spyOn(DriversInstallCommand.prototype, 'log').mockImplementation()

	chooseHubMock.mockResolvedValue('chosen-hub-id')
	selectFromListMock.mockResolvedValue('chosen-channel-id')
	chooseDriverFromChannelMock.mockResolvedValue('chosen-driver-id')
	installDriverSpy.mockImplementation(async () => {
		// empty
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('installs driver and logs message', async () => {
		await expect(DriversInstallCommand.run([])).resolves.not.toThrow()

		expect(chooseHubMock).toHaveBeenCalledTimes(1)
		expect(chooseHubMock).toHaveBeenCalledWith(expect.any(DriversInstallCommand),
			'Select a hub to install to.', undefined, undefined)
		expect(selectFromListMock).toHaveBeenCalledTimes(1)
		expect(selectFromListMock).toHaveBeenCalledWith(expect.any(DriversInstallCommand),
			expect.objectContaining({ primaryKeyName: 'channelId' }), undefined,
			expect.any(Function), 'Select a channel to install the driver from.')
		expect(chooseDriverFromChannelMock).toHaveBeenCalledTimes(1)
		expect(chooseDriverFromChannelMock).toHaveBeenCalledWith(expect.any(DriversInstallCommand),
			'chosen-channel-id', undefined)
		expect(installDriverSpy).toHaveBeenCalledTimes(1)
		expect(installDriverSpy).toHaveBeenCalledWith('chosen-driver-id', 'chosen-hub-id',
			'chosen-channel-id')
		expect(logSpy).toHaveBeenCalledWith('driver chosen-driver-id installed to hub chosen-hub-id')

		const channelsList = [{ name: 'channel' }] as EnrolledChannel[]
		enrolledChannelsSpy.mockResolvedValue(channelsList)

		const listChannels = selectFromListMock.mock.calls[0][3]

		expect(await listChannels()).toBe(channelsList)

		expect(enrolledChannelsSpy).toHaveBeenCalledTimes(1)
		expect(enrolledChannelsSpy).toHaveBeenCalledWith('chosen-hub-id')
	})

	it('uses hub from command line if specified', async () => {
		await expect(DriversInstallCommand.run(['--hub', 'command-line-hub-id'])).resolves.not.toThrow()

		expect(chooseHubMock).toHaveBeenCalledTimes(1)
		expect(chooseHubMock).toHaveBeenCalledWith(expect.any(DriversInstallCommand),
			'Select a hub to install to.', 'command-line-hub-id', undefined)
	})

	it('uses channel from command line if specified', async () => {
		await expect(DriversInstallCommand.run(['--channel', 'command-line-channel-id'])).resolves.not.toThrow()

		expect(selectFromListMock).toHaveBeenCalledTimes(0)
		expect(chooseDriverFromChannelMock).toHaveBeenCalledWith(expect.any(DriversInstallCommand),
			'command-line-channel-id', undefined)
	})
})
