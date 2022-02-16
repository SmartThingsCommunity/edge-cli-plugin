import { CliUx, Errors, Flags } from '@oclif/core'
import inquirer from 'inquirer'
import { promises as fs } from 'fs'
import { PeerCertificate } from 'tls'
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
import { inspect } from 'util'


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
	private authority!: string
	private logClient!: LiveLogClient

	static description = 'stream logs from installed drivers'

	static flags = {
		...SseCommand.flags,
		all: Flags.boolean({
			char: 'a',
			description: 'stream from all installed drivers',
		}),
		'hub-address': Flags.string({
			description: 'IPv4 address of hub with optionally appended port number',
		}),
	}

	static args = [
		{
			name: 'driverId',
			description: 'a specific driver to stream logs from',
		},
	]

	private async checkServerIdentity(cert: PeerCertificate): Promise<void | never> {
		const knownHubsPath = `${this.config.cacheDir}/known_hubs.json`
		let knownHubs: Partial<Record<string, KnownHub>> = {}
		try {
			knownHubs = JSON.parse(await fs.readFile(knownHubsPath, 'utf-8'))
		} catch (error) {
			if (error.code !== 'ENOENT') { throw error }
		}

		const known = knownHubs[this.authority]
		if (!known || known.fingerprint !== cert.fingerprint) {
			this.warn(`The authenticity of ${this.authority} can't be established. Certificate fingerprint is ${cert.fingerprint}`)
			const verified = (await inquirer.prompt({
				type: 'confirm',
				name: 'connect',
				message: 'Are you sure you want to continue connecting?',
				default: false,
			})).connect

			if (!verified) {
				this.error('Hub verification failed.')
			}

			knownHubs[this.authority] = { hostname: this.authority, fingerprint: cert.fingerprint }
			await fs.writeFile(knownHubsPath, JSON.stringify(knownHubs))

			this.warn(`Permanently added ${this.authority} to the list of known hubs.`)
		}
	}

	private async chooseHubDrivers(commandLineDriverId?: string, driversList?: Promise<DriverInfo[]>): Promise<string> {
		const config = {
			itemName: 'driver',
			primaryKeyName: 'driver_id',
			sortKeyName: 'driver_name',
			listTableFieldDefinitions: driverFieldDefinitions,
		}

		const list = driversList ?? this.logClient.getDrivers()
		const preselectedId = await stringTranslateToId(config, commandLineDriverId, () => list)
		return selectGeneric(this, config, preselectedId, () => list, promptForDrivers)
	}

	async init(): Promise<void> {
		await super.init()

		const { args, argv, flags } = await this.parse(LogCatCommand)
		await super.setup(args, argv, flags)

		const hubIpAddress = flags['hub-address'] ?? await askForRequiredString('Enter hub IP address with optionally appended port number:')
		const [ipv4, port] = parseIpAndPort(hubIpAddress)
		const liveLogPort = port ?? DEFAULT_LIVE_LOG_PORT
		this.authority = `${ipv4}:${liveLogPort}`

		this.logClient = new LiveLogClient(this.authority, this.authenticator, this.checkServerIdentity.bind(this))
	}

	async run(): Promise<void> {
		const installedDriversPromise = this.logClient.getDrivers()

		let sourceURL: string
		if (this.flags.all) {
			sourceURL = this.logClient.getLogSource()
		} else {
			const driverId = await this.chooseHubDrivers(this.args.driverId, installedDriversPromise)
			sourceURL = driverId == DEFAULT_ALL_TEXT ? this.logClient.getLogSource() : this.logClient.getLogSource(driverId)
		}

		// ensure this resolves before connecting to the event source
		const installedDrivers = await installedDriversPromise

		CliUx.ux.action.start('connecting')
		await this.initSource(sourceURL)

		this.source.onopen = () => {
			if (installedDrivers.length === 0) {
				this.warn('No drivers currently installed.')
			}

			CliUx.ux.action.start('listening for logs')
		}

		// error Event from eventsource doesn't always overlap with MessageEvent
		this.source.onerror = (error: MessageEvent & Partial<{ status: number; message: string | undefined }>) => {
			CliUx.ux.action.stop('failed')
			this.teardown()
			this.logger.debug(`Error from eventsource. URL: ${sourceURL} Error: ${inspect(error)}`)

			try {
				if (error.status === 401 || error.status === 403) {
					this.error(`Unauthorized at ${this.authority}`)
				}

				if (error.message !== undefined) {
					handleConnectionErrors(this.authority, error.message)
				}

				this.error(`Unexpected error from event source ${inspect(error)}`)
			} catch (error) {
				if (error instanceof Error) {
					Errors.handle(error)
				}
			}
		}

		this.source.onmessage = (event: MessageEvent<LiveLogMessage>) => {
			logEvent(event, liveLogMessageFormatter)
		}
	}
}
