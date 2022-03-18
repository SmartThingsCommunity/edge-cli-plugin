import fs from 'fs'

import JSZip from 'jszip'

import { ChannelsEndpoint, DriverChannelDetails, DriversEndpoint, EdgeDriver } from '@smartthings/core-sdk'

import { outputItem } from '@smartthings/cli-lib'

import PackageCommand from '../../../../../src/commands/edge/drivers/package'
import { chooseChannel } from '../../../../../src/lib/commands/channels-util'
import * as driversUtil from '../../../../../src/lib/commands/drivers-util'
import * as packageUtil from '../../../../../src/lib/commands/drivers/package-util'
import { HubsEndpoint } from '../../../../../src/lib/endpoints/hubs'


jest.mock('fs', () => {
	// if this isn't done, something breaks with sub-dependency 'fs-extra'
	const originalLib = jest.requireActual('fs')

	return {
		...originalLib,
		createWriteStream: jest.fn(),
		readFileSync: jest.fn(),
	}
})
jest.mock('jszip')

jest.mock('@smartthings/cli-lib', () => {
	const originalLib = jest.requireActual('@smartthings/cli-lib')

	return {
		...originalLib,
		outputItem: jest.fn(),
	}
})
jest.mock('../../../../../src/lib/commands/channels-util')

