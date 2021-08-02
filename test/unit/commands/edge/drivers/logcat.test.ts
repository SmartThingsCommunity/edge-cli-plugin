import LogCatCommand from '../../../../../src/commands/edge/drivers/logcat'
import { promises as fs } from 'fs'
import { ExitError } from '@oclif/errors'
import inquirer from 'inquirer'
import cli from 'cli-ux'


const MOCK_IPV4 = '192.168.0.1'
const MOCK_HOSTNAME = `${MOCK_IPV4}:9495`
const MOCK_FINGERPRINT = '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00'
const MOCK_KNOWN_HUBS = JSON.stringify({
	[MOCK_HOSTNAME]: {
		hostname: MOCK_HOSTNAME,
		fingerprint: MOCK_FINGERPRINT,
	},
})

jest.mock('cli-ux')

jest.mock('inquirer', () => ({
	// answer "yes" to every host verification prompt
	prompt: jest.fn().mockResolvedValue({ connect: true }),
}))

jest.mock('fs', () => ({
	promises: {
		readFile: jest.fn(() => {
			const error: NodeJS.ErrnoException = new Error()
			error.code = 'ENOENT'
			throw error
		}),
		writeFile: jest.fn(),
	},
}))

const mockGetCertificate = jest.fn().mockResolvedValue({ fingerprint: MOCK_FINGERPRINT })

jest.mock('../../../../../src/lib/live-logging', () => ({
	LiveLogClient: jest.fn(() => ({
		getCertificate: mockGetCertificate,
		getDrivers: jest.fn().mockResolvedValue([]),
	})),
	parseIpAndPort: jest.fn(() => [MOCK_IPV4, undefined]),
}))

describe('LogCatCommand', () => {
	const promptMock = inquirer.prompt as unknown as jest.Mock
	const readFileMock = fs.readFile as jest.Mock
	jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('checks server identity and prompts user to validate fingerprint', async () => {
		await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).rejects.toThrow(new ExitError(0))

		expect(mockGetCertificate).toBeCalled()
		expect(fs.readFile).toBeCalledWith(expect.stringContaining('known_hubs.json'), 'utf-8')
		expect(cli.warn).toBeCalledWith(expect.stringContaining(MOCK_FINGERPRINT))
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
		await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).rejects.toThrow(new ExitError(0))

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

		await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).rejects.toThrow(new ExitError(0))

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

		await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).rejects.toThrow(new ExitError(0))

		expect(cli.warn).toBeCalledWith(expect.stringContaining(MOCK_FINGERPRINT))
		expect(inquirer.prompt).toBeCalledWith(
			expect.objectContaining(
				{ default: false, message: 'Are you sure you want to continue connecting?' },
			),
		)
		expect(fs.writeFile).toBeCalledWith(expect.stringContaining('known_hubs.json'), MOCK_KNOWN_HUBS)
	})

	it('skips user verification on known fingerprint', async () => {
		readFileMock.mockResolvedValueOnce(MOCK_KNOWN_HUBS)

		await expect(LogCatCommand.run([`--hub-address=${MOCK_IPV4}`])).rejects.toThrow(new ExitError(0))

		expect(cli.warn).not.toBeCalled()
		expect(inquirer.prompt).not.toBeCalled()
	})

	it.todo('happy path no drivers found')

	it.todo('happy path all with hub-address specified')

	it.todo('happy path all with no hub-address specified')

	it.todo('happy path deviceId specified')

	it.todo('happy path deviceId not specified')

	it.todo('happy path deviceId not specified')

	it.todo('failure to list drivers on hub')

	it.todo('failure connecting to SSE endpoint')

	it.todo('failure parsing hub-address')
})
