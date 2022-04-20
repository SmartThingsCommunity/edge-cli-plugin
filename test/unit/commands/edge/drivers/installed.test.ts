import { outputListing } from '@smartthings/cli-lib'

import DriversInstalledCommand from '../../../../../src/commands/edge/drivers/installed'
import { chooseHub } from '../../../../../src/lib/commands/drivers-util'
import { HubsEndpoint, InstalledDriver } from '../../../../../src/lib/endpoints/hubs'


jest.mock('@smartthings/cli-lib', () => {
	const originalLib = jest.requireActual('@smartthings/cli-lib')

	return {
		...originalLib,
		outputListing: jest.fn(),
	}
})
jest.mock('../../../../../src/lib/commands/drivers-util')

describe('DriversInstalledCommand', () => {
	const hub = { name: 'Hub' } as InstalledDriver
	const chooseHubMock = jest.mocked(chooseHub).mockResolvedValue('chosen-hub-id')
	const apiHubsListInstalledSpy = jest.spyOn(HubsEndpoint.prototype, 'listInstalled').mockResolvedValue([hub])
	const apiHubsGetInstalledSpy = jest.spyOn(HubsEndpoint.prototype, 'getInstalled').mockResolvedValue(hub)
	const outputListingMock = jest.mocked(outputListing)

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('uses outputListing', async () => {
		await expect(DriversInstalledCommand.run([])).resolves.not.toThrow()

		expect(chooseHubMock).toHaveBeenCalledTimes(1)
		expect(chooseHubMock).toHaveBeenCalledWith(expect.any(DriversInstalledCommand),
			'Select a hub.', undefined, { allowIndex: true, useConfigDefault: true })

		expect(outputListingMock).toHaveBeenCalledTimes(1)
		expect(outputListingMock).toHaveBeenCalledWith(
			expect.any(DriversInstalledCommand),
			expect.objectContaining({ primaryKeyName: 'channelId' }),
			undefined,
			expect.any(Function),
			expect.any(Function),
		)
	})

	it('uses hub id from command line', async () => {
		await expect(DriversInstalledCommand.run(['--hub', 'cmd-line-hub-id'])).resolves.not.toThrow()

		expect(chooseHubMock).toHaveBeenCalledTimes(1)
		expect(chooseHubMock).toHaveBeenCalledWith(expect.any(DriversInstalledCommand),
			'Select a hub.', 'cmd-line-hub-id', { allowIndex: true, useConfigDefault: true })

		expect(outputListingMock).toHaveBeenCalledTimes(1)
	})

	test('list function', async () => {
		await expect(DriversInstalledCommand.run(['--device', 'cmd-line-device-id'])).resolves.not.toThrow()

		expect(chooseHubMock).toHaveBeenCalledTimes(1)
		expect(chooseHubMock).toHaveBeenCalledWith(expect.any(DriversInstalledCommand),
			'Select a hub.', undefined, { allowIndex: true, useConfigDefault: true })

		expect(outputListingMock).toHaveBeenCalledTimes(1)

		const listFunction = outputListingMock.mock.calls[0][3]

		expect(await listFunction()).toStrictEqual([hub])

		expect(apiHubsListInstalledSpy).toHaveBeenCalledTimes(1)
		expect(apiHubsListInstalledSpy).toHaveBeenCalledWith('chosen-hub-id', 'cmd-line-device-id')
	})

	test('get function', async () => {
		await expect(DriversInstalledCommand.run(['cmd-line-driver-id'])).resolves.not.toThrow()

		expect(chooseHubMock).toHaveBeenCalledTimes(1)
		expect(chooseHubMock).toHaveBeenCalledWith(expect.any(DriversInstalledCommand),
			'Select a hub.', undefined, { allowIndex: true, useConfigDefault: true })

		expect(outputListingMock).toHaveBeenCalledTimes(1)

		const getFunction = outputListingMock.mock.calls[0][4]

		expect(await getFunction('chosen-device-id')).toBe(hub)

		expect(apiHubsGetInstalledSpy).toHaveBeenCalledTimes(1)
		expect(apiHubsGetInstalledSpy).toHaveBeenCalledWith('chosen-hub-id', 'chosen-device-id')
	})
})
