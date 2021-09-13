import fs from 'fs'

import { flags } from '@oclif/command'
import { CLIError } from '@oclif/errors'
import JSZip from 'jszip'
import yaml from 'js-yaml'
import picomatch from 'picomatch'

import { outputItem } from '@smartthings/cli-lib'

import { EdgeCommand } from '../../../lib/edge-command'
import { chooseChannel } from '../channels'
import { chooseHub } from './install'


interface YAMLFileData {
	[key: string]: string
}

export function isFile(filename: string): boolean {
	return fs.existsSync(filename) && fs.lstatSync(filename).isFile()
}

export function isDir(filename: string): boolean {
	return fs.existsSync(filename) && fs.lstatSync(filename).isDirectory()
}

export function findYAMLFilename(baseName: string): string | false {
	let retVal = `${baseName}.yaml`
	if (isFile(retVal)) {
		return retVal
	}

	retVal = `${baseName}.yml`
	if (isFile(retVal)) {
		return retVal
	}

	return false
}

export function requireDir(dirName: string): string {
	if (isDir(dirName)) {
		return dirName
	}
	throw new CLIError(`missing required directory ${dirName}`)
}

export default class PackageCommand extends EdgeCommand {
	static description = 'build and upload an edge package'

	static args = [{
		name: 'projectDirectory',
		description: 'directory containing project to upload',
		default: '.',
	}]

	static flags = {
		...EdgeCommand.flags,
		...outputItem.flags,
		'build-only': flags.string({
			char: 'b',
			description: 'save package to specified zip file but skip upload',
			exclusive: ['upload'],
		}),
		upload: flags.string({
			char: 'u',
			description: 'upload zip file previously built with --build flag',
			exclusive: ['build-only'],
		}),
		assign: flags.boolean({
			char: 'a',
			description: 'prompt for a channel to assign the driver to after upload',
			exclusive: ['channel', 'build-only'],
		}),
		channel: flags.string({
			description: 'automatically assign driver to specified channel after upload',
			exclusive: ['assign', 'build-only'],
		}),
		install: flags.boolean({
			char: 'I',
			description: 'prompt for hub to install to after assigning it to the channel, implies --assign if --assign or --channel not included',
			exclusive: ['hub', 'build-only'],
		}),
		hub: flags.string({
			description: 'automatically install driver to specified hub, implies --assign if --assign or --channel not included',
			exclusive: ['install', 'build-only'],
		}),
	}

	static examples = [`# build and upload driver found in current directory:
$ smartthings edge:drivers:package

# build and upload driver found in current directory, assign it to a channel, and install it;
# user will be prompted for channel and hub
$ smartthings edge:drivers:package -I

# build and upload driver found in current directory then assign it to the specified channel
# and install it to the specified hub
$ smartthings edge:drivers:package --channel <channel-id> --hub <hubId>

# build and upload driver found in the my-driver directory
$ smartthings edge:drivers:package my-driver

# build the driver in the my-package directory and save it as driver.zip
$ smartthings edge:drivers:package -b driver.zip my-package

# upload the previously built driver found in driver.zip
$ smartthings edge:drivers:package -u driver.zip`]

	getProjectDirectory(): string {
		let projectDirectory = this.args.projectDirectory
		if (projectDirectory.endsWith('/')) {
			projectDirectory = projectDirectory.slice(0, -1)
		}
		if (!isDir(projectDirectory)) {
			throw new CLIError(`${projectDirectory} must exist and be a directory`)
		}
		return projectDirectory
	}

	processConfigFile(projectDirectory: string, zip: JSZip): YAMLFileData {
		const configFile = findYAMLFilename(`${projectDirectory}/config`)
		if (configFile === false) {
			throw new CLIError('missing main config.yaml (or config.yml) file')
		}

		try {
			const fileContents = fs.readFileSync(configFile, 'utf-8')
			const parsedConfig = yaml.safeLoad(fileContents)

			if (parsedConfig == null) {
				throw new CLIError('empty config file')
			}
			if (typeof parsedConfig === 'string') {
				throw new CLIError('invalid config file')
			}

			zip.file('config.yml', fs.createReadStream(configFile))

			return parsedConfig as YAMLFileData
		} catch (error) {
			throw new CLIError(`unable to parse ${configFile}: ${error}`)
		}
	}

	processFingerprintsFile(projectDirectory: string, parsedConfig: YAMLFileData, zip: JSZip): void {
		const fingerprintsFile = findYAMLFilename(`${projectDirectory}/fingerprints`)
		if (fingerprintsFile !== false) {
			// validate file is at least parsable as a YAML file
			try {
				yaml.safeLoad(fs.readFileSync(fingerprintsFile, 'utf-8'))
			} catch (error) {
				throw new CLIError(`unable to parse ${fingerprintsFile}: ${error}`)
			}
			zip.file('fingerprints.yml', fs.createReadStream(fingerprintsFile))
		}
	}

