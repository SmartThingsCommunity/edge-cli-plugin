import axios, { AxiosError, AxiosResponse, Method } from 'axios'
import https from 'https'
import net from 'net'
import { bgBlue, bgCyan, bgGray, bgGreen, bgRed, bgYellow, black, EventFormat, logManager } from '@smartthings/cli-lib'
import { Authenticator } from '@smartthings/core-sdk'
import { CLIError } from '@oclif/errors'
import { PeerCertificate, TLSSocket } from 'tls'
import { ClientRequest } from 'http'
import { inspect } from 'util'
import os from 'os'


export enum LogLevel {
	TRACE = 100,
	DEBUG = 200,
	INFO = 300,
	WARN = 400,
	ERROR = 500,
	FATAL = 600,
	PRINT = 1000,
}

export interface LiveLogMessage {
	/*
	 * The ISO formatted Local timestamp
	 */
	timestamp: string
	/**
	 * A UUID for this driver
	 */
	driver_id: string
	/**
	 * The human readable name of this driver
	 */
	driver_name: string
	/**
	 * The level this message is logged at
	 */
	log_level: number
	/**
	 * The content of this message
	 */
	message: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLiveLogMessage(event: any): event is LiveLogMessage {
	const liveLogEvent = event as LiveLogMessage
	return liveLogEvent.timestamp !== undefined &&
		liveLogEvent.driver_id !== undefined &&
		liveLogEvent.driver_name !== undefined &&
		liveLogEvent.log_level !== undefined &&
		liveLogEvent.message !== undefined
}

export enum DriverInfoStatus {
	NoArchive = 'no archive',
	Downloading = 'downloading',
	Installed = 'installed',
	Failure = 'failure',
	Unknown = 'unknown',
}

export interface DriverInfo {
	/**
	 * A UUID for this driver
	 * */
	driver_id: string
	/**
	 * The human readable name of this driver
	 * */
	driver_name: string
	/**
	 * If installed, the sha256 hash of the archive that was downloaded
	 * */
	archive_hash?: string | null
	/**
	 * The current status of this driver
	 * */
	status: string
}

function logLevelColor(level: LogLevel): string {
	const bgTrace = bgGreen
	const bgDebug = bgCyan
	const bgInfo = bgBlue
	const bgWarn = bgYellow
	const bgError = bgRed
	const bgFatal = bgGray
	const bgPrint = bgGray

	let colorString: string

	switch (level) {
		case LogLevel.TRACE:
			colorString = bgTrace(LogLevel[LogLevel.TRACE])
			break
		case LogLevel.DEBUG:
			colorString = bgDebug(LogLevel[LogLevel.DEBUG])
			break
		case LogLevel.INFO:
			colorString = bgInfo(LogLevel[LogLevel.INFO])
			break
		case LogLevel.WARN:
			colorString = bgWarn(LogLevel[LogLevel.WARN])
			break
		case LogLevel.ERROR:
			colorString = bgError(LogLevel[LogLevel.ERROR])
			break
		case LogLevel.FATAL:
			colorString = bgFatal(LogLevel[LogLevel.FATAL])
			break
		case LogLevel.PRINT:
			colorString = bgPrint(LogLevel[LogLevel.PRINT])
			break
		default:
			throw Error('Unknown log level')
	}

	// black text seems to provide better contrast in most terminals
	return black(colorString)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function liveLogMessageFormatter(event: any): EventFormat {
	if (isLiveLogMessage(event)) {
		const formatString = `${logLevelColor(event.log_level)} ${event.driver_name}  ${event.message}`
		const time = event.timestamp

		return { formatString, time }
	}

	throw Error('Unexpected log message type.')
}

export function parseIpAndPort(address: string): [string, string | undefined] {
	const items = address.split(':')
	if (items.length > 2) {
		throw new CLIError('Invalid IPv4 address and port format.')
	}

	if (!net.isIPv4(items[0])) {
		throw new CLIError('Invalid IPv4 address format.')
	}

	const ipv4 = items[0]
	if (items.length == 1) {
		return [ipv4, undefined]
	}

	const port = Number(items[1])
	if (Number.isInteger(port) && port >= 0 && port <= 65535) {
		return [ipv4, port.toString()]
	}

	throw new CLIError('Invalid port format.')
}

export function handleConnectionErrors(authority: string, error: string): never | void {
	const generalMessage = 'Ensure hub address is correct and try again'

	if (error.includes('ECONNREFUSED') || error.includes('EHOSTUNREACH')) {
		throw new CLIError(`Unable to connect to ${authority}. ${generalMessage}`)
	} else if (error.includes('ETIMEDOUT')) {
		throw new CLIError(`Connection to ${authority} timed out. ${generalMessage}`)
	} else if (error.includes('EHOSTDOWN')) {
		throw new CLIError(`The host at ${authority} is down. ${generalMessage}`)
	}
}

export function networkEnvironmentInfo(): string {
	return inspect(os.networkInterfaces())
}

function scrubAuthInfo(obj: unknown): string {
	const message = inspect(obj)
	const bearerRegex = /(Bearer [0-9a-f]{8})[0-9a-f-]{28}/i

	if (bearerRegex.test(message)) {
		return message.replace(bearerRegex, '$1-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
	} else { // assume there is some other auth format and redact the entire header value
		const authHeaderRegex = /'(Authorization: )([\s\S]*)'/i
		return message.replace(authHeaderRegex, '$1(redacted)')
	}
}

/**
 * Expected to manually verify the connected host (similar to overriding tls.checkServerIdentity)
 * by means that LiveLogClient isn't aware of ahead of time.
 */
export type HostVerifier = (cert: PeerCertificate) => Promise<void | never>

export class LiveLogClient {
	private authority: string
	private driversURL: URL
	private logsURL: URL
	private authenticator: Authenticator
	private hostVerified: boolean
	private verifier?: HostVerifier

	constructor(authority: string, authenticator: Authenticator, verifier?: HostVerifier) {
		const baseURL = new URL(`https://${authority}`)

		this.authority = authority
		this.driversURL = new URL('drivers', baseURL)
		this.logsURL = new URL('drivers/logs', baseURL)
		this.authenticator = authenticator
		this.hostVerified = verifier === undefined
		this.verifier = verifier
	}

	private async request(url: string, method: Method = 'GET'): Promise<AxiosResponse> {
		const config = await this.authenticator.authenticate({
			url: url,
			method: method,
			httpsAgent: new https.Agent({ rejectUnauthorized: false }),
			timeout: 5000, // milliseconds
		})

		let response
		try {
			response = await axios.request(config)
		} catch (error) {
			if (error.isAxiosError) {
				const axiosError = error as AxiosError
				const cliLogger = logManager.getLogger('cli')
				if (cliLogger.isDebugEnabled()) {
					const errorString = scrubAuthInfo(axiosError.toJSON())
					logManager.getLogger('cli').debug(`Error connecting to live-logging: ${errorString}\n\nLocal network interfaces: ${networkEnvironmentInfo()}`)
				}

				this.handleAxiosConnectionErrors(axiosError)
			}

			throw error
		}

		if (!this.hostVerified && this.verifier) {
			await this.verifier(this.getCertificate(response))
			this.hostVerified = true
		}

		return response
	}

	private handleAxiosConnectionErrors(error: AxiosError): never | void {
		if (error.code) {
			// hack to address https://github.com/axios/axios/issues/1543
			if (error.code === 'ECONNABORTED' && error.message.toLowerCase().includes('timeout')) {
				throw new CLIError(`Connection to ${this.authority} timed out. ` +
					'Ensure hub address is correct and try again')
			}

			handleConnectionErrors(this.authority, error.code)
		}
	}

	private getCertificate(response: AxiosResponse): PeerCertificate {
		return ((response.request as ClientRequest).socket as TLSSocket).getPeerCertificate()
	}

	public async getDrivers(): Promise<DriverInfo[]> {
		return (await this.request(this.driversURL.toString())).data
	}

	public getLogSource(driverId?: string): string {
		const sourceURL = this.logsURL

		if (driverId) {
			sourceURL.searchParams.set('driver_id', driverId)
		}

		return sourceURL.toString()
	}
}
