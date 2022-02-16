import LogCatCommand from '../../../../../src/commands/edge/drivers/logcat'
import { promises as fs } from 'fs'
import { Errors } from '@oclif/core'
import inquirer from 'inquirer'
import { HostVerifier, LiveLogClient } from '../../../../../src/lib/live-logging'
import { Certificate, PeerCertificate } from 'tls'
import { SseCommand } from '@smartthings/cli-lib'


const MOCK_IPV4 = '192.168.0.1'
const MOCK_HOSTNAME = `${MOCK_IPV4}:9495`
const MOCK_FINGERPRINT = '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00'
const MOCK_KNOWN_HUBS = JSON.stringify({
	[MOCK_HOSTNAME]: {
		hostname: MOCK_HOSTNAME,
		fingerprint: MOCK_FINGERPRINT,
	},
})
const MOCK_TLS_CERT: Certificate = {
	C: '',
	ST: '',
	L: '',
	O: '',
	OU: '',
	CN: '',
}
const MOCK_PEER_CERT: PeerCertificate = {
	fingerprint: MOCK_FINGERPRINT,
	subject: MOCK_TLS_CERT,
	issuer: MOCK_TLS_CERT,
	subjectaltname: '',
	infoAccess: {},
	modulus: '',
	exponent: '',
	valid_from: '',
	valid_to: '',
	fingerprint256: '',
	ext_key_usage: [],
	serialNumber: '',
	raw: Buffer.from(''),
}

jest.mock('inquirer', () => ({
	// answer "yes" to every host verification prompt
	prompt: jest.fn().mockResolvedValue({ connect: true }),
}))

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

const mockLiveLogClient = {
	getDrivers: jest.fn().mockResolvedValue([]),
	getLogSource: jest.fn().mockReturnValue(`https://${MOCK_HOSTNAME}/drivers/logs`),
} as unknown as LiveLogClient

jest.mock('../../../../../src/lib/live-logging', () => ({
	LiveLogClient: jest.fn(() => (mockLiveLogClient)),
	parseIpAndPort: jest.fn(() => [MOCK_IPV4, undefined]),
}))

describe('LogCatCommand', () => {
	const promptMock = jest.mocked(inquirer.prompt)
	const readFileMock = jest.mocked(fs.readFile)
	jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

	describe('host verification', () => {
		const logClientMock = jest.mocked(LiveLogClient)
		const warnSpy = jest.spyOn(LogCatCommand.prototype, 'warn').mockImplementation()

		beforeAll(() => {
			logClientMock.mockImplementation((_authority, _authenticator, verifier?: HostVerifier) => ({
				getDrivers: jest.fn(async () => {
					await verifier?.(MOCK_PEER_CERT)
					return Promise.resolve([])
				}),
			} as unknown as LiveLogClient))
		})

		afterAll(() => {
			// reset to default mock
			logClientMock.mockImplementation(jest.fn(() => mockLiveLogClient))
		})

		afterEach(() => {
			jest.clearAllMocks()
		})

		it('initializes SseCommand correctly', async () => {
			const initSseSpy = jest.spyOn(SseCommand.prototype, 'init')

			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).rejects.toThrow(new Errors.ExitError(0))

			expect(initSseSpy).toBeCalledTimes(1)
		})

		it('initializes a LogClient with a host verifier function', async () => {
			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).rejects.toThrow(new Errors.ExitError(0))

			expect(LiveLogClient).toBeCalledWith(expect.any(String), expect.anything(), expect.any(Function))
		})

		it('checks server identity and prompts user to validate fingerprint', async () => {
			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).rejects.toThrow(new Errors.ExitError(0))

			expect(fs.readFile).toBeCalledWith(expect.stringContaining('known_hubs.json'), 'utf-8')
			expect(warnSpy).toBeCalledWith(expect.stringContaining(MOCK_FINGERPRINT))
			expect(inquirer.prompt).toBeCalledWith(
				expect.objectContaining(
					{ default: false, message: 'Are you sure you want to continue connecting?' },
				),
			)
		})

		it('fails when user denies connection', async () => {
			// user answers "no" this time
			promptMock.mockResolvedValueOnce({ connect: false })

			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).rejects.toThrow('Hub verification failed.')
		})

		it('caches host details when user confirms connection', async () => {
			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).rejects.toThrow(new Errors.ExitError(0))

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

			readFileMock.mockResolvedValueOnce(knownHubsRead)

			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).rejects.toThrow(new Errors.ExitError(0))

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

			readFileMock.mockResolvedValueOnce(knownHubsRead)

			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).rejects.toThrow(new Errors.ExitError(0))

			expect(warnSpy).toBeCalledWith(expect.stringContaining(MOCK_FINGERPRINT))
			expect(inquirer.prompt).toBeCalledWith(
				expect.objectContaining(
					{ default: false, message: 'Are you sure you want to continue connecting?' },
				),
			)
			expect(fs.writeFile).toBeCalledWith(expect.stringContaining('known_hubs.json'), MOCK_KNOWN_HUBS)
		})

		it('skips user verification on known fingerprint', async () => {
			readFileMock.mockResolvedValueOnce(MOCK_KNOWN_HUBS)

			await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).rejects.toThrow(new Errors.ExitError(0))

			expect(warnSpy).not.toBeCalled()
			expect(inquirer.prompt).not.toBeCalled()
		})
	})

	it.todo('should exit gracefully when no drivers found to list')

	it.todo('should warn when --all is specified and no drivers currently installed')

	it.todo('happy path all with hub-address specified')

	it.todo('happy path all with no hub-address specified')

	it.todo('happy path deviceId specified')

	it.todo('happy path deviceId not specified')

	it.todo('failure to list drivers on hub')

	it.todo('failure connecting to SSE endpoint')

	it.todo('failure parsing hub-address')
})
