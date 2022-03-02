import LogCatCommand from '../../../../../src/commands/edge/drivers/logcat'
import { promises as fs } from 'fs'
import inquirer from 'inquirer'
import { DriverInfo, handleConnectionErrors, LiveLogClient, LiveLogMessage, liveLogMessageFormatter, parseIpAndPort } from '../../../../../src/lib/live-logging'
import { PeerCertificate } from 'tls'
import { askForRequiredString, convertToId, logEvent, selectGeneric, Sorting, SseCommand, stringTranslateToId } from '@smartthings/cli-lib'
import EventSource from 'eventsource'
import { CliUx, Errors } from '@oclif/core'


const MOCK_IPV4 = '192.168.0.1'
const MOCK_HOSTNAME = `${MOCK_IPV4}:9495`
const MOCK_SOURCE_URL = `https://${MOCK_HOSTNAME}/drivers/logs`
const MOCK_FINGERPRINT = '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00'
const MOCK_KNOWN_HUBS = JSON.stringify({
	[MOCK_HOSTNAME]: {
		hostname: MOCK_HOSTNAME,
		fingerprint: MOCK_FINGERPRINT,
	},
})
const MOCK_PEER_CERT = {
	fingerprint: MOCK_FINGERPRINT,
} as PeerCertificate

jest.mock('inquirer')

jest.mock('fs', () => {
	// if this isn't done, something breaks with sub-dependency 'fs-extra'
	const originalLib = jest.requireActual('fs')

	return {
		...originalLib,
		promises: {
			readFile: jest.fn(() => {
				const error: NodeJS.ErrnoException = new Error()
				error.code = 'ENOENT'
				throw error
			}),
			writeFile: jest.fn(),
		},
	}
})

jest.mock('@smartthings/cli-lib', () => {
	const originalLib = jest.requireActual('@smartthings/cli-lib')

	return {
		...originalLib,
		stringTranslateToId: jest.fn(),
		selectGeneric: jest.fn(),
		askForRequiredString: jest.fn(),
		logEvent: jest.fn(),
		convertToId: jest.fn().mockResolvedValue('driverId'),
	}
})

jest.mock('eventsource')

const mockLiveLogClient = {
	getDrivers: jest.fn().mockResolvedValue([]),
	getLogSource: jest.fn().mockReturnValue(MOCK_SOURCE_URL),
} as unknown as LiveLogClient

jest.mock('../../../../../src/lib/live-logging', () => ({
	LiveLogClient: jest.fn(() => (mockLiveLogClient)),
	parseIpAndPort: jest.fn(() => [MOCK_IPV4, undefined]),
	handleConnectionErrors: jest.fn(),
}))

// avoid creating a bunch of signal listeners between tests
jest.spyOn(SseCommand.prototype, 'init').mockImplementation()

