import fs from 'fs'

import { Errors } from '@oclif/core'
import JSZip from 'jszip'
import picomatch from 'picomatch'

import { findYAMLFilename, isDir, isFile, readYAMLFile, requireDir, YAMLFileData } from '../../file-util'


// Utility methods specific to the `edge:drivers:package` command. Split out here to make
// unit testing easier.

export const resolveProjectDirName = (projectDirNameFromArgs: string): string => {
	let calculatedProjectDirName = projectDirNameFromArgs
	if (calculatedProjectDirName.endsWith('/')) {
		calculatedProjectDirName = calculatedProjectDirName.slice(0, -1)
	}
	if (!isDir(calculatedProjectDirName)) {
		throw new Errors.CLIError(`${calculatedProjectDirName} must exist and be a directory`)
	}
	return calculatedProjectDirName
}

export const processConfigFile = (projectDirectory: string, zip: JSZip): YAMLFileData => {
	const configFile = findYAMLFilename(`${projectDirectory}/config`)
	if (configFile === false) {
		throw new Errors.CLIError('missing main config.yaml (or config.yml) file')
	}

	const parsedConfig = readYAMLFile(configFile)

	zip.file('config.yml', fs.createReadStream(configFile))

	return parsedConfig
}

export const processFingerprintsFile = (projectDirectory: string, zip: JSZip): void => {
	const fingerprintsFile = findYAMLFilename(`${projectDirectory}/fingerprints`)
	if (fingerprintsFile !== false) {
		// validate file is at least parsable as a YAML file
		readYAMLFile(fingerprintsFile)
		zip.file('fingerprints.yml', fs.createReadStream(fingerprintsFile))
	}
}

export const buildTestFileMatchers = (matchersFromConfig?: string | string[]): picomatch.Matcher[] => {
	const retVal = []

	const config = matchersFromConfig
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

export const processSrcDir = (projectDirectory: string, zip: JSZip, testFileMatchers: picomatch.Matcher[]): void => {
	const srcDir = requireDir(`${projectDirectory}/src`)
	if (!isFile(`${srcDir}/init.lua`)) {
		throw new Errors.CLIError(`missing required ${srcDir}/init.lua file`)
	}

	// The max depth is 10 but the main project directory and the src directory itself count,
	// so we start at 2.
	const walkDir = (fromDir: string, nested = 2): void => {
		for (const filename of fs.readdirSync(fromDir)) {
			const fullFilename = `${fromDir}/${filename}`
			if (isDir(fullFilename)) {
				// maximum depth is defined by server
				if (nested < 10) {
					walkDir(fullFilename, nested + 1)
				} else {
					throw new Errors.CLIError(`drivers directory nested too deeply (at ${fullFilename}); max depth is 10`)
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

export const processProfiles = (projectDirectory: string, zip: JSZip): void => {
	const profilesDir = requireDir(`${projectDirectory}/profiles`)

	for (const filename of fs.readdirSync(profilesDir)) {
		const fullFilename = `${profilesDir}/${filename}`
		if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
			// read and parse to make sure profiles are at least valid yaml
			readYAMLFile(fullFilename)
			let archiveName = `profiles${fullFilename.substring(profilesDir.length)}`
			if (archiveName.endsWith('.yaml')) {
				archiveName = `${archiveName.slice(0, -4)}yml`
			}
			zip.file(archiveName, fs.createReadStream(fullFilename))
		} else {
			throw new Errors.CLIError(`invalid profile file "${fullFilename}" (must have .yaml or .yml extension)`)
		}
	}
}
