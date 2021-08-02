import { DriverInfo, DriverInfoStatus, handleConnectionErrors, LiveLogClient, LiveLogMessage, liveLogMessageFormatter, LogLevel, parseIpAndPort } from '../../../src/lib/live-logging'
import { v4 as uuidv4 } from 'uuid'
import stripAnsi from 'strip-ansi'
import axios, { AxiosResponse } from 'axios'
import { BearerTokenAuthenticator, NoOpAuthenticator } from '@smartthings/core-sdk'
import { PeerCertificate, TLSSocket } from 'tls'
import { Socket } from 'net'
import { ClientRequest } from 'http'


jest.mock('axios')

describe('live-logging', () => {
	describe('liveLogMessageFormatter', () => {
		const errorEvent: LiveLogMessage = {
			timestamp: new Date().toISOString(),
			driver_id: uuidv4(),
			driver_name: 'Driver',
			log_level: LogLevel.ERROR,
			message: 'Something bad happened.',
		}

		const randomEvent = {
			field1: 'one',
			field2: 2,
		}

		it('returns timestamp in event format', () => {
			const format = liveLogMessageFormatter(errorEvent)
			expect(format.time).toBe(errorEvent.timestamp)
		})

		it('errors out if passed bad event type', () => {
			expect(() => liveLogMessageFormatter(randomEvent)).toThrowError('Unexpected log message type.')
		})

		it('has expected formatString', () => {
			const format = liveLogMessageFormatter(errorEvent)

			// remove ANSI color codes
			const rawFormat = stripAnsi(format.formatString)

			expect(rawFormat).toBe(`ERROR ${errorEvent.driver_name}  ${errorEvent.message}`)
		})
	})

	describe('parseIpAndPort', () => {
		it.each`
			address                | expected
			${'192.168.0.1'}       | ${['192.168.0.1', undefined]}
			${'192.168.0.1:0'}     | ${['192.168.0.1', '0']}
			${'192.168.0.1:1234'}  | ${['192.168.0.1', '1234']}
			${'192.168.0.1:65535'} | ${['192.168.0.1', '65535']}
		`('returns $expected when $address is parsed', ({ address, expected }) => {
			expect(parseIpAndPort(address)).toStrictEqual(expected)
		})

		it.each([
			'192.168.0.1::1234',
			'fe80::af:7f6a:9613:aa15',
			'[fe80::af:7f6a:9613:aa15]:1234',
		])('throws invalid address and port error when %s is parsed', (address) => {
			expect(() => parseIpAndPort(address)).toThrow('Invalid IPv4 address and port format.')
		})

		it.each([
			'',
			'123',
			'abc',
		])('throws invalid address error when %s is parsed', (address) => {
			expect(() => parseIpAndPort(address)).toThrow('Invalid IPv4 address format.')
		})

		it.each([
			'192.168.0.1:123.4',
			'192.168.0.1:-1',
			'192.168.0.1:abc',
			`192.168.0.1: ${Number.MAX_SAFE_INTEGER + 1}`,
			`192.168.0.1: ${Number.MIN_SAFE_INTEGER - 1}`,
		])('throws invalid port error when %s is parsed', (address) => {
			expect(() => parseIpAndPort(address)).toThrow('Invalid port format.')
		})
	})

	describe('handleConnectionErrors', () => {
		it.each`
			error             | message
			${'ECONNREFUSED'} | ${'Unable to connect'}
			${'EHOSTUNREACH'} | ${'Unable to connect'}
			${'ETIMEDOUT'}    | ${'timed out'}
			${'EHOSTDOWN'}    | ${'192.168.0.1 is down'}
		`('throws $message when $error is handled', ({ error, message }) => {
			expect(() => handleConnectionErrors('192.168.0.1', error)).toThrow(message)
		})

		it.each([
			'ETIME',
			'econnrefused',
			'Unauthorized',
		])('does not throw when %s is handled', (error) => {
			expect(() => handleConnectionErrors('192.168.0.1', error)).not.toThrow()
		})
	})

	describe('LiveLogClient', () => {
		const authority = '192.168.0.1:9495'
		const token = uuidv4()
		const authenticator = new NoOpAuthenticator()
		let testClient: LiveLogClient

		beforeEach(() => {
			testClient = new LiveLogClient(authority, authenticator)
		})

		it('returns log source for all drivers', async () => {
			const sourceURL = await testClient.getLogSource()
			expect(sourceURL).not.toContain('?')
		})

		it('returns log source for a specific driver', async () => {
			const driverId = uuidv4()
			const sourceURL = await testClient.getLogSource(driverId)

			expect(sourceURL).toContain('?')
			expect(sourceURL).toContain(driverId)
		})

		it('calls drivers endpoint with auth and timeout', async () => {
			const bearerAuthenticator = new BearerTokenAuthenticator(token)
			testClient = new LiveLogClient(authority, bearerAuthenticator)

			const axiosResponse: AxiosResponse<DriverInfo[]> = {
				status: 200,
				statusText: 'OK',
				headers: {},
				config: {},
				data: [
					{
						driver_id: uuidv4(),
						driver_name: 'Driver 0',
						archive_hash: null,
						status: DriverInfoStatus.Installed,
					},
					{
						driver_id: uuidv4(),
						driver_name: 'Driver 1',
						archive_hash: null,
						status: DriverInfoStatus.Installed,
					},
				],
			}

			const axiosSpy = jest.spyOn(axios, 'get').mockResolvedValueOnce(axiosResponse)

			await testClient.getDrivers()

			expect(axiosSpy).toBeCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
					timeout: expect.any(Number),
				}),
			)
		})

		it('handles axios errors with user facing message', async () => {
			const axiosError = {
				message: 'connect ECONNREFUSED 192.168.0.1:9495',
				errno: 'ECONNREFUSED',
				code: 'ECONNREFUSED',
				syscall: 'connect',
				address: '192.168.0.1',
				port: 9495,
				config: {
					url: 'https://192.168.0.1:9495/drivers',
					method: 'get',
					headers: {
						Accept: 'application/json, text/plain, */*',
						Authorization: `Bearer ${token}`,
						'User-Agent': 'axios/0.21.1',
					},
					timeout: 5000,
					data: undefined,
				},
				response: undefined,
				isAxiosError: true,
			}

			jest.spyOn(axios, 'get').mockRejectedValueOnce(axiosError)

			await expect(testClient.getDrivers()).rejects.toThrow('Ensure hub address is correct and try again')
		})

		it('returns server certificate', async () => {
			const cert = { fingerprint: 'fingerprint' } as PeerCertificate
			const tlsSocketSpy = jest.spyOn(TLSSocket.prototype, 'getPeerCertificate').mockReturnValueOnce(cert)
			const certResponse: AxiosResponse = {
				data: '',
				status: 200,
				statusText: 'OK',
				headers: {},
				config: {},
				request: {
					connection: new TLSSocket(new Socket()),
				} as unknown as ClientRequest,
			}

			jest.spyOn(axios, 'get').mockResolvedValueOnce(certResponse)

			await expect(testClient.getCertificate()).resolves.toBe(cert)

			expect(tlsSocketSpy).toBeCalled()
		})

		it('throws when retrieving certificate fails', async () => {
			jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error('failed'))

			await expect(testClient.getCertificate()).rejects.toThrow('failed')
		})
	})
})