	testFileMatchers(): picomatch.Matcher[] {
		const retVal = []

		const config = this.profileConfig.edgeDriverTestDirs
		if (typeof config === 'string') {
			retVal.push(picomatch(config))
		} else if (Array.isArray(config)) {
			for (const glob of config) {
				retVal.push(picomatch(glob))
			}
		} else {
			retVal.push(picomatch('test/**'))
			retVal.push(picomatch('tests/**'))
		}

		return retVal
	}

	processSrcDir(projectDirectory: string, zip: JSZip): void {
		const testFileMatchers = this.testFileMatchers()
		const srcDir = requireDir(`${projectDirectory}/src`)
		if (!isFile(`${srcDir}/init.lua`)) {
			throw new CLIError(`missing required ${srcDir}/init.lua file}`)
		}

		const walkDir = (fromDir: string, nested = 0): void => {
			for (const filename of fs.readdirSync(fromDir)) {
				const fullFilename = `${fromDir}/${filename}`
				if (isDir(fullFilename)) {
					// maximum depth is defined by server
					if (nested < 8) {
						walkDir(fullFilename, nested + 1)
					} else {
						throw new CLIError(`drivers directory nested too deeply (at ${fullFilename}); max depth is 10`)
					}
				} else {
					const filenameForTestMatch = fullFilename.substr(srcDir.length + 1)
					if (!testFileMatchers.some(matcher => matcher(filenameForTestMatch))) {
						const archiveName = `src${fullFilename.substring(srcDir.length)}`
						zip.file(archiveName, fs.createReadStream(fullFilename))
					}
				}
			}
		}

		walkDir(srcDir)
	}

	processProfiles(projectDirectory: string, parsedConfig: YAMLFileData, zip: JSZip): void {
		const profilesDir = requireDir(`${projectDirectory}/profiles`)

		for (const filename of fs.readdirSync(profilesDir)) {
			const fullFilename = `${profilesDir}/${filename}`
			// make sure profiles are at least valid yaml
			if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
				yaml.safeLoad(fs.readFileSync(fullFilename, 'utf-8'))
				let archiveName = `profiles${fullFilename.substring(profilesDir.length)}`
				if (archiveName.endsWith('.yaml')) {
					archiveName = `${archiveName.slice(0, -4)}yml`
				}
				zip.file(archiveName, fs.createReadStream(fullFilename))
			} else {
				throw new CLIError(`invalid profile file ${fullFilename} (must have .yaml or .yml extension)`)
			}
		}
	}

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(PackageCommand)
		await super.setup(args, argv, flags)

		const uploadAndPostProcess = async (archiveData: Uint8Array): Promise<void> => {
			const config = {
				tableFieldDefinitions: ['driverId', 'name', 'packageKey', 'version'],
			}
			const driver = await outputItem(this, config, () => this.edgeClient.drivers.upload(archiveData))
			const doAssign = flags.assign || flags.channel || flags.install || flags.hub
			const doInstall = flags.install || flags.hub
			if (doAssign) {
				const driverId = driver.driverId
				const version = driver.version
				const channelId = await chooseChannel(this, 'Select a channel for the driver.', flags.channel)
				await this.edgeClient.channels.assignDriver(channelId, driverId, version)

				if (doInstall) {
					const hubId = await chooseHub(this, 'Select a hub to install to.', flags.hub)
					await this.edgeClient.hubs.installDriver(driverId, hubId, channelId)
				}
			}
		}

		if (flags.upload) {
			try {
				const data = fs.readFileSync(flags.upload)
				await uploadAndPostProcess(data)
			} catch (error) {
				if ((error as { code?: string }).code === 'ENOENT') {
					this.log(`No file named "${flags.upload}" found.`)
				}
			}
		} else {
			const projectDirectory = this.getProjectDirectory()

			const zip = new JSZip()
			const parsedConfig = this.processConfigFile(projectDirectory, zip)

			this.processFingerprintsFile(projectDirectory, parsedConfig, zip)
			this.processSrcDir(projectDirectory, zip)

			this.processProfiles(projectDirectory, parsedConfig, zip)

			if (flags['build-only']) {
				zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true, compression: 'DEFLATE' })
					.pipe(fs.createWriteStream(flags['build-only']))
					.on('finish', () => {
						this.log(`wrote ${flags['build-only']}`)
					})
			} else {
				const zipContents = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
				await uploadAndPostProcess(zipContents)
			}
		}
	}
}
