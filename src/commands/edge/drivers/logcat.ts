import { flags } from '@oclif/command'
import { handle } from '@oclif/errors'
import cli from 'cli-ux'
import inquirer from 'inquirer'
import { promises as fs } from 'fs'
import {
	DriverInfo,
	handleConnectionErrors,
	LiveLogClient,
	LiveLogMessage,
	liveLogMessageFormatter,
	parseIpAndPort,
} from '../../../lib/live-logging'
import {
	askForRequiredString,
	convertToId,
	logEvent,
	selectGeneric,
	Sorting,
	SseCommand,
	stringTranslateToId,
	TableFieldDefinition,
} from '@smartthings/cli-lib'


const DEFAULT_ALL_TEXT = 'all'
const DEFAULT_LIVE_LOG_PORT = 9495

/**
 * Define labels to stay consistent with other driver commands
 */
const driverFieldDefinitions: TableFieldDefinition<DriverInfo>[] = [
	{
		prop: 'driver_id',
		label: 'Driver Id',
	},
	{
		prop: 'driver_name',
		label: 'Name',
	},
]

async function promptForDrivers(fieldInfo: Sorting, list: DriverInfo[], prompt?: string): Promise<string> {
	const primaryKeyName = fieldInfo.primaryKeyName

	const itemIdOrIndex: string = (await inquirer.prompt({
		type: 'input',
		name: 'itemIdOrIndex',
		message: prompt ?? 'Enter id or index',
		default: DEFAULT_ALL_TEXT,
		validate: input => {
			return input === DEFAULT_ALL_TEXT ||
				convertToId(input, primaryKeyName, list)
				? true
				: `Invalid id or index "${input}". Please enter an index or valid id.`
		},
	})).itemIdOrIndex

	const inputId = itemIdOrIndex == DEFAULT_ALL_TEXT ? itemIdOrIndex : convertToId(itemIdOrIndex, primaryKeyName, list)
	if (inputId === false) {
		throw Error(`unable to convert ${itemIdOrIndex} to id`)
	}

	return inputId
}

interface KnownHub {
	hostname: string
	fingerprint: string
}

export default class LogCatCommand extends SseCommand {
	static description = 'stream logs from installed drivers'

	static flags = {
		...SseCommand.flags,
		all: flags.boolean({
			char: 'a',
			description: 'stream from all installed drivers',
		}),
		'hub-address': flags.string({
			description: 'IPv4 address of hub with optionally appended port number',
		}),
	}

	static args = [
		{
			name: 'driverId',
			description: 'a specific driver to stream logs from',
		},
	]

	private async checkServerIdentity(authority: string, client: LiveLogClient): Promise<void> {
		const cert = await client.getCertificate()

		const knownHubsPath = `${this.config.cacheDir}/known_hubs.json`
		let knownHubs: Partial<Record<string, KnownHub>> = {}
		try {
			knownHubs = JSON.parse(await fs.readFile(knownHubsPath, 'utf-8'))
		} catch (error) {
			if (error.code !== 'ENOENT') { throw error }
		}

		const known = knownHubs[authority]
		if (!known || known.fingerprint !== cert.fingerprint) {
			cli.warn(`The authenticity of ${authority} can't be established. Certificate fingerprint is ${cert.fingerprint}`)
			const verified = (await inquirer.prompt({
				type: 'confirm',
				name: 'connect',
				message: 'Are you sure you want to continue connecting?',
				default: false,
			})).connect

			if (!verified) {
				this.error('Hub verification failed.')
			}

			knownHubs[authority] = { hostname: authority, fingerprint: cert.fingerprint }
			await fs.writeFile(knownHubsPath, JSON.stringify(knownHubs))

			cli.warn(`Permanently added ${authority} to the list of known hubs.`)
		}
	}

	private async chooseHubDrivers(client: LiveLogClient, commandLineDriverId?: string): Promise<string> {
		const config = {
			itemName: 'driver',
			primaryKeyName: 'driver_id',
			sortKeyName: 'driver_name',
			listTableFieldDefinitions: driverFieldDefinitions,
		}

		const driversList = client.getDrivers()
		const preselectedId = await stringTranslateToId(config, commandLineDriverId, () => driversList)
		return selectGeneric(this, config, preselectedId, () => driversList, promptForDrivers)
	}

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(LogCatCommand)
		await super.setup(args, argv, flags)

		const hubIpAddress = flags['hub-address'] ?? await askForRequiredString('Enter hub IP address with optionally appended port number:')
		const [ipv4, port] = parseIpAndPort(hubIpAddress)

		const liveLogPort = port ?? DEFAULT_LIVE_LOG_PORT
		const authority = `${ipv4}:${liveLogPort}`

		const logClient = new LiveLogClient(authority, this.authenticator)
		await this.checkServerIdentity(authority, logClient)

		let sourceURL
		if (flags.all) {
			sourceURL = await logClient.getLogSource()
		} else {
			const driverId = await this.chooseHubDrivers(logClient, args.driverId)
			sourceURL = driverId == DEFAULT_ALL_TEXT ? await logClient.getLogSource() : await logClient.getLogSource(driverId)
		}

		cli.action.start('connecting')
		await this.initSource(sourceURL)

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		this.source.onerror = (error: any) => {
			cli.action.stop('failed')
			this.teardown()
			try {
				if (error?.status === 401 || error?.status === 403) {
					this.error(`Unauthorized at ${authority}`)
				}

				handleConnectionErrors(authority, error?.message)
				this.error(error?.message ?? error)
			} catch (error) {
				handle(error)
			}
		}

		this.source.onopen = () => {
			cli.action.start('listening for logs')
		}

		this.source.onmessage = (event: MessageEvent<LiveLogMessage>) => {
			logEvent(event, liveLogMessageFormatter)
		}
	}
}