describe('LogCatCommand', () => {
	const mockStringTranslateToId = jest.mocked(stringTranslateToId).mockResolvedValue('all')
	const mockSelectGeneric = jest.mocked(selectGeneric).mockRejectedValue(new Errors.ExitError(0))
	const mockAskForRequiredString = jest.mocked(askForRequiredString).mockResolvedValue(MOCK_IPV4)
	const mockPrompt = jest.mocked(inquirer.prompt)
	const mockReadFile = jest.mocked(fs.readFile)
	const mockGetLogSource = jest.mocked(mockLiveLogClient.getLogSource)
	const mockGetDrivers = jest.mocked(mockLiveLogClient.getDrivers)
	const mockParseIpAndPort = jest.mocked(parseIpAndPort)
	const setTimeoutSpy = jest.spyOn(global, 'setTimeout')
	const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
	const initSourceSpy = jest.spyOn(LogCatCommand.prototype, 'initSource').mockImplementation()
	const sourceSpy = jest.spyOn(LogCatCommand.prototype, 'source', 'get').mockReturnValue({} as EventSource)
	const teardownSpy = jest.spyOn(LogCatCommand.prototype, 'teardown').mockImplementation()
	const errorSpy = jest.spyOn(LogCatCommand.prototype, 'error').mockImplementation()
	const warnSpy = jest.spyOn(LogCatCommand.prototype, 'warn').mockImplementation()

	jest.spyOn(LogCatCommand.prototype.logger, 'debug').mockImplementation()
	jest.spyOn(CliUx.ux.action, 'start').mockImplementation()
	jest.spyOn(CliUx.ux.action, 'stop').mockImplementation()
	jest.spyOn(CliUx.ux.action, 'pauseAsync').mockImplementation(async (fn) => {
		return fn()
	})
	jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('initialization', () => {
		it('initializes SseCommand correctly', async () => {
			const initSseSpy = jest.spyOn(SseCommand.prototype, 'init')

			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).resolves.not.toThrow()

			expect(initSseSpy).toBeCalledTimes(1)
		})

		it('sets a timeout for eventsource that is cleared when connected', async () => {
			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`, '--all'])).resolves.not.toThrow()

			expect(setTimeoutSpy).toBeCalledWith(expect.any(Function), 30000)

			const callback = setTimeoutSpy.mock.calls[0][0]
			callback()

			expect(handleConnectionErrors).toBeCalledWith(MOCK_HOSTNAME, 'ETIMEDOUT')

			const openHandler = sourceSpy.mock.results[0].value.onopen
			openHandler({} as MessageEvent)

			const timeoutID: NodeJS.Timeout = setTimeoutSpy.mock.results[0].value

			expect(clearTimeoutSpy).toBeCalledWith(timeoutID)
		})

		it('initializes a LogClient with a host verifier function and timeout', async () => {
			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).resolves.not.toThrow()

			expect(LiveLogClient).toBeCalledWith(
				expect.objectContaining({
					verifier: expect.any(Function),
					timeout: expect.any(Number),
				}),
			)
		})

		it('accepts connect-timeout flag to use with both clients', async () => {
			const oneSecondTimeout = 1000
			await expect(LogCatCommand.run([`--connect-timeout=${oneSecondTimeout}`, '--all'])).resolves.not.toThrow()

			expect(LiveLogClient).toBeCalledWith(
				expect.objectContaining({
					timeout: oneSecondTimeout,
				}),
			)

			expect(setTimeoutSpy).toBeCalledWith(expect.any(Function), oneSecondTimeout)
		})
	})

	describe('host verification', () => {
		const logClientMock = jest.mocked(LiveLogClient)

		beforeAll(() => {
			logClientMock.mockImplementation((config) => ({
				...mockLiveLogClient,
				getDrivers: jest.fn(async () => {
					await config.verifier?.(MOCK_PEER_CERT)
					return Promise.resolve([])
				}),
			} as unknown as LiveLogClient))

			// answer "yes" to every host verification prompt
			mockPrompt.mockResolvedValue({ connect: true })
		})

		afterAll(() => {
			// reset to default mock
			logClientMock.mockImplementation(jest.fn(() => mockLiveLogClient))
			mockPrompt.mockReset()
		})

		it('checks server identity and prompts user to validate fingerprint', async () => {
			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).resolves.not.toThrow()

			expect(fs.readFile).toBeCalledWith(expect.stringContaining('known_hubs.json'), 'utf-8')
			expect(warnSpy).toBeCalledWith(expect.stringContaining(MOCK_FINGERPRINT))
			expect(inquirer.prompt).toBeCalledWith(
				expect.objectContaining(
					{ default: false, message: 'Are you sure you want to continue connecting?' },
				),
			)
		})

		it('calls command error when user denies connection', async () => {
			// user answers "no" this time
			mockPrompt.mockResolvedValueOnce({ connect: false })

			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).resolves.not.toThrow()

			expect(errorSpy).toBeCalledWith('Hub verification failed.')
		})

		it('caches host details when user confirms connection', async () => {
			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).resolves.not.toThrow()

			expect(fs.writeFile).toBeCalledWith(expect.stringContaining('known_hubs.json'), MOCK_KNOWN_HUBS)
		})

		it('does not modify other host details when writing to cache', async () => {
			const knownHubsRead = JSON.stringify({
				'192.168.0.0:9495': {
					hostname: '192.168.0.0:9495',
					fingerprint: 'A0:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00',
				},
				'192.168.0.2:9495': {
					hostname: '192.168.0.2:9495',
					fingerprint: 'B0:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00',
				},
			})

			const knownHubsWrite = {
				...JSON.parse(knownHubsRead),
				...JSON.parse(MOCK_KNOWN_HUBS),
			}

			mockReadFile.mockResolvedValueOnce(knownHubsRead)

			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).resolves.not.toThrow()

			expect(fs.writeFile).toBeCalledWith(expect.stringContaining('known_hubs.json'), JSON.stringify(knownHubsWrite))
		})

		it('overwrites cached details when changed', async () => {
			const knownHubsRead = JSON.stringify({
				[MOCK_HOSTNAME]: {
					hostname: MOCK_HOSTNAME,
					// cert changed this time
					fingerprint: 'A0:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00',
				},
			})

			mockReadFile.mockResolvedValueOnce(knownHubsRead)

			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).resolves.not.toThrow()

			expect(warnSpy).toBeCalledWith(expect.stringContaining(MOCK_FINGERPRINT))
			expect(inquirer.prompt).toBeCalledWith(
				expect.objectContaining(
					{ default: false, message: 'Are you sure you want to continue connecting?' },
				),
			)
			expect(fs.writeFile).toBeCalledWith(expect.stringContaining('known_hubs.json'), MOCK_KNOWN_HUBS)
		})

		it('skips user verification on known fingerprint', async () => {
			mockReadFile.mockResolvedValueOnce(MOCK_KNOWN_HUBS)

			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).resolves.not.toThrow()

			expect(warnSpy).not.toBeCalled()
			expect(inquirer.prompt).not.toBeCalled()
		})
	})

	it('should exit gracefully when no drivers found to list', async () => {
		const catchSpy = jest.spyOn(LogCatCommand.prototype, 'catch')

		await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).resolves.not.toThrow()

		expect(catchSpy).toBeCalledWith(new Errors.ExitError(0))
	})

	it('should warn after connection when --all specified and no drivers installed', async () => {
		await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`, '--all'])).resolves.not.toThrow()

		const openHandler = sourceSpy.mock.results[0].value.onopen
		openHandler({} as MessageEvent)

		expect(warnSpy).toBeCalledWith('No drivers currently installed.')
	})

	it('uses correct source URL when --all is specified', async () => {
		await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`, '--all'])).resolves.not.toThrow()

		expect(mockLiveLogClient.getLogSource).toBeCalledTimes(1)
		expect(mockLiveLogClient.getLogSource).toBeCalledWith()
		expect(initSourceSpy).toBeCalledWith(MOCK_SOURCE_URL)
	})

	it('prompts user for hub address when not specified', async () => {
		await expect(LogCatCommand.run(['--all'])).resolves.not.toThrow()

		expect(mockAskForRequiredString).toBeCalledWith('Enter hub IP address with optionally appended port number:')
	})

	it('uses correct source URL when driverId is specified', async () => {
		const driverId = 'driverId'
		const driverLogSource = `${MOCK_SOURCE_URL}?driver_id=${driverId}`
		mockStringTranslateToId.mockResolvedValueOnce(driverId)
		mockSelectGeneric.mockResolvedValueOnce(driverId)
		mockGetLogSource.mockReturnValueOnce(driverLogSource)

		await expect(LogCatCommand.run([driverId])).resolves.not.toThrow()

		expect(mockGetLogSource).toBeCalledTimes(1)
		expect(mockGetLogSource).toBeCalledWith('driverId')
		expect(initSourceSpy).toBeCalledWith(driverLogSource)
	})

	it('prompts user to select an installed driver when not specified', async () => {
		const driverList = [{}] as DriverInfo[]
		const driverId = 'driverId'
		mockGetDrivers.mockResolvedValueOnce(driverList)
		mockStringTranslateToId.mockResolvedValueOnce(undefined)
		mockPrompt.mockResolvedValueOnce({ itemIdOrIndex: driverId })

		await expect(LogCatCommand.run([])).resolves.not.toThrow()

		const expectedConfig = expect.objectContaining({
			itemName: 'driver',
			primaryKeyName: 'driver_id',
			sortKeyName: 'driver_name',
		})

		expect(mockStringTranslateToId).toBeCalledWith(
			expectedConfig,
			undefined,
			expect.any(Function),
		)

		const stringTranslateListDataFunction = mockStringTranslateToId.mock.calls[0][2]

		expect(await stringTranslateListDataFunction()).toStrictEqual(driverList)

		expect(mockSelectGeneric).toBeCalledWith(
			expect.any(LogCatCommand),
			expectedConfig,
			undefined,
			expect.any(Function),
			expect.any(Function),
		)

		const selectGenericListDataFunction = mockSelectGeneric.mock.calls[0][3]

		expect(await selectGenericListDataFunction()).toStrictEqual(driverList)

		const selectGenericIdRetrievalFunction = mockSelectGeneric.mock.calls[0][4]

		await selectGenericIdRetrievalFunction({ primaryKeyName: 'primaryKeyName' } as Sorting, driverList)

		expect(inquirer.prompt).toBeCalledWith(
			expect.objectContaining({
				type: 'input',
				message: 'Enter id or index',
				default: 'all',
			}),
		)

		expect(convertToId).toBeCalledWith(driverId, 'primaryKeyName', driverList)
	})

	it('uses correct source URL when "all" is specified during prompt', async () => {
		mockSelectGeneric.mockResolvedValueOnce('all')

		await expect(LogCatCommand.run([])).resolves.not.toThrow()

		expect(mockLiveLogClient.getLogSource).toBeCalledTimes(1)
		expect(mockLiveLogClient.getLogSource).toBeCalledWith()
		expect(initSourceSpy).toBeCalledWith(MOCK_SOURCE_URL)
	})

	it('throws errors from LogClient', async () => {
		const timeoutError = new Errors.CLIError('Timeout')
		mockGetDrivers.mockRejectedValueOnce(timeoutError)

		await expect(LogCatCommand.run([])).rejects.toThrow(timeoutError)
	})

	it('handles messages with correct event formatter', async () => {
		await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`, '--all'])).resolves.not.toThrow()

		const onmessage = sourceSpy.mock.results[0].value.onmessage
		const liveLogMessage = {} as MessageEvent<LiveLogMessage>
		onmessage(liveLogMessage)

		expect(logEvent).toBeCalledTimes(1)
		expect(logEvent).toBeCalledWith(liveLogMessage, liveLogMessageFormatter)
	})

	describe('eventsource onerror handler', () => {
		type eventSourceError = MessageEvent & Partial<{ status: number; message: string }>

		it('calls teardown on sse command', async () => {
			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`, '--all'])).resolves.not.toThrow()
			const onerror = sourceSpy.mock.results[0].value.onerror

			onerror({} as MessageEvent)

			expect(teardownSpy).toBeCalled()
		})

		it('calls command error if status is 401, 403', async () => {
			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`, '--all'])).resolves.not.toThrow()
			const onerror = sourceSpy.mock.results[0].value.onerror

			onerror({ status: 401 } as eventSourceError)

			expect(errorSpy).toBeCalledWith(expect.stringContaining('Unauthorized'))

			errorSpy.mockClear()
			onerror({ status: 403 } as eventSourceError)

			expect(errorSpy).toBeCalledWith(expect.stringContaining('Unauthorized'))
		})

		it('calls handleConnectionErrors if message is defined', async () => {
			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`, '--all'])).resolves.not.toThrow()
			const onerror = sourceSpy.mock.results[0].value.onerror

			onerror({ message: 'something failed' } as eventSourceError)

			expect(handleConnectionErrors).toBeCalledWith(MOCK_HOSTNAME, 'something failed')
		})

		it('calls command error with generic message if unable to handle', async () => {
			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`, '--all'])).resolves.not.toThrow()
			const onerror = sourceSpy.mock.results[0].value.onerror

			onerror({} as eventSourceError)

			expect(errorSpy).toBeCalledWith(expect.stringContaining('Unexpected error'))
		})
	})

	it('throws errors from parseIpAndPort', async () => {
		const invalidError = new Errors.CLIError('Invalid IPv4 address format.')
		mockParseIpAndPort.mockImplementationOnce(() => {
			throw invalidError
		})

		await expect(LogCatCommand.run([])).rejects.toThrow(invalidError)
	})
})