describe('PackageCommand', () => {
	const zipContents = {} as Uint8Array
	const jsZipMock = jest.mocked(JSZip)
	const pipeMock = jest.fn()
	const readableStream = {
		pipe: pipeMock,
	} as unknown as NodeJS.ReadableStream
	const generateNodeStreamMock = jest.fn().mockReturnValue(readableStream)
	const generateAsyncMock = jest.fn().mockReturnValue(zipContents)
	const mockJSZip = {
		generateNodeStream: generateNodeStreamMock,
		generateAsync: generateAsyncMock,
	} as unknown as JSZip

	const resolveProjectDirNameSpy = jest.spyOn(packageUtil, 'resolveProjectDirName')
	const processConfigFileSpy = jest.spyOn(packageUtil, 'processConfigFile')
	const processFingerprintsFileSpy = jest.spyOn(packageUtil, 'processFingerprintsFile')
	const buildTestFileMatchersSpy = jest.spyOn(packageUtil, 'buildTestFileMatchers')
	const processSrcDirSpy = jest.spyOn(packageUtil, 'processSrcDir')
	const processProfilesSpy = jest.spyOn(packageUtil, 'processProfiles')

	const driver = { driverId: 'driver id', version: 'driver version' } as EdgeDriver
	const outputItemMock = jest.mocked(outputItem)
		.mockImplementation((_command, _config, actionFunction): Promise<EdgeDriver> => {
			actionFunction()
			return Promise.resolve(driver)
		})
	const uploadSpy = jest.spyOn(DriversEndpoint.prototype, 'upload').mockResolvedValue(driver)

	const chooseChannelMock = jest.mocked(chooseChannel)
		.mockResolvedValue('channel id')
	const assignDriverSpy = jest.spyOn(ChannelsEndpoint.prototype, 'assignDriver')
		.mockResolvedValue({} as DriverChannelDetails)

	const chooseHubSpy = jest.spyOn(driversUtil, 'chooseHub').mockResolvedValue('hub id')
	const installDriverSpy = jest.spyOn(HubsEndpoint.prototype, 'installDriver').mockResolvedValue()

	const logSpy = jest.spyOn(PackageCommand.prototype, 'log').mockImplementation()

	afterEach(() => {
		jest.clearAllMocks()
	})

	const mockProjectDirectoryProcessing = (): void => {
		resolveProjectDirNameSpy.mockReturnValueOnce('project dir')
		jsZipMock.mockReturnValueOnce(mockJSZip)
		processConfigFileSpy.mockImplementationOnce(() => ({}))
		processFingerprintsFileSpy.mockImplementation()
		buildTestFileMatchersSpy.mockReturnValueOnce([])
		processSrcDirSpy.mockImplementation()
		processProfilesSpy.mockImplementation()
	}
	const expectProjectDirectoryProcessing = (): void => {
		expect(resolveProjectDirNameSpy).toHaveBeenCalledTimes(1)
		expect(resolveProjectDirNameSpy).toHaveBeenCalledWith('.')
		expect(processConfigFileSpy).toHaveBeenCalledTimes(1)
		expect(processConfigFileSpy).toHaveBeenCalledWith('project dir', mockJSZip)
		expect(processFingerprintsFileSpy).toHaveBeenCalledTimes(1)
		expect(processFingerprintsFileSpy).toHaveBeenCalledWith('project dir', mockJSZip)
		expect(buildTestFileMatchersSpy).toHaveBeenCalledTimes(1)
		expect(buildTestFileMatchersSpy).toHaveBeenCalledWith(undefined)
		expect(processSrcDirSpy).toHaveBeenCalledTimes(1)
		expect(processSrcDirSpy).toHaveBeenCalledWith('project dir', mockJSZip, [])
		expect(processProfilesSpy).toHaveBeenCalledTimes(1)
		expect(processProfilesSpy).toHaveBeenCalledWith('project dir', mockJSZip)
	}

	it('generates zip file with --build-only', async () => {
		const writeStreamOnMock = jest.fn()
		const writeStreamMock: fs.WriteStream = {
			on: writeStreamOnMock,
		} as unknown as fs.WriteStream
		const createWriteStreamMock = jest.mocked(fs.createWriteStream)

		mockProjectDirectoryProcessing()
		createWriteStreamMock.mockReturnValueOnce(writeStreamMock)
		pipeMock.mockReturnValueOnce(writeStreamMock)
		writeStreamOnMock.mockImplementationOnce((_event, action): void => {
			action()
		})

		await expect(PackageCommand.run(['--build-only', 'driver.zip'])).resolves.not.toThrow()

		expectProjectDirectoryProcessing()
		expect(generateNodeStreamMock).toHaveBeenCalledTimes(1)
		expect(generateNodeStreamMock)
			.toHaveBeenCalledWith({ type: 'nodebuffer', streamFiles: true, compression: 'DEFLATE' })
		expect(createWriteStreamMock).toHaveBeenCalledTimes(1)
		expect(createWriteStreamMock).toHaveBeenCalledWith('driver.zip')
		expect(pipeMock).toHaveBeenCalledTimes(1)
		expect(pipeMock).toHaveBeenCalledWith(writeStreamMock)
		expect(writeStreamOnMock).toHaveBeenCalledTimes(1)
		expect(writeStreamOnMock).toHaveBeenCalledWith('finish', expect.any(Function))
		expect(outputItemMock).toHaveBeenCalledTimes(0)
		expect(logSpy).toHaveBeenCalledWith('wrote driver.zip')
		expect(uploadSpy).toHaveBeenCalledTimes(0)
	})

	it('uploads pre-built zip file', async () => {
		const archiveData = {} as unknown as Buffer
		const readFileSyncMock = jest.mocked(fs.readFileSync)
			.mockReturnValueOnce(archiveData)

		await expect(PackageCommand.run(['--upload', 'driver.zip'])).resolves.not.toThrow()

		expect(readFileSyncMock).toHaveBeenCalledTimes(1)
		expect(readFileSyncMock).toHaveBeenCalledWith('driver.zip')
		expect(outputItemMock).toHaveBeenCalledTimes(1)
		expect(outputItemMock)
			.toHaveBeenCalledWith(expect.any(PackageCommand), expect.anything(), expect.any(Function))
		expect(uploadSpy).toHaveBeenCalledTimes(1)
		expect(uploadSpy).toHaveBeenCalledWith(archiveData)
		expect(chooseChannelMock).toHaveBeenCalledTimes(0)
		expect(assignDriverSpy).toHaveBeenCalledTimes(0)
		expect(chooseHubSpy).toHaveBeenCalledTimes(0)
		expect(installDriverSpy).toHaveBeenCalledTimes(0)
	})

	it('displays error message when zip file missing', async () => {
		const readFileSyncMock = jest.mocked(fs.readFileSync)
			.mockImplementationOnce(() => { throw { code: 'ENOENT' } })

		await expect(PackageCommand.run(['--upload', 'driver.zip'])).resolves.not.toThrow()

		expect(readFileSyncMock).toHaveBeenCalledTimes(1)
		expect(readFileSyncMock).toHaveBeenCalledWith('driver.zip')
		expect(outputItemMock).toHaveBeenCalledTimes(0)
		expect(logSpy).toHaveBeenCalledWith('No file named "driver.zip" found.')
	})

	it('throws unexpected error when zipping file', async () => {
		const readFileSyncMock = jest.mocked(fs.readFileSync)
			.mockImplementationOnce(() => { throw Error('failure') })

		await expect(PackageCommand.run(['--upload', 'driver.zip'])).rejects.toThrow(Error('failure'))

		expect(readFileSyncMock).toHaveBeenCalledTimes(1)
		expect(readFileSyncMock).toHaveBeenCalledWith('driver.zip')
		expect(outputItemMock).toHaveBeenCalledTimes(0)
	})

	it('generates and uploads', async () => {
		mockProjectDirectoryProcessing()

		await expect(PackageCommand.run([])).resolves.not.toThrow()

		expectProjectDirectoryProcessing()
		expect(generateAsyncMock).toHaveBeenCalledTimes(1)
		expect(generateAsyncMock).toHaveBeenCalledWith({ type: 'uint8array', compression: 'DEFLATE' })
		expect(outputItemMock).toHaveBeenCalledTimes(1)
		expect(outputItemMock)
			.toHaveBeenCalledWith(expect.any(PackageCommand), expect.anything(), expect.any(Function))
		expect(uploadSpy).toHaveBeenCalledTimes(1)
		expect(uploadSpy).toHaveBeenCalledWith(zipContents)
		expect(chooseChannelMock).toHaveBeenCalledTimes(0)
		expect(assignDriverSpy).toHaveBeenCalledTimes(0)
		expect(chooseHubSpy).toHaveBeenCalledTimes(0)
		expect(installDriverSpy).toHaveBeenCalledTimes(0)
	})

	it('assigns when --assign specified', async () => {
		mockProjectDirectoryProcessing()

		await expect(PackageCommand.run(['--assign'])).resolves.not.toThrow()

		expectProjectDirectoryProcessing()
		expect(generateAsyncMock).toHaveBeenCalledTimes(1)
		expect(generateAsyncMock).toHaveBeenCalledWith({ type: 'uint8array', compression: 'DEFLATE' })
		expect(outputItemMock).toHaveBeenCalledTimes(1)
		expect(outputItemMock)
			.toHaveBeenCalledWith(expect.any(PackageCommand), expect.anything(), expect.any(Function))
		expect(chooseChannelMock).toHaveBeenCalledTimes(1)
		expect(chooseChannelMock)
			.toHaveBeenCalledWith(expect.any(PackageCommand), 'Select a channel for the driver.',
				undefined, undefined)
		expect(assignDriverSpy).toHaveBeenCalledTimes(1)
		expect(assignDriverSpy)
			.toHaveBeenCalledWith('channel id', 'driver id', 'driver version')
		expect(uploadSpy).toHaveBeenCalledTimes(1)
		expect(uploadSpy).toHaveBeenCalledWith(zipContents)
		expect(chooseHubSpy).toHaveBeenCalledTimes(0)
		expect(installDriverSpy).toHaveBeenCalledTimes(0)
	})

	it('assigns when channel specified', async () => {
		mockProjectDirectoryProcessing()

		await expect(PackageCommand.run(['--channel', 'channel id arg'])).resolves.not.toThrow()

		expectProjectDirectoryProcessing()
		expect(generateAsyncMock).toHaveBeenCalledTimes(1)
		expect(generateAsyncMock).toHaveBeenCalledWith({ type: 'uint8array', compression: 'DEFLATE' })
		expect(outputItemMock).toHaveBeenCalledTimes(1)
		expect(outputItemMock)
			.toHaveBeenCalledWith(expect.any(PackageCommand), expect.anything(), expect.any(Function))
		expect(chooseChannelMock).toHaveBeenCalledTimes(1)
		expect(chooseChannelMock)
			.toHaveBeenCalledWith(expect.any(PackageCommand), 'Select a channel for the driver.',
				'channel id arg', undefined)
		expect(assignDriverSpy).toHaveBeenCalledTimes(1)
		expect(assignDriverSpy)
			.toHaveBeenCalledWith('channel id', 'driver id', 'driver version')
		expect(uploadSpy).toHaveBeenCalledTimes(1)
		expect(uploadSpy).toHaveBeenCalledWith(zipContents)
		expect(chooseHubSpy).toHaveBeenCalledTimes(0)
		expect(installDriverSpy).toHaveBeenCalledTimes(0)
	})

	it('installs when --install specified', async () => {
		mockProjectDirectoryProcessing()

		await expect(PackageCommand.run(['--install'])).resolves.not.toThrow()

		expectProjectDirectoryProcessing()
		expect(generateAsyncMock).toHaveBeenCalledTimes(1)
		expect(generateAsyncMock).toHaveBeenCalledWith({ type: 'uint8array', compression: 'DEFLATE' })
		expect(outputItemMock).toHaveBeenCalledTimes(1)
		expect(outputItemMock)
			.toHaveBeenCalledWith(expect.any(PackageCommand), expect.anything(), expect.any(Function))
		expect(chooseChannelMock).toHaveBeenCalledTimes(1)
		expect(chooseChannelMock)
			.toHaveBeenCalledWith(expect.any(PackageCommand), 'Select a channel for the driver.',
				undefined, undefined)
		expect(assignDriverSpy).toHaveBeenCalledTimes(1)
		expect(assignDriverSpy)
			.toHaveBeenCalledWith('channel id', 'driver id', 'driver version')
		expect(uploadSpy).toHaveBeenCalledTimes(1)
		expect(uploadSpy).toHaveBeenCalledWith(zipContents)
		expect(chooseHubSpy).toHaveBeenCalledTimes(1)
		expect(chooseHubSpy)
			.toHaveBeenCalledWith(expect.any(PackageCommand), 'Select a hub to install to.',
				undefined, undefined)
		expect(installDriverSpy).toHaveBeenCalledTimes(1)
		expect(installDriverSpy).toHaveBeenCalledWith('driver id', 'hub id', 'channel id')
	})

	it('installs when hub specified', async () => {
		mockProjectDirectoryProcessing()

		await expect(PackageCommand.run(['--hub', 'hub id arg'])).resolves.not.toThrow()

		expectProjectDirectoryProcessing()
		expect(generateAsyncMock).toHaveBeenCalledTimes(1)
		expect(generateAsyncMock).toHaveBeenCalledWith({ type: 'uint8array', compression: 'DEFLATE' })
		expect(outputItemMock).toHaveBeenCalledTimes(1)
		expect(outputItemMock)
			.toHaveBeenCalledWith(expect.any(PackageCommand), expect.anything(), expect.any(Function))
		expect(chooseChannelMock).toHaveBeenCalledTimes(1)
		expect(chooseChannelMock)
			.toHaveBeenCalledWith(expect.any(PackageCommand), 'Select a channel for the driver.',
				undefined, undefined)
		expect(assignDriverSpy).toHaveBeenCalledTimes(1)
		expect(assignDriverSpy)
			.toHaveBeenCalledWith('channel id', 'driver id', 'driver version')
		expect(uploadSpy).toHaveBeenCalledTimes(1)
		expect(uploadSpy).toHaveBeenCalledWith(zipContents)
		expect(chooseHubSpy).toHaveBeenCalledTimes(1)
		expect(chooseHubSpy)
			.toHaveBeenCalledWith(expect.any(PackageCommand), 'Select a hub to install to.',
				'hub id arg', undefined)
		expect(installDriverSpy).toHaveBeenCalledTimes(1)
		expect(installDriverSpy).toHaveBeenCalledWith('driver id', 'hub id', 'channel id')
	})
})