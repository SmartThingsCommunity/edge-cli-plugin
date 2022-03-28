import DriversUninstallCommand from '../../../../../src/commands/edge/drivers/uninstall'
import { InstalledDriver } from '../../../../../src/lib/endpoints/hubs'
import { selectFromList } from '@smartthings/cli-lib'


const MOCK_INSTALLED_DRIVER: InstalledDriver = {
	driverId: 'driverId',
	name: 'driver',
	version: '1',
	channelId: 'channelId',
	developer: '',
	vendorSupportInformation: '',
	permissions: {},
}

jest.mock('@smartthings/cli-lib', () => {
	const originalLib = jest.requireActual('@smartthings/cli-lib')

	return {
		...originalLib,
		stringTranslateToId: jest.fn().mockResolvedValue(undefined),
		selectFromList: jest.fn(),
	}
})

jest.mock('../../../../../src/lib/commands/drivers-util', () => ({
	chooseHub: jest.fn().mockResolvedValue('hubId'),
}))

const mockListInstalled = jest.fn().mockResolvedValue([MOCK_INSTALLED_DRIVER])

jest.mock('../../../../../src/lib/edge-client', () => ({
	EdgeClient: jest.fn(() => ({
		hubs: {
			uninstallDriver: jest.fn(),
			listInstalled: mockListInstalled,
		},
	})),
}))

// ignore console output
jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

describe('DriversUninstallCommand', () => {
	const mockSelectFromList = jest.mocked(selectFromList)

	it('prompts user with list of installed drivers', async () => {
		mockSelectFromList.mockResolvedValueOnce(MOCK_INSTALLED_DRIVER.driverId)

		await expect(DriversUninstallCommand.run([])).resolves.not.toThrow()

		expect(mockSelectFromList).toBeCalledWith(
			expect.any(DriversUninstallCommand),
			expect.objectContaining({}),
			expect.objectContaining({}),
		)

		const listItems = mockSelectFromList.mock.calls[0][2].listItems

		expect(await listItems()).toContain(MOCK_INSTALLED_DRIVER)
		expect(mockListInstalled).toBeCalled()
	})
})
