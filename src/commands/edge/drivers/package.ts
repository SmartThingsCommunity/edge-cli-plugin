import fs from 'fs'

import { flags } from '@oclif/command'
import JSZip from 'jszip'
import yaml from 'js-yaml'
import picomatch from 'picomatch'

import { outputItem } from '@smartthings/cli-lib'

import { EdgeDriver } from '../../../lib/endpoints/drivers'
import { EdgeCommand } from '../../../lib/edge-command'


interface YAMLFileData {
	[key: string]: string
}

function isFile(filename: string): boolean {
	return fs.existsSync(filename) && fs.lstatSync(filename).isFile()
}

function isDir(filename: string): boolean {
	return fs.existsSync(filename) && fs.lstatSync(filename).isDirectory()
}

function findYAMLFilename(baseName: string): string | false {
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

function requireDir(dirName: string): string {
	if (isDir(dirName)) {
		return dirName
	}
	throw new Error(`missing required directory ${dirName}`)
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
		'dry-run': flags.boolean({
			char: 'd',
			description: 'save package to edge.zip file instead of uploading it',
		}),
	}

	getProjectDirectory(): string {
		let projectDirectory = this.args.projectDirectory
		if (projectDirectory.endsWith('/')) {
			projectDirectory = projectDirectory.slice(0, -1)
		}
		if (!isDir(projectDirectory)) {
			throw new Error(`${projectDirectory} must exist and be a directory`)
		}
		return projectDirectory
	}

	processConfigFile(projectDirectory: string, zip: JSZip): YAMLFileData {
		const configFile = findYAMLFilename(`${projectDirectory}/config`)
		if (configFile === false) {
			throw Error('missing main config.yaml (or config.yml) file')
		}

		try {
			const parsedConfig = yaml.safeLoad(fs.readFileSync(configFile, 'utf-8'))

			if (parsedConfig == null) {
				throw new Error('empty config file')
			}
			if (typeof parsedConfig === 'string') {
				throw new Error('invalid config file')
			}

			zip.file('config.yml', fs.createReadStream(configFile))

			return parsedConfig as YAMLFileData
		} catch (error) {
			throw new Error(`unable to parse ${configFile}: ${error}`)
		}
	}

	processFingerprintsFile(projectDirectory: string, parsedConfig: YAMLFileData, zip: JSZip): void {
		const fingerprintsFile = findYAMLFilename(`${projectDirectory}/fingerprints`)
		if (fingerprintsFile !== false) {
			// validate file is at least parsable as a YAML file
			try {
				yaml.safeLoad(fs.readFileSync(fingerprintsFile, 'utf-8'))
			} catch (error) {
				throw new Error(`unable to parse ${fingerprintsFile}: ${error}`)
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
			throw new Error(`missing required ${srcDir}/init.lua file}`)
		}

		const walkDir = (fromDir: string, nested = 0): void => {
			for (const filename of fs.readdirSync(fromDir)) {
				const fullFilename = `${fromDir}/${filename}`
				if (isDir(fullFilename)) {
					// maximum depth is defined by server
					if (nested < 8) {
						walkDir(fullFilename, nested + 1)
					} else {
						throw new Error(`drivers directory nested too deeply (at ${fullFilename}); max depth is 10`)
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
				throw new Error(`invalid profile file ${fullFilename} (must have .yaml or .yml extension)`)
			}
		}
	}

	async run(): Promise<void> {
		const { args, argv, flags } = this.parse(PackageCommand)
		await super.setup(args, argv, flags)

		const config = {
			tableFieldDefinitions: ['driverId', 'name', 'packageKey', 'version'],
		}

		outputItem(this, config, async () => {
			const projectDirectory = this.getProjectDirectory()

			const zip = new JSZip()
			const parsedConfig = this.processConfigFile(projectDirectory, zip)

			this.processFingerprintsFile(projectDirectory, parsedConfig, zip)
			this.processSrcDir(projectDirectory, zip)

			this.processProfiles(projectDirectory, parsedConfig, zip)

			if (flags['dry-run']) {
				zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true, compression: 'DEFLATE' })
					.pipe(fs.createWriteStream('edge.zip'))
					.on('finish', () => {
						this.log('wrote edge.zip')
					})
				// This is a little hacky for now...we're making a fake driver
				// to return for dry run mode. We should probably support for
				// an alternate return type to be used in dry-run mode.
				return { driverId: 'dry-run-mode', name: 'n/a', packageKey: 'n/a', version: 'n/a' } as EdgeDriver
			} else {
				const zipContents = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
				const buffer = Buffer.from(zipContents)
				return await this.edgeClient.drivers.upload(buffer)
			}
		})
	}
}