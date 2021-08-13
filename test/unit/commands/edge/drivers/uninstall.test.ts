import { v4 as uuid } from 'uuid'
import DriversUninstallCommand from '../../../../../src/commands/edge/drivers/uninstall'
import { InstalledDriver } from '../../../../../src/lib/endpoints/hubs'
import { selectFromList } from '@smartthings/cli-lib'


const MOCK_INSTALLED_DRIVER: InstalledDriver = {
	driverId: uuid(),
	name: 'driver',
	version: '1',
	channelId: uuid(),
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

jest.mock('../../../../../src/commands/edge/drivers/install', () => ({
	chooseHub: jest.fn().mockResolvedValue(uuid()),
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
	const mockSelectFromList = selectFromList as jest.Mock

	it('prompts user with list of installed drivers', async () => {
		mockSelectFromList.mockResolvedValueOnce(MOCK_INSTALLED_DRIVER.driverId)

		await expect(DriversUninstallCommand.run([])).resolves.not.toThrow()

		expect(mockSelectFromList).toBeCalledWith(
			expect.any(DriversUninstallCommand),
			expect.anything(),
			undefined,
			expect.any(Function),
			expect.any(String),
		)

		const listFunction = mockSelectFromList.mock.calls[0][3]

		expect(await listFunction()).toContain(MOCK_INSTALLED_DRIVER)
		expect(mockListInstalled).toBeCalled()
	})
})
